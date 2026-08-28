import { OCRProvider } from './provider';
import { OCRResponse } from '../../types';

export class MockOCRProvider implements OCRProvider {
  async processDocument(
    documentId: string,
    _fileBuffer: Buffer,
    _mimeType: string,
    _languageHints?: string[]
  ): Promise<OCRResponse> {
    console.log(`[MockOCRProvider] Processing document ${documentId}`);
    
    // Simulate processing time
    await new Promise((resolve) => setTimeout(resolve, 1500));

    // For testing error state, if documentId ends with "fail"
    if (documentId.endsWith('fail')) {
      return {
        documentId,
        rawText: '',
        pages: [],
        confidence: 'unknown',
        status: 'failed',
        error: 'Simulated OCR processing failure',
      };
    }

    // For testing low confidence, if documentId ends with "low"
    if (documentId.endsWith('low')) {
      return {
        documentId,
        rawText: 'Patient: Unknown... Med: Para... 500..g',
        pages: [
          {
            pageNumber: 1,
            text: 'Patient: Unknown... Med: Para... 500..g',
            confidence: 0.45,
          },
        ],
        confidence: 'low',
        status: 'requires_review',
      };
    }

    // Default successful response
    const mockText = `Patient Name: Ravi Kumar
Age: 45
Date: 2024-05-10
Diagnosis: Hypertension
Medications:
1. Amlodipine 5mg OD
2. Metoprolol 50mg BD
Notes: Blood pressure is elevated. Continue current medications and restrict salt intake.`;

    return {
      documentId,
      rawText: mockText,
      pages: [
        {
          pageNumber: 1,
          text: mockText,
          confidence: 0.95,
        },
      ],
      confidence: 'high',
      status: 'completed',
    };
  }
}
