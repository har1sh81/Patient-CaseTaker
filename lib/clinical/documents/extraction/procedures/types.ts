/**
 * Task #25 — Procedure & Surgery Extraction Types
 * MediKiosk Clinical Engine
 */

import type { ProvenanceSource, VerificationStatus } from '../../document-storage-types';

export type ProcedureStatus =
  | 'planned'
  | 'scheduled'
  | 'performed'
  | 'completed'
  | 'cancelled'
  | 'declined'
  | 'historical'
  | 'unknown';

export type ProcedureCategory =
  | 'surgery'
  | 'diagnostic'
  | 'therapeutic'
  | 'intervention'
  | 'rehabilitation'
  | 'other';

/**
 * Extracted and normalized procedure/surgery record.
 */
export interface ExtractedProcedure {
  id: string;
  procedureName: string;
  rawProcedureName: string;
  normalizedProcedureName?: string;
  procedureNameNative?: string;
  category: ProcedureCategory;
  status: ProcedureStatus;
  procedureDate?: string;
  dateText?: string;
  indicationText?: string;
  bodySite?: string;
  laterality?: string;
  providerText?: string;
  facilityText?: string;
  outcomeText?: string;
  isUncertain: boolean;
  needsReview: boolean;
  uncertaintyReason?: string;
  patientId: string;
  encounterId: string;
  documentId: string;
  pageNumber?: number;
  sourceText: string;
  provenanceSource: ProvenanceSource;
  verificationStatus: VerificationStatus;
  extractedAt: string;
}

/**
 * Input payload passed to ProcedureExtractor.
 */
export interface ProcedureExtractionInput {
  documentId: string;
  patientId: string;
  encounterId: string;
  rawOcrText: string;
  documentType?: string;
  candidates?: Array<{ sourceText?: string; pageNumber?: number; concept?: string; value?: string }>;
  provenanceSource?: ProvenanceSource;
}

/**
 * Overall result from procedure extractor engine.
 */
export interface ProcedureExtractionResult {
  documentId: string;
  proceduresDetected: number;
  proceduresCreated: number;
  needsReviewCount: number;
  uncertainCount: number;
  procedures: ExtractedProcedure[];
  status: 'completed' | 'failed';
  extractedAt: string;
}

/**
 * Pluggable Procedure Extractor Interface.
 */
export interface ProcedureExtractor {
  extract(input: ProcedureExtractionInput): Promise<ProcedureExtractionResult>;
}

/**
 * API Service Response Payload.
 */
export interface ProcedureProcessResult {
  success: boolean;
  documentId: string;
  data?: {
    documentId: string;
    proceduresDetected: number;
    proceduresCreated: number;
    needsReview: number;
    status: 'completed' | 'failed';
    procedures?: ExtractedProcedure[];
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
