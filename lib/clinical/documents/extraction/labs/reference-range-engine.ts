/**
 * Task #24 — Reference Range Interpretation Engine
 * MediKiosk Clinical Engine
 * 
 * Compares extracted laboratory observations against explicit source reference ranges.
 * Strictly adheres to safety rules:
 * - NO diagnosis creation
 * - NO treatment recommendations
 * - NO population range invention
 * - Explicit boundary evaluation
 */

import { ExtractedLabResult } from './types';
import {
  LabInterpretationClassification,
  LabObservationInterpretation,
  ParsedReferenceRange,
} from './interpretation-types';
import { parseReferenceRange } from './reference-range-parser';

/**
 * Interprets a single extracted laboratory observation against its source reference range.
 */
export function interpretLabObservation(lab: ExtractedLabResult): LabObservationInterpretation {
  const parsedRange: ParsedReferenceRange = parseReferenceRange(lab.referenceRange);

  let classification: LabInterpretationClassification = 'unable_to_interpret';
  let reason = 'No valid reference range documented in source report.';
  let confidence = 0.85;

  const isExplicitCritical =
    lab.sourceAbnormalText?.toLowerCase() === 'critical' ||
    /\bcritical\b/i.test(lab.sourceText || '');

  // Rule 1: Explicit source critical flag
  if (isExplicitCritical) {
    classification = 'critical';
    reason = 'Observation explicitly flagged as Critical by source laboratory report.';
    confidence = 0.98;
  }
  // Rule 2: Numeric value with parsed range
  else if (lab.numericValue !== undefined && !isNaN(lab.numericValue) && parsedRange.parseStatus === 'parsed') {
    const val = lab.numericValue;

    if (parsedRange.operator === 'range' && parsedRange.lower !== undefined && parsedRange.upper !== undefined) {
      const lower = parsedRange.lower;
      const upper = parsedRange.upper;

      if (val < lower) {
        classification = 'low';
        reason = `Numeric result ${val} is below lower reference limit of ${lower} ${lab.unit || ''}`.trim();
      } else if (val > upper) {
        classification = 'high';
        reason = `Numeric result ${val} is above upper reference limit of ${upper} ${lab.unit || ''}`.trim();
      } else {
        classification = 'normal';
        reason = `Numeric result ${val} falls within documented reference range ${parsedRange.rawText}`;
      }
      confidence = 0.95;
    } else if ((parsedRange.operator === '>' || parsedRange.operator === '>=') && parsedRange.lower !== undefined) {
      const lower = parsedRange.lower;
      const satisfies = parsedRange.operator === '>=' ? val >= lower : val > lower;

      if (satisfies) {
        classification = 'normal';
        reason = `Numeric result ${val} satisfies reference requirement ${parsedRange.rawText}`;
      } else {
        classification = 'low';
        reason = `Numeric result ${val} is below reference requirement ${parsedRange.rawText}`;
      }
      confidence = 0.92;
    } else if ((parsedRange.operator === '<' || parsedRange.operator === '<=') && parsedRange.upper !== undefined) {
      const upper = parsedRange.upper;
      const satisfies = parsedRange.operator === '<=' ? val <= upper : val < upper;

      if (satisfies) {
        classification = 'normal';
        reason = `Numeric result ${val} satisfies reference requirement ${parsedRange.rawText}`;
      } else {
        classification = 'high';
        reason = `Numeric result ${val} exceeds reference limit ${parsedRange.rawText}`;
      }
      confidence = 0.92;
    }
  }
  // Rule 3: Qualitative results (positive, negative, trace)
  else if (lab.numericValue === undefined && lab.resultValue) {
    const cleanVal = lab.resultValue.toLowerCase().trim();

    if (lab.abnormalFlag && lab.sourceAbnormalText) {
      classification = 'abnormal_unspecified';
      reason = `Qualitative result '${lab.resultValue}' flagged as abnormal by source ('${lab.sourceAbnormalText}')`;
      confidence = 0.90;
    } else if (cleanVal === 'negative' || cleanVal === 'non-reactive') {
      classification = 'unable_to_interpret';
      reason = `Qualitative result '${lab.resultValue}' requires source reference context to classify`;
      confidence = 0.70;
    } else {
      classification = 'unable_to_interpret';
      reason = `Qualitative result '${lab.resultValue}' cannot be numerically calculated without explicit source rules`;
      confidence = 0.70;
    }
  }

  // Preserve source flag distinction
  const sourceAbnormalFlag = lab.abnormalFlag || false;

  return {
    labResultId: lab.id,
    testName: lab.testName,
    canonicalTestName: lab.canonicalTestName,
    resultValue: lab.resultValue,
    numericValue: lab.numericValue,
    unit: lab.unit,
    classification,
    referenceLower: parsedRange.lower,
    referenceUpper: parsedRange.upper,
    referenceRangeRaw: lab.referenceRange,
    sourceAbnormalFlag,
    sourceAbnormalText: lab.sourceAbnormalText,
    interpretationReason: reason,
    confidence,
    needsReview: lab.needsReview || classification === 'unable_to_interpret',
    patientId: lab.patientId,
    encounterId: lab.encounterId,
    documentId: lab.documentId,
    pageNumber: lab.pageNumber,
    sourceText: lab.sourceText,
    provenanceSource: lab.provenanceSource,
    verificationStatus: 'unverified',
    interpretedAt: new Date().toISOString(),
  };
}
