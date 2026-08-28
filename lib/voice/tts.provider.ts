/**
 * TTSProvider — canonical interface for Phase 5 Text-to-Speech.
 *
 * Application code depends only on this interface.
 */

import type { TTSState } from '../../types';
import type { SupportedLanguage } from '../kiosk/translation';

export interface TTSVoiceInfo {
  name: string;
  lang: string;
  isAvailable: boolean;
}

export interface TTSProvider {
  /** Whether TTS is supported in this environment */
  isSupported: boolean;

  /** Current TTS state */
  state: TTSState;

  /** Whether the engine is currently producing audio */
  isSpeaking: boolean;

  /** Whether the engine is paused mid-utterance */
  isPaused: boolean;

  /** Human-readable error message if state === 'error' */
  errorMessage?: string;

  /** Available voices for the current language */
  availableVoices: TTSVoiceInfo[];

  /**
   * Speak the given text in the given language.
   * If the voice for the language is unavailable, state transitions to 'unavailable'.
   */
  speak(text: string, language: SupportedLanguage, rate?: number): void;

  /** Stop current speech immediately */
  stop(): void;

  /** Pause speech (browser permitting) */
  pause(): void;

  /** Resume paused speech */
  resume(): void;

  /** Cancel all speech and reset state */
  reset(): void;
}
