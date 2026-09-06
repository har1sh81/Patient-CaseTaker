/**
 * Centralised language mapping for MediKiosk voice interactions and IndicTrans2 integration.
 *
 * All speech recognition, TTS, and translation services import language metadata from here and ../language/config.
 */

import {
  SupportedLanguage,
  SCHEDULED_LANGUAGES,
  getBcp47Code,
  getNativeDisplayName,
  getIndicTransCode,
} from '../language/config';

export type { SupportedLanguage };

/** BCP-47 tags used for browser Web Speech API and SpeechSynthesis */
export const LANGUAGE_BCP47: Record<string, string> = SCHEDULED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.id] = lang.bcp47;
    return acc;
  },
  {} as Record<string, string>
);

/** Human-readable language display names in native script */
export const LANGUAGE_DISPLAY_NAME: Record<string, string> = SCHEDULED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.id] = lang.nativeName;
    return acc;
  },
  {} as Record<string, string>
);

/** IndicTrans2 model language codes (e.g. 'tam_Taml', 'hin_Deva') */
export const LANGUAGE_INDICTRANS: Record<string, string> = SCHEDULED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.id] = lang.indicTransCode;
    return acc;
  },
  {} as Record<string, string>
);

/**
 * Returns the BCP-47 language code for the given MediKiosk language.
 */
export function getLangCode(lang: SupportedLanguage | string): string {
  return getBcp47Code(lang);
}

/**
 * Returns the IndicTrans2 language tag for the given MediKiosk language.
 */
export function getIndicTransLangCode(lang: SupportedLanguage | string): string {
  return getIndicTransCode(lang);
}

/**
 * Heuristically selects the best available SpeechSynthesisVoice for a given language.
 * Returns null if no matching voice is found.
 */
export function selectVoice(
  lang: SupportedLanguage | string,
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const bcp47 = getLangCode(lang);
  // Prefer exact BCP-47 match, then prefix match (e.g. 'hi' for 'hi-IN')
  const exact = voices.find((v) => v.lang === bcp47);
  if (exact) return exact;
  const prefix = voices.find((v) => v.lang.startsWith(lang) || v.lang.startsWith(bcp47.split('-')[0]));
  return prefix ?? null;
}
