/**
 * Task #25 — Procedure & Surgery Parsing Engine
 * MediKiosk Clinical Engine
 */

import { ExtractedProcedure, ProcedureExtractionInput, ProcedureExtractionResult, ProcedureExtractor, ProcedureStatus } from './types';
import { normalizeProcedureName } from './normalization';
import { ProvenanceSource, VerificationStatus } from '../../document-storage-types';

export class DefaultProcedureExtractor implements ProcedureExtractor {
  public async extract(input: ProcedureExtractionInput): Promise<ProcedureExtractionResult> {
    const { documentId, patientId, encounterId, rawOcrText, candidates, provenanceSource } = input;
    const extractedProcedures: ExtractedProcedure[] = [];
    const seenKeys = new Set<string>();

    const provSource: ProvenanceSource = provenanceSource || 'historical_document';
    const verifStatus: VerificationStatus = 'unverified';
    const nowIso = new Date().toISOString();

    // 1. Process Task #21 procedure_candidate facts first if provided
    if (candidates && candidates.length > 0) {
      for (const candidate of candidates) {
        if (!candidate.sourceText) continue;
        const parsed = this.parseSingleLine(
          candidate.sourceText,
          documentId,
          patientId,
          encounterId,
          candidate.pageNumber || 1,
          provSource,
          verifStatus,
          nowIso
        );
        if (parsed) {
          const key = `${parsed.procedureName.toLowerCase()}_${parsed.status}_${parsed.procedureDate || ''}_${parsed.laterality || ''}`;
          if (!seenKeys.has(key)) {
            seenKeys.add(key);
            extractedProcedures.push(parsed);
          }
        }
      }
    }

    // 2. Process Line-by-Line OCR text
    const lines = rawOcrText.split('\n');
    let currentPage = 1;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const pageMatch = line.match(/--- Page (\d+) ---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      const parsed = this.parseSingleLine(
        line,
        documentId,
        patientId,
        encounterId,
        currentPage,
        provSource,
        verifStatus,
        nowIso
      );

      if (parsed) {
        const key = `${parsed.procedureName.toLowerCase()}_${parsed.status}_${parsed.procedureDate || ''}_${parsed.laterality || ''}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          extractedProcedures.push(parsed);
        }
      }
    }

    const needsReviewCount = extractedProcedures.filter((p) => p.needsReview).length;
    const uncertainCount = extractedProcedures.filter((p) => p.isUncertain).length;

    return {
      documentId,
      proceduresDetected: extractedProcedures.length,
      proceduresCreated: extractedProcedures.length,
      needsReviewCount,
      uncertainCount,
      procedures: extractedProcedures,
      status: 'completed',
      extractedAt: nowIso,
    };
  }

  /**
   * Parses a single text line or candidate string into a structured procedure observation.
   */
  private parseSingleLine(
    line: string,
    documentId: string,
    patientId: string,
    encounterId: string,
    pageNumber: number,
    provenanceSource: ProvenanceSource,
    verificationStatus: VerificationStatus,
    extractedAt: string
  ): ExtractedProcedure | null {
    // Ignore non-procedural document header lines
    if (/^patient\s*(?:name|id|dob|age|sex|gender)[:\s]|^doctor\s*name|^clinic|^hospital|^address|^phone|^sl\.?\s*no/i.test(line)) {
      return null;
    }

    // Procedure trigger phrase matcher
    const triggerRegex = /(?:procedure\s*(?:performed|planned|completed|cancelled)?|underwent|status\s*post|history\s*of|past\s*surgical\s*history|surgery|operation|intervention|scheduled\s*for|patient\s*declined|declined|operated\s*on|post-operative|postoperative)[:\s]*/i;

    // Check if line contains explicit procedure keywords or matches trigger
    const hasTrigger = triggerRegex.test(line);
    const hasProcedureKeyword = /(?:appendectomy|appendicectomy|append|laparo|cataract|cesarean|c-section|lscs|cabg|angioplasty|pci|endoscopy|colonoscopy|biopsy|physiotherapy|dialysis|arthroscopy|panchakarma|abhyanga|shirodhara|swedana|basti|அறுவை|சர்ஜரி|बायोप्सी|सर्जरी)/i.test(line);

    if (!hasTrigger && !hasProcedureKeyword) {
      return null;
    }

    // Determine status explicitly
    let status: ProcedureStatus = 'performed';
    let isUncertain = false;
    let needsReview = false;
    let uncertaintyReason: string | undefined;

    if (/\b(?:declined|refused)\b/i.test(line)) {
      status = 'declined';
    } else if (/\b(?:cancelled|canceled|deferred)\b/i.test(line)) {
      status = 'cancelled';
    } else if (/\b(?:planned|considering|consider)\b/i.test(line)) {
      status = 'planned';
    } else if (/\b(?:scheduled|booked)\b/i.test(line)) {
      status = 'scheduled';
    } else if (/\bcompleted\b/i.test(line)) {
      status = 'completed';
    } else if (/\b(?:history of|past surgical history|prior|in 20\d{2}|in 19\d{2})\b/i.test(line)) {
      status = 'historical';
    } else if (/\b(?:underwent|performed|operated)\b/i.test(line)) {
      status = 'performed';
    }

    // Uncertainty check (e.g. "Possible prior appendectomy" or "Laparo... append...")
    if (/\b(?:possible|probable|suspected|unconfirmed|maybe)\b/i.test(line) || line.includes('?') || line.includes('...')) {
      isUncertain = true;
      needsReview = true;
      uncertaintyReason = `Procedural statement contains hedging or ambiguity ('${line}')`;
      if (status === 'completed' || status === 'performed') {
        status = 'historical';
      }
    }

    // Extract procedure date where present
    let procedureDate: string | undefined;
    let dateText: string | undefined;

    const fullDateMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4}|\b\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+\d{4}\b)/i);
    if (fullDateMatch) {
      dateText = fullDateMatch[1];
      procedureDate = this.normalizeDate(fullDateMatch[1]);
    } else {
      const yearMatch = line.match(/\b(19\d{2}|20\d{2})\b/);
      if (yearMatch) {
        dateText = yearMatch[1];
        procedureDate = yearMatch[1]; // Preserved as year-only string without inventing timestamps
      }
    }

    // Extract body site & laterality
    let bodySite: string | undefined;
    let laterality: string | undefined;

    if (/\bleft\b/i.test(line)) laterality = 'left';
    else if (/\bright\b/i.test(line)) laterality = 'right';
    else if (/\bbilateral\b/i.test(line)) laterality = 'bilateral';

    if (/\bknee\b/i.test(line)) bodySite = 'knee';
    else if (/\beye\b/i.test(line)) bodySite = 'eye';
    else if (/\bappendix\b/i.test(line)) bodySite = 'appendix';
    else if (/\bheart\b/i.test(line) || /\bcoronary\b/i.test(line)) bodySite = 'heart';
    else if (/\bcolon\b/i.test(line)) bodySite = 'colon';

    // Extract indication text
    let indicationText: string | undefined;
    const indMatch = line.match(/(?:for|due to|indication:?)\s+([A-Za-z0-9\s]+?)(?:\.|$|,)/i);
    if (indMatch && indMatch[1].length > 2) {
      indicationText = indMatch[1].trim();
    }

    // Extract outcome text
    let outcomeText: string | undefined;
    if (/without complications/i.test(line)) {
      outcomeText = 'without complications';
    } else {
      const outcomeMatch = line.match(/(?:outcome|complications?:?)\s+([A-Za-z0-9\s]+?)(?:\.|$|,)/i);
      if (outcomeMatch && outcomeMatch[1].trim().length > 0) {
        outcomeText = outcomeMatch[1].trim();
      }
    }

    // Normalize procedure name
    const norm = normalizeProcedureName(line);

    if (norm.isUncertain) {
      isUncertain = true;
      needsReview = true;
      if (!uncertaintyReason) uncertaintyReason = norm.uncertaintyReason;
    }

    const docIdPrefix = documentId ? documentId.slice(0, 8) : 'doc';
    const id = `proc_${docIdPrefix}_${norm.procedureName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pageNumber}_${Math.random().toString(36).slice(2, 7)}`;

    return {
      id,
      procedureName: norm.procedureName,
      rawProcedureName: line,
      normalizedProcedureName: norm.normalizedProcedureName,
      procedureNameNative: norm.procedureNameNative,
      category: norm.category,
      status,
      procedureDate,
      dateText,
      indicationText,
      bodySite,
      laterality,
      outcomeText,
      isUncertain,
      needsReview,
      uncertaintyReason,
      patientId,
      encounterId,
      documentId,
      pageNumber,
      sourceText: line.length > 120 ? line.slice(0, 120) + '...' : line,
      provenanceSource,
      verificationStatus,
      extractedAt,
    };
  }

  private normalizeDate(dateStr: string): string {
    const parts = dateStr.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[2].length === 4) {
        // DD/MM/YYYY format
        const day = parts[0].padStart(2, '0');
        const month = parts[1].padStart(2, '0');
        const year = parts[2];
        return `${year}-${month}-${day}`;
      } else if (parts[0].length === 4) {
        // YYYY-MM-DD format
        const year = parts[0];
        const month = parts[1].padStart(2, '0');
        const day = parts[2].padStart(2, '0');
        return `${year}-${month}-${day}`;
      }
    }
    try {
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) {
        return d.toISOString().split('T')[0];
      }
    } catch {}
    return dateStr;
  }
}
