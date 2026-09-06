/**
 * Task #23 — Laboratory Extraction & Parsing Engine
 * MediKiosk Clinical Engine
 */

import { ExtractedLabResult, LabExtractionInput, LabExtractionResult, LabExtractor } from './types';
import { normalizeTestName } from './normalization';
import { ProvenanceSource, VerificationStatus } from '../../document-storage-types';

/**
 * Default Implementation of LabExtractor.
 */
export class DefaultLabExtractor implements LabExtractor {
  public async extract(input: LabExtractionInput): Promise<LabExtractionResult> {
    const { documentId, patientId, encounterId, rawOcrText, candidates, provenanceSource } = input;
    const extractedLabs: ExtractedLabResult[] = [];
    const sourceTextSeen = new Set<string>();

    const provSource: ProvenanceSource = provenanceSource || 'historical_document';
    const verifStatus: VerificationStatus = 'unverified';
    const nowIso = new Date().toISOString();

    // 1. Process Task #21 lab candidates first if available
    if (candidates && candidates.length > 0) {
      for (const candidate of candidates) {
        if (!candidate.sourceText) continue;
        const parsed = this.parseSingleLabLine(
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
          const key = `${parsed.canonicalTestName}_${parsed.resultValue}_${parsed.specimenDate || ''}`;
          if (!sourceTextSeen.has(key)) {
            sourceTextSeen.add(key);
            extractedLabs.push(parsed);
          }
        }
      }
    }

    // 2. Line-by-line OCR text parsing with Panel Awareness
    const lines = rawOcrText.split('\n');
    let currentPage = 1;
    let currentSpecimenDate: string | undefined;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      // Track page transitions if marked in OCR
      const pageMatch = line.match(/--- Page (\d+) ---/i);
      if (pageMatch) {
        currentPage = parseInt(pageMatch[1], 10);
        continue;
      }

      // Check for document specimen/report date line
      const dateMatch = line.match(/(?:specimen|collection|report|date)[:\s]+(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/i);
      if (dateMatch) {
        currentSpecimenDate = this.normalizeDateString(dateMatch[1]);
      }

      // Attempt to parse lab result from line
      const parsed = this.parseSingleLabLine(
        line,
        documentId,
        patientId,
        encounterId,
        currentPage,
        provSource,
        verifStatus,
        nowIso,
        currentSpecimenDate
      );

      if (parsed) {
        const key = `${parsed.canonicalTestName}_${parsed.resultValue}_${parsed.specimenDate || ''}`;
        if (!sourceTextSeen.has(key)) {
          sourceTextSeen.add(key);
          extractedLabs.push(parsed);
        }
      }
    }

    const needsReviewCount = extractedLabs.filter((l) => l.needsReview).length;
    const uncertainCount = extractedLabs.filter((l) => l.isUncertain).length;

    return {
      documentId,
      labsDetected: extractedLabs.length,
      labsCreated: extractedLabs.length,
      needsReviewCount,
      uncertainCount,
      labs: extractedLabs,
      status: 'completed',
      extractedAt: nowIso,
    };
  }

