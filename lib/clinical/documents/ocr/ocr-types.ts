/**
 * Task #17, #18 & #19 — Medical Document OCR Pipeline Types
 * MediKiosk Clinical Engine
 */

export interface OcrPage {
  pageNumber: number;
  text: string;
  confidence?: number;
}

export type ExtractionMethod = 'text_extraction' | 'ocr' | 'handwritten_ocr' | 'hybrid';

export interface OcrProviderResult {
  text: string;
  pages: OcrPage[];
  provider: string;
  extractionMethod: ExtractionMethod;
  confidence?: number;
  metadata?: Record<string, unknown>;
}

export interface OcrOptions {
  forceRetry?: boolean;
  language?: string; // Default 'en'
  mode?: 'standard' | 'handwritten' | 'multilingual';
}

export interface DocumentExtractionRecord {
  id: string;
  document_id: string;
  raw_ocr_text: string | null;
  extracted_json: Record<string, unknown>;
  confidence_score: number | null;
  processed_at: string;
  created_at: string;
}

export interface OcrProcessResult {
  success: boolean;
  documentId: string;
  ocrStatus: 'pending' | 'processing' | 'completed' | 'failed';
  extraction?: DocumentExtractionRecord;
  rawText?: string;
  pages?: OcrPage[];
  provider?: string;
  extractionMethod?: ExtractionMethod;
  confidence?: number;
  comparison?: {
    baselineOutput: string;
    baselineConfidence?: number;
    handwrittenOutput: string;
    handwrittenConfidence?: number;
    preprocessingSteps: string[];
  };
  error?: string;
  errorCode?: 'CONSENT_DENIED' | 'INVALID_INPUT' | 'NOT_FOUND' | 'UNAUTHORIZED' | 'STORAGE_ERROR' | 'OCR_FAILED' | 'DB_ERROR';
}
