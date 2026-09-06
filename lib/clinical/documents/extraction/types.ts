/**
 * Task #21 — Medical Information Extraction Types
 * MediKiosk Clinical Engine
 */

import { ProvenanceSource, VerificationStatus } from '../document-storage-types';

export type { ProvenanceSource, VerificationStatus };

export type MedicalEntityType =
  | 'symptom'
  | 'diagnosis_history'
  | 'medication_candidate'
  | 'vital'
  | 'lab_candidate'
  | 'allergy'
  | 'procedure_candidate'
  | 'family_history'
  | 'social_lifestyle'
  | 'ayush_assessment'
  | 'other';

/**
 * Structured Medical Fact with full document provenance.
 */
export interface ExtractedMedicalFact {
  id: string;
  entityType: MedicalEntityType;
  concept: string;
  value?: string;
  qualifier?: string;
  patientId: string;
  encounterId: string;
  documentId: string;
  pageNumber?: number;
  sourceText?: string;
  confidence?: number;
  provenanceSource: ProvenanceSource;
  verificationStatus: VerificationStatus;
  extractedAt: string;
}

/**
 * Input to MedicalInformationExtractor engine.
 */
export interface MedicalExtractionInput {
  documentId: string;
  patientId: string;
  encounterId: string;
  rawOcrText: string;
  documentType?: string; // from Task #20 classification
  pages?: Array<{ pageNumber: number; text: string }>;
  provenanceSource?: ProvenanceSource;
}

/**
 * Result output from MedicalInformationExtractor engine.
 */
export interface MedicalExtractionResult {
  documentId: string;
  factsDetected: number;
  symptomsCount: number;
  diagnosesCount: number;
  medicationCandidatesCount: number;
  labCandidatesCount: number;
  allergyCount: number;
  procedureCandidatesCount: number;
  vitalsCount: number;
  ayushCount: number;
  familyHistoryCount: number;
  socialLifestyleCount: number;
  facts: ExtractedMedicalFact[];
  status: 'completed' | 'failed';
  extractedAt: string;
}

/**
 * Pluggable Extractor Interface.
 */
export interface MedicalInformationExtractor {
  extract(input: MedicalExtractionInput): Promise<MedicalExtractionResult>;
}

/**
 * Service response payload.
 */
export interface ExtractionProcessResult {
  success: boolean;
  documentId: string;
  data?: {
    documentId: string;
    factsDetected: number;
    symptoms: number;
    diagnoses: number;
    medicationCandidates: number;
    labCandidates: number;
    vitals: number;
    ayush: number;
    allergies: number;
    status: 'completed' | 'failed';
    facts?: ExtractedMedicalFact[];
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
