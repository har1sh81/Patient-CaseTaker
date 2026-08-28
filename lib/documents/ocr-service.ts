import { DocumentMetadata } from './document-types';

export async function performOCR(document: DocumentMetadata): Promise<string> {
  console.log(`[OCR Service] Processing document ID: ${document.id}`);
  // Return mock raw text
  return 'Patient lab result: Hemoglobin 14.2 g/dL. Blood pressure measured at 120/80 mmHg.';
}
