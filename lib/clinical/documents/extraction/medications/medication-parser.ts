/**
 * Task #22 — Specialized Medication Extractor Implementation
 * MediKiosk Clinical Engine
 * 
 * Parses raw OCR text and Task #21 candidates into normalized, structured ExtractedMedicationRecord items.
 * Enforces safety controls: Does NOT guess truncated drug names, invent doses, or prescribe.
 */

import crypto from 'crypto';
import {
  ExtractedMedicationRecord,
  MedicationExtractionInput,
  MedicationExtractionResult,
  MedicationExtractor,
  MedicationStatus,
} from './types';
import {
  normalizeFrequency,
  normalizeMedicationName,
  normalizeRoute,
  recognizeDosageForm,
} from './normalization';
import { ProvenanceSource } from '../../document-storage-types';

export class RuleBasedMedicationExtractor implements MedicationExtractor {
  async extract(input: MedicationExtractionInput): Promise<MedicationExtractionResult> {
    const rawText = input.rawOcrText || '';
    const documentId = input.documentId;
    const patientId = input.patientId;
    const encounterId = input.encounterId;
    const provenanceSource: ProvenanceSource = input.provenanceSource || 'historical_document';
    const now = new Date().toISOString();

    const medications: ExtractedMedicationRecord[] = [];

    // Parse multi-page text
    const pageBlocks: Array<{ pageNumber: number; text: string }> = [];
    const pageRegex = /--- Page (\d+) ---/gi;
    const parts = rawText.split(/--- Page \d+ ---/i);
    const matches = Array.from(rawText.matchAll(pageRegex));

    if (matches.length > 0 && parts.length > 1) {
      for (let i = 0; i < matches.length; i++) {
        const pageNum = parseInt(matches[i][1], 10);
        const pageText = parts[i + 1] || '';
        pageBlocks.push({ pageNumber: pageNum, text: pageText });
      }
    } else {
      pageBlocks.push({ pageNumber: 1, text: rawText });
    }

    for (const pageBlock of pageBlocks) {
      const pageNum = pageBlock.pageNumber;
      const lines = pageBlock.text.split('\n').map((l) => l.trim()).filter(Boolean);

      for (const line of lines) {
        const lower = line.toLowerCase();

        // 1. Detect Explicit Medication Status
        let status: MedicationStatus = 'active';
        if (lower.includes('discontinued') || lower.includes('stop ') || lower.includes('stopped')) {
          status = 'discontinued';
        } else if (lower.includes('completed') || lower.includes('finished')) {
          status = 'completed';
        } else if (lower.includes('previously taken') || lower.includes('past medication') || lower.includes('historical')) {
          status = 'historical';
        }

        // 2. Combination Medication Check (e.g., "Telmisartan 40 mg + Amlodipine 5 mg")
        let subLines = [line];
        if (line.includes('+') && !line.includes('1-0-1')) {
          subLines = line.split('+').map((s) => s.trim()).filter(Boolean);
        }

        for (const subLine of subLines) {
          const subLower = subLine.toLowerCase();

          // Check if subLine contains medication indicators
          const medTriggerKeywords = [
            'tab',
            'tablet',
            'cap',
            'capsule',
            'syr',
            'syrup',
            'inj',
            'injection',
            'metformin',
            'telmisartan',
            'paracetamol',
            'atorvastatin',
            'amlodipine',
            'metf',
            'amox',
            'பாராசிட்டமால்',
            'மருந்து',
            'மாத்திரை',
            'மி.கி',
            'दवा',
            'पैरासिटामोल',
            'मिग्रा',
            'mg',
            'mcg',
            'ml',
          ];

          if (!medTriggerKeywords.some((k) => subLower.includes(k))) {
            continue;
          }

          // Exclude pure non-medication lines (e.g. lab header lines with mg/dL)
          if (subLower.includes('laboratory') || subLower.includes('hba1c') || subLower.includes('mg/dl') || subLower.includes('reference range')) {
            continue;
          }

          // 3. Extract Raw Drug Name
          let rawName = '';
          // Retain trailing dots if present for truncated drug name detection
          const nameRegex = /(?:tab|tablet|cap|capsule|syr|syrup|inj|injection|rx|continue|discontinued)?\.?\s*([a-zA-Z\u0B80-\u0BFF\u0900-\u097F\.\-]{3,35}(?:\s+(?:sr|er|xl|ds))?)/i;
          const match = subLine.match(nameRegex);

          if (match && match[1]) {
            rawName = match[1].trim();
            // Clean leading prefix tokens
            rawName = rawName.replace(/^(?:tab|tablet|cap|capsule|syr|syrup|inj|rx|continue|discontinued)\.?\s*/i, '').trim();
          } else {
            rawName = subLine.split(/\s+/)[0];
          }

          if (!rawName || rawName.length < 3 || rawName.toLowerCase() === 'dosage' || rawName.toLowerCase() === 'frequency') {
            continue;
          }

          // 4. Normalize Drug Name & Check Uncertainty
          const nameNorm = normalizeMedicationName(rawName);

          // 5. Extract Strength / Dose (e.g. 1000 mg, 5 mg, 500 mg, 650 mg, 20 mg, 500 மி.கி, 500 मिग्रा)
          let dosage: string | undefined;
          let strength: string | undefined;
          const doseMatch = subLine.match(/(\d+(?:\.\d+)?\s*(?:mg|g|mcg|ml|iu|%|மி\.கி|மிग्रा))/i);
          if (doseMatch) {
            dosage = doseMatch[1];
            strength = doseMatch[1];
          }

          // 6. Recognize Dosage Form
          const dosageForm = recognizeDosageForm(subLine);

          // 7. Extract & Normalize Frequency
          let rawFreq: string | undefined;
          const freqMatch = subLine.match(/\b(1-0-1|1-0-0|0-0-1|0-1-0|1-1-1|bd|od|tds|tid|qid|hs|sos|ac|pc|stat|காலை \/ இரவு|உணவுக்கு பின்|दिन में दो बार)\b/i);
          if (freqMatch) {
            rawFreq = freqMatch[1];
          }
          const freqNorm = normalizeFrequency(rawFreq);

          // 8. Extract Route
          const route = normalizeRoute(subLine);

          // 9. Avoid Duplicate Extractions on Same Page/Subline
          const isDup = medications.some(
            (m) =>
              m.medicationName === nameNorm.normalizedName &&
              m.pageNumber === pageNum &&
              m.sourceText === subLine.substring(0, 150)
          );

          if (!isDup) {
            medications.push({
              id: crypto.randomUUID(),
              medicationName: nameNorm.normalizedName,
              rawMedicationName: rawName,
              dosage,
              strength,
              dosageForm,
              frequency: freqNorm?.normalized || rawFreq,
              originalFrequency: freqNorm?.original,
              normalizedFrequency: freqNorm?.normalized,
              route,
              status,
              patientId,
              encounterId,
              documentId,
              pageNumber: pageNum,
              sourceText: subLine.substring(0, 150),
              confidence: nameNorm.isUncertain ? 0.65 : 0.92,
              isUncertain: nameNorm.isUncertain,
              needsReview: nameNorm.needsReview,
              uncertaintyReason: nameNorm.uncertaintyReason,
              provenanceSource,
              verificationStatus: 'unverified',
              extractedAt: now,
            });
          }
        }
      }
    }

    const needsReviewCount = medications.filter((m) => m.needsReview).length;
    const uncertainCount = medications.filter((m) => m.isUncertain).length;

    return {
      documentId,
      medicationsDetected: medications.length,
      medicationsCreated: medications.length,
      needsReviewCount,
      uncertainCount,
      medications,
      status: 'completed',
      extractedAt: now,
    };
  }
}

export const defaultMedicationExtractor = new RuleBasedMedicationExtractor();
