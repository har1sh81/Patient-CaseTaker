/**
 * SpeechRecognitionProvider — canonical interface for Phase 5.
 *
 * Application code depends only on this interface.
 * Concrete implementations (browser, mock) are swapped in via hooks.
 */

import type { SpeechRecognitionState, SpeechRecognitionErrorType } from '../../types';
import type { SupportedLanguage } from '../kiosk/translation';

export interface SpeechRecognitionResult {
  /** Best guess at the complete spoken text so far (may be interim) */
  transcript: string;
  /** Final, committed transcript — empty string until recognition is complete */
  finalTranscript: string;
  /** In-progress text that may still change */
  interimTranscript: string;
  /** Confidence score 0–1 if available */
  confidence?: number;
}

export interface SpeechRecognitionProvider {
  /** Whether this provider can operate in the current environment */
  isSupported: boolean;

  /** Current provider state */
  state: SpeechRecognitionState;

  /** Recognition result (updated continuously while listening) */
  result: SpeechRecognitionResult;

  /** Error type if state === 'error' | 'denied' */
  errorType?: SpeechRecognitionErrorType;

  /** Human-readable error message */
  errorMessage?: string;

  /** Start listening. Returns a promise that resolves when listening begins. */
  startListening(language: SupportedLanguage): Promise<void>;

  /** Stop listening and commit the current transcript as final */
  stopListening(): void;

  /** Cancel listening without committing — transcript is discarded */
  cancelListening(): void;

  /** Reset all transcript state to empty and return to idle */
  reset(): void;
}
