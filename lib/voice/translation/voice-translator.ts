import { translatePatientText } from '@/lib/translation/indictrans-client';

export interface VoiceTranslationResult {
  success: boolean;
  normalizedText: string;
  translationStatus: 'success' | 'bypassed' | 'failed';
  sourceLanguage: string;
  targetLanguage: string;
  error?: string;
}

export async function translateVoiceTranscript(
  rawText: string,
  sourceLang: string = 'en'
): Promise<VoiceTranslationResult> {
  const cleanLang = (sourceLang || 'en').toLowerCase().trim();

  // If input is English, bypass IndicTrans2 model inference
  if (cleanLang === 'en' || cleanLang.startsWith('en')) {
    return {
      success: true,
      normalizedText: rawText,
      translationStatus: 'bypassed',
      sourceLanguage: 'eng_Latn',
      targetLanguage: 'eng_Latn',
    };
  }

  try {
    const res = await translatePatientText({
      patientText: rawText,
      sourceLanguage: cleanLang,
      targetLanguage: 'eng_Latn',
    });

    if (res.success && res.translatedText) {
      return {
        success: true,
        normalizedText: res.translatedText,
        translationStatus: 'success',
        sourceLanguage: res.sourceLanguage,
        targetLanguage: res.targetLanguage,
      };
    }

    // IndicTrans2 returned failure response
    return {
      success: false,
      normalizedText: rawText, // Preserve original text without pretending translation worked
      translationStatus: 'failed',
      sourceLanguage: res.sourceLanguage,
      targetLanguage: res.targetLanguage,
      error: res.error || 'IndicTrans2 translation failed',
    };
  } catch (err: any) {
    console.error('[VoiceTranslator] IndicTrans2 translation error:', err);
    return {
      success: false,
      normalizedText: rawText,
      translationStatus: 'failed',
      sourceLanguage: cleanLang,
      targetLanguage: 'eng_Latn',
      error: err.message || 'IndicTrans2 microservice connection error',
    };
  }
}
