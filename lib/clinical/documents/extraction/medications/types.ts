/**
 * Task #22 — Medication Extraction & Normalization Types
 * MediKiosk Clinical Engine
 */

import { ProvenanceSource, VerificationStatus } from '../../document-storage-types';

export type MedicationStatus = 'active' | 'discontinued' | 'completed' | 'historical';

/**
 * Normalized Medication Record with complete provenance.
 */
export interface ExtractedMedicationRecord {
  id: string;
  medicationName: string;
  medicationNameNative?: string;
  rawMedicationName: string;
  dosage?: string;
  strength?: string;
  dosageForm?: string;
  frequency?: string;
  originalFrequency?: string;
  normalizedFrequency?: string;
  route?: string;
  status: MedicationStatus;
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
 * Input passed to MedicationExtractor.
 */
export interface MedicationExtractionInput {
  documentId: string;
  patientId: string;
  encounterId: string;
  rawOcrText: string;
  documentType?: string;
  candidates?: Array<{ sourceText?: string; pageNumber?: number; concept?: string; value?: string }>;
  provenanceSource?: ProvenanceSource;
}

/**
 * Result output from MedicationExtractor.
 */
export interface MedicationExtractionResult {
  documentId: string;
  medicationsDetected: number;
  medicationsCreated: number;
  needsReviewCount: number;
  uncertainCount: number;
  medications: ExtractedMedicationRecord[];
  status: 'completed' | 'failed';
  extractedAt: string;
}

/**
 * Pluggable Medication Extractor Interface.
 */
export interface MedicationExtractor {
  extract(input: MedicationExtractionInput): Promise<MedicationExtractionResult>;
}

/**
 * Service response payload.
 */
export interface MedicationProcessResult {
  success: boolean;
  documentId: string;
  data?: {
    documentId: string;
    medicationsDetected: number;
    medicationsCreated: number;
    needsReview: number;
    status: 'completed' | 'failed';
    medications?: ExtractedMedicationRecord[];
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
