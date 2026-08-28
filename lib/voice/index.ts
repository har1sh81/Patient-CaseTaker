/**
 * lib/voice/index.ts — Phase 5 Voice Provider exports
 *
 * Replaces the Phase 0 skeleton.
 * All application code imports voice providers from here.
 */

export type { SpeechRecognitionProvider, SpeechRecognitionResult } from './speech-recognition.provider';
export type { TTSProvider, TTSVoiceInfo } from './tts.provider';
export type { MockSpeechConfig } from './mock-speech-recognition';
export type { MockTTSConfig } from './mock-tts';

export { BrowserSpeechRecognition } from './browser-speech-recognition';
export { MockSpeechRecognition } from './mock-speech-recognition';
export { BrowserTTS } from './browser-tts';
export { MockTTS } from './mock-tts';
export { getLangCode, selectVoice, LANGUAGE_BCP47, LANGUAGE_DISPLAY_NAME } from './language-map';
