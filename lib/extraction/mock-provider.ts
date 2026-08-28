import { ClinicalExtractionProvider, ExtractionMetadata } from './provider';
import { DocumentExtractionResult } from '../../types';

export class MockClinicalExtractionProvider implements ClinicalExtractionProvider {
  async extractClinicalInfo(
    documentId: string,
    ocrText: string,
    metadata: ExtractionMetadata
  ): Promise<DocumentExtractionResult> {
    console.log(`[MockClinicalExtractionProvider] Extracting info for document ${documentId}`);
    
    // Simulate network delay
    await new Promise((resolve) => setTimeout(resolve, 1500));

    const lowercaseText = ocrText.toLowerCase();

    // 1. Network Failure Simulation
    if (lowercaseText.includes('fail') || lowercaseText.includes('error')) {
      throw new Error('Simulated clinical extraction network failure');
    }

    // 2. Empty / Unsupported
    if (!ocrText || ocrText.trim() === '' || lowercaseText.includes('empty')) {
      return {
        documentId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documentType: metadata.documentType as any,
        documentDate: metadata.documentDate,
        extractionStatus: 'completed',
        diagnosesMentioned: [],
        medications: [],
        allergies: [],
        procedures: [],
        laboratoryResults: [],
        admissions: [],
        timelineEvents: [],
        unstructuredSummary: 'No clinical information found.',
        confidence: 'high',
      };
    }

    // 3. Low Confidence / Ambiguous
    if (lowercaseText.includes('ambiguous') || lowercaseText.includes('blur')) {
      return {
        documentId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        documentType: metadata.documentType as any,
        documentDate: metadata.documentDate,
        extractionStatus: 'requires_review',
        diagnosesMentioned: [],
        medications: [
          {
            id: `med_${Date.now()}`,
            name: 'Unknown Medication',
            status: 'unknown',
            rawText: 'Unclear handwriting... 500mg',
            provenance: { source: 'ocr', documentId },
          }
        ],
        allergies: [],
        procedures: [],
        laboratoryResults: [],
        admissions: [],
        timelineEvents: [],
        confidence: 'low',
      };
    }

    // 4. Successful extraction (Standard Demo Case)
    // Looking for some keywords to build a rich payload if this is the target document
    return {
      documentId,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      documentType: metadata.documentType as any,
      documentDate: metadata.documentDate || new Date().toISOString().split('T')[0],
      extractionStatus: 'completed',
      diagnosesMentioned: lowercaseText.includes('hypertension') ? [
        {
          name: 'Hypertension',
          status: 'mentioned',
          sourceText: 'Diagnosis: Hypertension',
          provenance: { source: 'ocr', documentId },
        }
      ] : [],
      medications: lowercaseText.includes('metformin') ? [
        {
          id: `med_${Date.now()}_1`,
          name: 'Metformin',
          dosage: '500 mg',
          frequency: 'twice daily',
          status: 'active',
          rawText: 'Metformin 500 mg twice daily',
          provenance: { source: 'ocr', documentId },
        }
      ] : [],
      allergies: lowercaseText.includes('penicillin') ? [
        {
          id: `alg_${Date.now()}_1`,
          allergen: 'Penicillin',
          category: 'drug',
          provenance: { source: 'ocr', documentId },
        }
      ] : [],
      procedures: lowercaseText.includes('appendectomy') ? [
        {
          name: 'Appendectomy',
          date: '2022',
          provenance: { source: 'ocr', documentId },
        }
      ] : [],
      laboratoryResults: lowercaseText.includes('hba1c') ? [
        {
          id: `lab_${Date.now()}_1`,
          testName: 'HbA1c',
          valueRaw: '8.2%',
          numericValue: 8.2,
          unit: '%',
          documentProvidedRange: false,
          sourceDocumentId: documentId,
          provenance: { source: 'ocr', documentId },
        }
      ] : [],
      admissions: [],
      timelineEvents: [],
      confidence: 'high',
    };
  }
}
