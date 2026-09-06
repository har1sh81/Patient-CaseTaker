/**
 * Task #23 — Laboratory Extraction & Normalization Types
 * MediKiosk Clinical Engine
 */

import type { ProvenanceSource, VerificationStatus } from '../../document-storage-types';

/**
 * Single extracted and normalized laboratory observation record.
 */
export interface ExtractedLabResult {
  id: string;
  testName: string;
  canonicalTestName: string;
  rawTestName: string;
  testNameNative?: string;
  resultValue: string;        // Stored as string to support numeric ("8.9"), operators ("<5"), or qualitative ("positive")
  numericValue?: number;      // Parsed numeric value if present
  unit?: string;
  referenceRange?: string;    // Raw reference range string documented in source (e.g. "4.0 - 5.6 %")
  abnormalFlag?: boolean;     // Source-provided abnormal flag ONLY (true if explicitly H/High/L/Low/Abnormal)
  sourceAbnormalText?: string;// Source text for abnormal flag if documented ("High", "H", "Low", "L")
  specimenDate?: string;      // YYYY-MM-DD format if explicitly present
  reportDate?: string;
  patientId: string;
  encounterId: string;
  documentId: string;
  pageNumber?: number;
  sourceText: string;
  confidence: number;
  isUncertain: boolean;
  needsReview: boolean;
  uncertaintyReason?: string;
  provenanceSource: ProvenanceSource;
  verificationStatus: VerificationStatus;
  extractedAt: string;
}

/**
 * Input payload passed to LabExtractor.
 */
export interface LabExtractionInput {
  documentId: string;
  patientId: string;
  encounterId: string;
  rawOcrText: string;
  documentType?: string;
  candidates?: Array<{ sourceText?: string; pageNumber?: number; concept?: string; value?: string; unit?: string }>;
  provenanceSource?: ProvenanceSource;
}

/**
 * Overall result from lab extractor engine.
 */
export interface LabExtractionResult {
  documentId: string;
  labsDetected: number;
  labsCreated: number;
  needsReviewCount: number;
  uncertainCount: number;
  labs: ExtractedLabResult[];
  status: 'completed' | 'failed';
  extractedAt: string;
}

/**
 * Pluggable Lab Extractor Interface.
 */
export interface LabExtractor {
  extract(input: LabExtractionInput): Promise<LabExtractionResult>;
}

/**
 * API Service Response Payload.
 */
export interface LabProcessResult {
  success: boolean;
  documentId: string;
  data?: {
    documentId: string;
    labsDetected: number;
    labsCreated: number;
    needsReview: number;
    status: 'completed' | 'failed';
    labs?: ExtractedLabResult[];
  };
  errorCode?:
    | 'INVALID_INPUT'
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'CONSENT_DENIED'
    | 'OCR_MISSING'
    | 'DB_ERROR'
    | 'EXTRACTION_FAILED';
  error?: string;
}
