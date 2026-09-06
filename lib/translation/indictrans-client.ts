/**
 * IndicTrans2 Translation Client Service
 *
 * Interfaces with the local Python IndicTrans2 microservice running on http://127.0.0.1:8000
 * Model: ai4bharat/indictrans2-indic-en-dist-200M
 */

import { getIndicTransCode } from '../language/config';

export interface TranslationRequest {
  patientText: string;
  sourceLanguage: string; // MediKiosk language ID (e.g. 'ta') OR IndicTrans code (e.g. 'tam_Taml')
  targetLanguage?: string; // Default 'eng_Latn'
}

export interface TranslationResponse {
  success: boolean;
  sourceLanguage: string;
  targetLanguage: string;
  originalText: string;
  translatedText: string;
  modelUsed?: string;
  error?: string;
}

const LOCAL_SERVICE_URL = process.env.INDICTRANS_SERVICE_URL || 'http://127.0.0.1:8000/translate';

/**
 * Resolves any input language identifier to a valid IndicTrans2 code.
 * e.g., 'ta' -> 'tam_Taml', 'hi' -> 'hin_Deva', 'tam_Taml' -> 'tam_Taml'
 */
export function resolveIndicTransCode(lang: string): string {
  if (lang.includes('_')) return lang; // Already an IndicTrans code like 'tam_Taml'
  return getIndicTransCode(lang);
}

/**
 * Translates patient text from an Indian language to English via local IndicTrans2 service.
 */
export async function translatePatientText(req: TranslationRequest): Promise<TranslationResponse> {
  const { patientText, sourceLanguage, targetLanguage = 'eng_Latn' } = req;

  if (!patientText || !patientText.trim()) {

    return {
      success: true,
      sourceLanguage,
      targetLanguage,
      originalText: '',
      translatedText: '',
    };
  }

  const srcCode = resolveIndicTransCode(sourceLanguage);
  const tgtCode = resolveIndicTransCode(targetLanguage);

  // If source is English, skip model inference
  if (srcCode === 'eng_Latn' || tgtCode === srcCode) {
    return {
      success: true,
      sourceLanguage: srcCode,
      targetLanguage: tgtCode,
      originalText: patientText,
      translatedText: patientText,
    };
  }

  try {
    const res = await fetch(LOCAL_SERVICE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientText,
        sourceLanguage: srcCode,
        targetLanguage: tgtCode,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Local IndicTrans2 service error (${res.status}): ${errorText}`);
    }

    const data: TranslationResponse = await res.json();
    return data;
  } catch (err) {
    console.error('[IndicTransClient] Translation call failed:', err);
    // Fallback gracefully to original text on connection failure so UI never crashes
    return {
      success: false,
      sourceLanguage: srcCode,
      targetLanguage: tgtCode,
      originalText: patientText,
      translatedText: patientText,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
