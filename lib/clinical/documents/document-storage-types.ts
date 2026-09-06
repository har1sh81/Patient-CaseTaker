/**
 * Task #16 — Medical Document Storage Service Types
 * MediKiosk Clinical Engine
 */

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/jpg',
] as const;

export type AllowedMimeType = typeof ALLOWED_MIME_TYPES[number];

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit

export type DocumentType =
  | 'opd_prescription'
  | 'lab_report'
  | 'imaging_report'
  | 'discharge_summary'
  | 'consultation_note'
  | 'ayush_record'
  | 'miscellaneous';

export type UploadStatus = 'uploaded' | 'pending' | 'failed' | 'archived';

export type OcrStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

export type ProvenanceSource =
  | 'patient_uploaded'
  | 'historical_document'
  | 'external_document'
  | 'scanned_paper'
  | 'kiosk_upload';

export type VerificationStatus = 'unverified' | 'reviewed' | 'doctor_verified' | 'rejected';

export interface UploadMedicalDocumentInput {
  patientId: string;
  encounterId?: string;
  documentType: DocumentType | string;
  fileName: string;
  fileBuffer: Buffer;
  mimeType: string;
  documentDate?: string; // YYYY-MM-DD or ISO string
  title?: string;
  provenanceSource?: ProvenanceSource | string;
  verificationStatus?: VerificationStatus | string;
}

export interface MedicalDocumentRecord {
  id: string;
  patient_id: string;
  encounter_id: string | null;
  file_name: string;
  mime_type: string;
  storage_path: string;
  document_type: string;
  upload_status: UploadStatus | string;
  ocr_status: OcrStatus | string;
  source_id: string | null;
  uploaded_at: string;
  created_at: string;
  // Dynamic fields
  signedUrl?: string;
  document_date?: string;
  title?: string;
  provenance_source?: string;
  verification_status?: string;
}

export interface DocumentStorageResult {
  success: boolean;
  document?: MedicalDocumentRecord;
  signedUrl?: string;
  error?: string;
  errorCode?: 'CONSENT_DENIED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'STORAGE_ERROR' | 'DB_ERROR' | 'UNAUTHORIZED';
}

export interface ListDocumentFilters {
  encounterId?: string;
  documentType?: string;
  includeArchived?: boolean;
}

export interface DocumentAuditEntry {
  action: 'document_uploaded' | 'document_accessed' | 'document_archived';
  patientId: string;
  documentId: string;
  metadata?: Record<string, unknown>;
}
