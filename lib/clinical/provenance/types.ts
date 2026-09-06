/**
 * Task #31 — Source & Provenance System Types
 * MediKiosk Clinical Architecture
 */

export const PROVENANCE_SOURCE_TYPES = [
  'patient_reported',
  'clinician_entered',
  'scanned_document',
  'OCR',
  'handwritten_document',
  'voice_transcript',
  'laboratory_report',
  'prescription',
  'consultation_note',
  'discharge_summary',
  'imaging_report',
  'AYUSH_record',
  'imported_record',
  'system_generated',
  'ai_generated',
] as const;

export type ProvenanceSourceType = typeof PROVENANCE_SOURCE_TYPES[number] | string;

export const EXTRACTION_STAGES = [
  'raw_document',
  'OCR',
  'handwriting_OCR',
  'multilingual_OCR',
  'structured_extraction',
  'interpretation',
  'synthesis',
  'AI_summary',
] as const;

export type ExtractionStage = typeof EXTRACTION_STAGES[number] | string;

export const VERIFICATION_STATUSES = [
  'unverified',
  'verified',
  'doctor_verified',
  'patient_reported',
  'rejected',
] as const;

export type VerificationStatus = typeof VERIFICATION_STATUSES[number] | string;

export const PROVENANCE_RELATIONSHIPS = [
  'derived_from',
  'extracted_from',
  'interpreted_from',
  'aggregated_from',
  'retrieved_from',
  'synthesized_from',
  'generated_from',
  'verified_by',
] as const;

export type ProvenanceRelationship = typeof PROVENANCE_RELATIONSHIPS[number] | string;

export interface ProvenanceReference {
  sourceType: ProvenanceSourceType;
  sourceId: string;
  patientId: string;
  encounterId?: string;
  documentId?: string;
  pageNumber?: number | null;
  sourceText?: string | null;
  provenanceSource: ProvenanceSourceType;
  verificationStatus: VerificationStatus;
  extractionStage?: ExtractionStage;
  parentSourceId?: string;
  documentName?: string;
  documentType?: string;
  secureDocumentUrl?: string;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface ProvenanceLink {
  id?: string;
  patientId: string;
  fromType: string;
  fromId: string;
  toType: string;
  toId: string;
  relationship: ProvenanceRelationship;
  metadata?: Record<string, unknown>;
  createdAt?: string;
}

export interface AiTraceMetadata {
  sourceSynthesisVersion?: string;
  sourceFingerprint?: string;
  promptVersion?: string;
  modelProvider?: string;
  modelName?: string;
}

export interface ProvenanceChain {
  rootSource: ProvenanceReference;
  links: ProvenanceLink[];
  nodes: ProvenanceReference[];
  terminalRecord?: ProvenanceReference;
  chainValid: boolean;
  warnings: string[];
  aiTraceMetadata?: AiTraceMetadata;
}

export interface ProvenanceValidationResult {
  valid: boolean;
  warnings: string[];
  reason?: string;
}

export interface ProvenanceServiceResponse<T = unknown> {
  success: boolean;
  data?: T;
  errorCode?: string;
  error?: string;
}
