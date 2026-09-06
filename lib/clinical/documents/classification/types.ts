/**
 * Task #20 — Medical Document Classification Types
 * MediKiosk Clinical Engine
 */

/**
 * Standard document categories in MediKiosk.
 */
export type DocumentCategory =
  | 'opd_prescription'
  | 'laboratory_report'
  | 'discharge_summary'
  | 'imaging_report'
  | 'consultation_note'
  | 'ayush_record'
  | 'referral_note'
  | 'pediatric_record'
  | 'other';

/**
 * Supported classification execution methods.
 */
export type ClassificationMethod = 'rule_based' | 'ml_model' | 'metadata_fallback';

/**
 * Input interface passed to document classifiers.
 */
export interface ClassificationInput {
  documentId?: string;
  rawOcrText?: string;
  fileName?: string;
  mimeType?: string;
  storagePath?: string;
  manualDocumentType?: string;
  preferredLanguage?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Structured result returned by classification engine.
 */
export interface DocumentClassificationResult {
  predictedDocumentType: DocumentCategory;
  confidence: number;
  method: ClassificationMethod;
  classifierVersion: string;
  evidence: string[];
  matchedKeywords: string[];
  needsReview: boolean;
  manualDocumentType?: string;
  matchesManualType?: boolean;
  classifiedAt: string;
}

/**
 * Modular classifier interface for pluggable implementations.
 */
export interface DocumentClassifier {
  classify(input: ClassificationInput): Promise<DocumentClassificationResult>;
}

/**
 * Result model returned by the top-level classification service.
 */
export interface ClassificationProcessResult {
  success: boolean;
  documentId: string;
  result?: DocumentClassificationResult;
  errorCode?:
    | 'INVALID_INPUT'
    | 'NOT_FOUND'
    | 'UNAUTHORIZED'
    | 'CONSENT_DENIED'
    | 'OCR_MISSING'
    | 'DB_ERROR'
    | 'CLASSIFICATION_FAILED';
  error?: string;
}

/**
 * Helper to normalize raw database document types to DocumentCategory.
 */
export function normalizeDocumentType(rawType?: string): DocumentCategory {
  if (!rawType) return 'other';
  const clean = rawType.toLowerCase().trim();
  if (clean.includes('prescription') || clean === 'opd_prescription' || clean === 'rx') {
    return 'opd_prescription';
  }
  if (
    clean.includes('lab') ||
    clean.includes('pathology') ||
    clean.includes('biochemistry') ||
    clean.includes('hba1c') ||
    clean.includes('cbc')
  ) {
    return 'laboratory_report';
  }
  if (clean.includes('discharge')) {
    return 'discharge_summary';
  }
  if (
    clean.includes('imaging') ||
    clean.includes('ecg') ||
    clean.includes('xray') ||
    clean.includes('usg') ||
    clean.includes('scan') ||
    clean.includes('radiology') ||
    clean.includes('ultrasound')
  ) {
    return 'imaging_report';
  }
  if (
    clean.includes('ayush') ||
    clean.includes('ayurveda') ||
    clean.includes('dashavidha') ||
    clean.includes('siddha') ||
    clean.includes('unani')
  ) {
    return 'ayush_record';
  }
  if (clean.includes('referral') || clean.includes('referred')) {
    return 'referral_note';
  }
  if (clean.includes('pediatric') || clean.includes('child') || clean.includes('growth')) {
    return 'pediatric_record';
  }
  if (
    clean.includes('consultation') ||
    clean.includes('opd_note') ||
    clean.includes('ortho_note') ||
    clean.includes('clinical_note')
  ) {
    return 'consultation_note';
  }
  return 'other';
}
