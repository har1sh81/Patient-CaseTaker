/**
 * Task #24 — Reference Range Reasoning & Interpretation Types
 * MediKiosk Clinical Engine
 */

import type { ProvenanceSource, VerificationStatus } from '../../document-storage-types';

/**
 * Allowed laboratory observation classification types.
 * Strictly NO diagnosis or clinical disease labels allowed.
 */
export type LabInterpretationClassification =
  | 'normal'
  | 'low'
  | 'high'
  | 'critical'
  | 'abnormal_unspecified'
  | 'unable_to_interpret';

/**
 * Parsed structure for reference range text documented in source report.
 */
export interface ParsedReferenceRange {
  rawText: string;
  parseStatus: 'parsed' | 'unparsed';
  lower?: number;
  upper?: number;
  lowerInclusive?: boolean;
  upperInclusive?: boolean;
  operator?: '>' | '<' | '>=' | '<=' | 'range';
  unit?: string;
}

/**
 * Detailed reference-range interpretation output for a single lab observation.
 */
export interface LabObservationInterpretation {
  labResultId: string;
  testName: string;
  canonicalTestName: string;
  resultValue: string;
  numericValue?: number;
  unit?: string;
  classification: LabInterpretationClassification;
  referenceLower?: number;
  referenceUpper?: number;
  referenceRangeRaw?: string;
  sourceAbnormalFlag: boolean;
  sourceAbnormalText?: string;
  interpretationReason: string;
  confidence: number;
  needsReview: boolean;
  patientId: string;
  encounterId: string;
  documentId: string;
  pageNumber?: number;
  sourceText: string;
  provenanceSource: ProvenanceSource;
  verificationStatus: VerificationStatus;
  interpretedAt: string;
}

/**
 * Input payload passed to LabInterpreter engine.
 */
export interface LabInterpretationInput {
  documentId: string;
  patientId: string;
  encounterId: string;
  documentType?: string;
  provenanceSource?: ProvenanceSource;
  forceReinterpret?: boolean;
}

/**
 * Result output from LabInterpreter engine.
 */
export interface LabInterpretationResult {
  documentId: string;
  labsInterpreted: number;
  summary: {
    normal: number;
    low: number;
    high: number;
    critical: number;
    abnormal_unspecified: number;
    unable_to_interpret: number;
  };
  interpretations: LabObservationInterpretation[];
  status: 'completed' | 'failed';
  interpretedAt: string;
}

/**
 * API Service Response Payload for Interpretation Endpoint.
 */
export interface InterpretationProcessResult {
  success: boolean;
  documentId: string;
  data?: {
    documentId: string;
    labsInterpreted: number;
    summary: {
      normal: number;
      low: number;
      high: number;
      critical: number;
      abnormal_unspecified: number;
      unable_to_interpret: number;
    };
    status: 'completed' | 'failed';
    interpretations?: LabObservationInterpretation[];
  };
  errorCode?:
    | 'INVALID_INPUT'
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'CONSENT_DENIED'
    | 'LABS_MISSING'
    | 'DB_ERROR'
    | 'INTERPRETATION_FAILED';
  error?: string;
}
