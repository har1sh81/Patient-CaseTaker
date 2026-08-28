import { OCRProvider } from './provider';
import { OCRResponse } from '../../types';
import { GoogleGenAI } from '@google/genai';

export class RealOCRProvider implements OCRProvider {
  private ai: GoogleGenAI;

  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      console.warn('[RealOCRProvider] Missing GEMINI_API_KEY in environment!');
    }
    this.ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  }

  async processDocument(
    documentId: string,
    fileBuffer: Buffer,
    mimeType: string,
    languageHints?: string[]
  ): Promise<OCRResponse> {
    try {
      console.log(`[RealOCRProvider] Transcribing document ${documentId}`);

      // Encode buffer to base64
      const base64Data = fileBuffer.toString('base64');

      const systemInstruction = `You are a highly precise medical Optical Character Recognition (OCR) engine.
Your ONLY task is to extract raw text from the provided document image/PDF exactly as it appears.
DO NOT interpret, summarize, format, or evaluate the clinical meaning of the text.
DO NOT add conversational filler (e.g. "Here is the text").
Output the transcribed raw text exactly as seen in the document, preserving structure where possible.
If the document is illegible, output "UNREADABLE_DOCUMENT".
If the document contains handwriting, do your best to transcribe it literally.
${languageHints && languageHints.length > 0 ? `Please pay special attention to the following expected languages: ${languageHints.join(', ')}` : ''}`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  data: base64Data,
                  mimeType: mimeType,
                },
              },
              {
                text: "Extract the text from this document.",
              },
            ],
          },
        ],
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.1, // Low temperature for high precision OCR
        },
      });

      const extractedText = response.text || '';

      if (extractedText.includes('UNREADABLE_DOCUMENT') || extractedText.trim() === '') {
        return {
          documentId,
          rawText: '',
          pages: [],
          confidence: 'unknown',
          status: 'failed',
          error: 'Document is illegible or empty.',
        };
      }

      // Gemini doesn't currently provide character-level confidence bounds natively in standard text generation,
      // so we assign a baseline high confidence if it succeeded.
      return {
        documentId,
        rawText: extractedText,
        pages: [
          {
            pageNumber: 1,
            text: extractedText,
            confidence: 0.9,
          },
        ],
        confidence: 'high',
        status: 'completed',
      };
    } catch (error) {
      console.error('[RealOCRProvider] Error processing document:', error);
      return {
        documentId,
        rawText: '',
        pages: [],
        confidence: 'unknown',
        status: 'failed',
        error: error instanceof Error ? error.message : 'Unknown OCR error',
      };
    }
  }
}
