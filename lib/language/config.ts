/**
 * Centralized Language Configuration for MediKiosk
 *
 * Supports the 22 scheduled Indian languages supported by IndicTrans2 + English.
 * Provides ISO codes, IndicTrans2 language tags, BCP-47 speech tags, native script display names,
 * and helper functions.
 */

export interface LanguageInfo {
  /** 2-or-3 letter MediKiosk language ID (e.g. 'ta', 'hi', 'te') */
  id: string;
  /** English display name (e.g. 'Tamil', 'Hindi', 'Telugu') */
  name: string;
  /** Native script display name (e.g. 'தமிழ்', 'हिंदी', 'తెలుగు') */
  nativeName: string;
  /** IndicTrans2 model language code (e.g. 'tam_Taml', 'hin_Deva') */
  indicTransCode: string;
  /** BCP-47 language tag for Web Speech API STT and Browser TTS (e.g. 'ta-IN', 'hi-IN') */
  bcp47: string;
  /** Text direction: 'ltr' or 'rtl' */
  direction: 'ltr' | 'rtl';
}

export const SCHEDULED_LANGUAGES: LanguageInfo[] = [
  { id: 'en', name: 'English', nativeName: 'English', indicTransCode: 'eng_Latn', bcp47: 'en-IN', direction: 'ltr' },
  { id: 'hi', name: 'Hindi', nativeName: 'हिंदी', indicTransCode: 'hin_Deva', bcp47: 'hi-IN', direction: 'ltr' },
  { id: 'ta', name: 'Tamil', nativeName: 'தமிழ்', indicTransCode: 'tam_Taml', bcp47: 'ta-IN', direction: 'ltr' },
  { id: 'te', name: 'Telugu', nativeName: 'తెలుగు', indicTransCode: 'tel_Telu', bcp47: 'te-IN', direction: 'ltr' },
  { id: 'mr', name: 'Marathi', nativeName: 'मराठी', indicTransCode: 'mar_Deva', bcp47: 'mr-IN', direction: 'ltr' },
  { id: 'bn', name: 'Bengali', nativeName: 'বাংলা', indicTransCode: 'ben_Beng', bcp47: 'bn-IN', direction: 'ltr' },
  { id: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', indicTransCode: 'guj_Gujr', bcp47: 'gu-IN', direction: 'ltr' },
  { id: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', indicTransCode: 'kan_Knda', bcp47: 'kn-IN', direction: 'ltr' },
  { id: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', indicTransCode: 'mal_Mlym', bcp47: 'ml-IN', direction: 'ltr' },
  { id: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', indicTransCode: 'pan_Guru', bcp47: 'pa-IN', direction: 'ltr' },
  { id: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', indicTransCode: 'ori_Orya', bcp47: 'or-IN', direction: 'ltr' },
  { id: 'as', name: 'Assamese', nativeName: 'অসমীয়া', indicTransCode: 'asm_Beng', bcp47: 'as-IN', direction: 'ltr' },
  { id: 'ur', name: 'Urdu', nativeName: 'اردو', indicTransCode: 'urd_Arab', bcp47: 'ur-IN', direction: 'rtl' },
  { id: 'ks', name: 'Kashmiri', nativeName: 'कश्मीरी / كشميري', indicTransCode: 'kas_Deva', bcp47: 'ks-IN', direction: 'ltr' },
  { id: 'ne', name: 'Nepali', nativeName: 'नेपाली', indicTransCode: 'nep_Deva', bcp47: 'ne-IN', direction: 'ltr' },
  { id: 'sd', name: 'Sindhi', nativeName: 'सिन्धी / سنڌي', indicTransCode: 'snd_Deva', bcp47: 'sd-IN', direction: 'ltr' },
  { id: 'sa', name: 'Sanskrit', nativeName: 'संस्कृतम्', indicTransCode: 'san_Deva', bcp47: 'sa-IN', direction: 'ltr' },
  { id: 'mai', name: 'Maithili', nativeName: 'मैथिली', indicTransCode: 'mai_Deva', bcp47: 'mai-IN', direction: 'ltr' },
  { id: 'doi', name: 'Dogri', nativeName: 'डोगरी', indicTransCode: 'doi_Deva', bcp47: 'doi-IN', direction: 'ltr' },
  { id: 'kok', name: 'Konkani', nativeName: 'कोंकणी', indicTransCode: 'kok_Deva', bcp47: 'kok-IN', direction: 'ltr' },
  { id: 'sat', name: 'Santali', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', indicTransCode: 'sat_Olck', bcp47: 'sat-IN', direction: 'ltr' },
  { id: 'brx', name: 'Bodo', nativeName: 'बड़ो', indicTransCode: 'brx_Deva', bcp47: 'brx-IN', direction: 'ltr' },
  { id: 'mni', name: 'Manipuri', nativeName: 'মৈতৈলোন্', indicTransCode: 'mni_Beng', bcp47: 'mni-IN', direction: 'ltr' },
];

/** Tuple array of valid language IDs for Zod enum schema */
export const SUPPORTED_LANGUAGE_IDS = [
  'en', 'hi', 'ta', 'te', 'mr', 'bn', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur', 'ks', 'ne', 'sd', 'sa', 'mai', 'doi', 'kok', 'sat', 'brx', 'mni'
] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGE_IDS)[number];

/** Lookup map by language ID */
export const LANGUAGE_MAP: Record<string, LanguageInfo> = SCHEDULED_LANGUAGES.reduce(
  (acc, lang) => {
    acc[lang.id] = lang;
    return acc;
  },
  {} as Record<string, LanguageInfo>
);

/** Get language details by ID, defaulting to English */
export function getLanguageInfo(id: string): LanguageInfo {
  return LANGUAGE_MAP[id] || LANGUAGE_MAP['en'];
}

/** Get IndicTrans2 language tag (e.g. 'tam_Taml', 'hin_Deva') for a given MediKiosk language ID */
export function getIndicTransCode(id: string): string {
  return getLanguageInfo(id).indicTransCode;
}

/** Get BCP-47 tag for speech recognition / TTS for a given MediKiosk language ID */
export function getBcp47Code(id: string): string {
  return getLanguageInfo(id).bcp47;
}

/** Get Native display name for a given MediKiosk language ID */
export function getNativeDisplayName(id: string): string {
  return getLanguageInfo(id).nativeName;
}
