import { OCRResponse } from '../../types';

export interface OCRProvider {
  /**
   * Processes a document and extracts raw text using OCR.
   * 
   * @param documentId The ID of the document being processed.
   * @param fileBuffer The raw file bytes.
   * @param mimeType The MIME type of the document (e.g. image/jpeg, application/pdf).
   * @param languageHints Optional array of language codes to guide the OCR engine.
   * @returns A promise that resolves to an OCRResponse.
   */
  processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    languageHints?: string[]
  ): Promise<OCRResponse>;
}