  /**
   * Parses a single OCR text line or candidate string into a structured lab observation.
   */
  private parseSingleLabLine(
    line: string,
    documentId: string,
    patientId: string,
    encounterId: string,
    pageNumber: number,
    provenanceSource: ProvenanceSource,
    verificationStatus: VerificationStatus,
    extractedAt: string,
    inheritedSpecimenDate?: string
  ): ExtractedLabResult | null {
    // Ignore non-lab text header lines, date headers, or patient metadata headers
    if (
      /^patient|^doctor|^clinic|^hospital|^address|^phone|^sl\.?\s*no/i.test(line) ||
      /^(?:specimen|collection|report)\s*(?:collection)?\s*date/i.test(line) ||
      /^test name\s*result\s*unit/i.test(line)
    ) {
      return null;
    }

    // Pattern A: Standard Lab Result line
    // e.g., "HbA1c 8.9 % (4.0 - 5.6 %)" or "Fasting Glucose: 168 mg/dL [High]" or "Creatinine 1.25 mg/dL H"
    const labRegex = /^([A-Za-z0-9\s/().,\-\u0B80-\u0BFF\u0900-\u097F]+?)[:\t\s]+([<>]?\s*\d+(?:\.\d+)?|\bpositive\b|\bnegative\b|\btrace\b|\d+\.\?\s*)(?:\s*([a-zA-Z%µ/LgmlIUunits]+))?(?:\s*(?:\(|\[|ref:?\s*)([0-9.\s\-–<>%a-zA-Z/]+)(?:\)|\]))?(?:\s*\b(High|Low|H|L|Abnormal|Critical)\b)?/i;

    // Pattern B: Simplified key-value or delimiter line (e.g. "HbA1c = 8.9%")
    const altRegex = /([A-Za-z0-9\s/().\-\u0B80-\u0BFF\u0900-\u097F]+)\s*[:=]\s*([<>]?\s*\d+(?:\.\d+)?|\bpositive\b|\bnegative\b|\btrace\b)(?:\s*([a-zA-Z%µ/LgmlIUunits]+))?/i;

    let match = line.match(labRegex);
    if (!match) {
      match = line.match(altRegex);
    }

    if (!match) return null;

    const rawTestName = match[1].trim();
    let rawResultValue = match[2].trim();
    let unit = match[3] ? match[3].trim() : undefined;
    const refRange = match[4] ? match[4].trim() : undefined;
    const rawAbnormalTag = match[5] ? match[5].trim() : undefined;

    // Filter out false positives (e.g. single digit isolated words)
    if (rawTestName.length < 2 || !/[A-Za-z\u0B80-\u0BFF\u0900-\u097F]/.test(rawTestName)) {
      return null;
    }

    // 1. Normalize test name conservatively
    const norm = normalizeTestName(rawTestName);

    // 2. Determine numeric vs qualitative value
    let numericVal: number | undefined;
    let isUncertain = norm.isUncertain;
    let needsReview = norm.needsReview;
    let uncertaintyReason = norm.uncertaintyReason;

    // Check for handwritten ambiguity (e.g. "1.2?")
    if (rawResultValue.includes('?') || line.includes('?')) {
      isUncertain = true;
      needsReview = true;
      uncertaintyReason = `Result value contains ambiguous character ('${rawResultValue}')`;
    } else if (/^\d+(\.\d+)?$/.test(rawResultValue)) {
      numericVal = parseFloat(rawResultValue);
    }

    // Check for extreme OCR anomaly (e.g., "HbA1c 89%" without decimal point)
    if (norm.canonicalTestName === 'HbA1c' && numericVal && numericVal > 25) {
      isUncertain = true;
      needsReview = true;
      uncertaintyReason = `Suspected OCR decimal error for HbA1c: ${numericVal}%`;
    }

    // 3. Source-provided abnormal flag ONLY
    let abnormalFlag = false;
    if (rawAbnormalTag) {
      abnormalFlag = true;
    } else {
      // Also check inline source line for explicit [High] or [H] or [Low] or [L]
      if (/\b(High|Low|Abnormal|Critical)\b/i.test(line) || /\s[HL]\s*$/i.test(line)) {
        abnormalFlag = true;
      }
    }

    // Extract embedded specimen date if in the line
    let specimenDate = inheritedSpecimenDate;
    const inlineDateMatch = line.match(/(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{2,4})/);
    if (inlineDateMatch) {
      specimenDate = this.normalizeDateString(inlineDateMatch[1]);
    }

    const id = `lab_${documentId.slice(0, 8)}_${norm.canonicalTestName.toLowerCase().replace(/[^a-z0-9]/g, '')}_${pageNumber}_${Math.random().toString(36).slice(2, 7)}`;

    return {
      id,
      testName: norm.canonicalTestName,
      canonicalTestName: norm.canonicalTestName,
      rawTestName,
      testNameNative: norm.testNameNative,
      resultValue: rawResultValue,
      numericValue: numericVal,
      unit,
      referenceRange: refRange,
      abnormalFlag,
      sourceAbnormalText: rawAbnormalTag,
      specimenDate,
      patientId,
      encounterId,
      documentId,
      pageNumber,
      sourceText: line.length > 120 ? line.slice(0, 120) + '...' : line,
      confidence: norm.confidence,
      isUncertain,
      needsReview,
      uncertaintyReason,
      provenanceSource,
      verificationStatus,
      extractedAt,
    };
  }

  /**
   * Helper to normalize date strings to ISO YYYY-MM-DD.
   */
  private normalizeDateString(dateStr: string): string | undefined {
    try {
      const parts = dateStr.split(/[-/]/);
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          // YYYY-MM-DD
          const y = parts[0];
          const m = parts[1].padStart(2, '0');
          const d = parts[2].padStart(2, '0');
          return `${y}-${m}-${d}`;
        } else if (parts[2].length === 4) {
          // DD-MM-YYYY
          const d = parts[0].padStart(2, '0');
          const m = parts[1].padStart(2, '0');
          const y = parts[2];
          return `${y}-${m}-${d}`;
        }
      }
      return dateStr;
    } catch {
      return undefined;
    }
  }
}
