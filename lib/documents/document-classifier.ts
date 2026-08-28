import { DocumentMetadata } from './document-types';

export async function classifyDocument(rawText: string): Promise<DocumentMetadata['category']> {
  console.log('[Document Classifier] Classifying text content...');
  const normalizedText = rawText.toLowerCase();
  if (normalizedText.includes('prescription')) {
    return 'PRESCRIPTION';
  } else if (normalizedText.includes('lab') || normalizedText.includes('hemoglobin') || normalizedText.includes('report')) {
    return 'LAB_REPORT';
  }
  return 'DISCHARGE_SUMMARY';
}
