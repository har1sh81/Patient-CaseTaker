export interface DocumentMetadata {
  id: string;
  fileName: string;
  fileType: string;
  uploadedAt: string;
  status: 'PENDING' | 'CLASSIFIED' | 'OCR_COMPLETED' | 'PROCESSED' | 'FAILED';
  category?: 'PRESCRIPTION' | 'LAB_REPORT' | 'DISCHARGE_SUMMARY' | 'UNKNOWN';
}

export interface ExtractedEntity {
  name: string;
  value: string;
  confidence: number;
}
