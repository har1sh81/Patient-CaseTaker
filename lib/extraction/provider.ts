import { DocumentExtractionResult } from '../../types';

export interface ExtractionMetadata {
  documentType: string;
  documentDate?: string;
  language?: string;
}

export interface ClinicalExtractionProvider {
  /**
   * Extracts structured clinical information from raw OCR text.
   * 
   * @param documentId The ID of the document.
   * @param ocrText The raw OCR text to extract from.
   * @param metadata Metadata about the document to assist extraction.
   * @returns A promise that resolves to a DocumentExtractionResult.
   */
  extractClinicalInfo(
    documentId: string,
    ocrText: string,
    metadata: ExtractionMetadata
  ): Promise<DocumentExtractionResult>;
}
