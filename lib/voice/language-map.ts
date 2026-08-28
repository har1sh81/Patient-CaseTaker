/**
 * Centralised BCP-47 language code mapping for MediKiosk voice interactions.
 *
 * All speech recognition and TTS code must import language codes from here.
 * Never hardcode language codes inside components or hooks.
 */

import type { SupportedLanguage } from '../kiosk/translation';

/** BCP-47 tags used for browser Web Speech API and SpeechSynthesis */
export const LANGUAGE_BCP47: Record<SupportedLanguage, string> = {
  en: 'en-IN', // English (India) — best for Indian-accented English
  hi: 'hi-IN', // Hindi
  ta: 'ta-IN', // Tamil
};

/** Human-readable language display names */
export const LANGUAGE_DISPLAY_NAME: Record<SupportedLanguage, string> = {
  en: 'English',
  hi: 'हिंदी',
  ta: 'தமிழ்',
};

/**
 * Returns the BCP-47 language code for the given MediKiosk language.
 */
export function getLangCode(lang: SupportedLanguage): string {
  return LANGUAGE_BCP47[lang];
}

/**
 * Heuristically selects the best available SpeechSynthesisVoice for a given language.
 * Returns null if no matching voice is found.
 */
export function selectVoice(
  lang: SupportedLanguage,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const bcp47 = getLangCode(lang);
  // Prefer exact BCP-47 match, then prefix match (e.g. 'hi' for 'hi-IN')
  const exact = voices.find((v) => v.lang === bcp47);
  if (exact) return exact;
  const prefix = voices.find((v) => v.lang.startsWith(lang));
  return prefix ?? null;
}
