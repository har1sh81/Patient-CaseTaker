/**
 * BrowserSpeechRecognition — concrete implementation using the browser Web Speech API.
 *
 * This class is NOT a React component. It is instantiated once per session
 * inside useSpeechRecognition() and its state is lifted into React state.
 *
 * Lifecycle:
 *  startListening() → listening → (interim results) → done / error
 *  cancelListening() → idle (no result committed)
 *  stopListening()  → processing → done
 *  reset()          → idle
 *
 * Browser support: Chrome (desktop/Android), Edge, Safari 15+.
 * Firefox: unsupported — falls back gracefully via isSupported = false.
 */

import type { SpeechRecognitionErrorType, SpeechRecognitionState } from '../../types';
import type { SupportedLanguage } from '../kiosk/translation';
import { getLangCode } from './language-map';
import type { SpeechRecognitionProvider, SpeechRecognitionResult } from './speech-recognition.provider';

type StateCallback = (state: SpeechRecognitionState) => void;
type ResultCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (type: SpeechRecognitionErrorType, message: string) => void;

/* eslint-disable @typescript-eslint/no-explicit-any */
// Web Speech API types are not in standard TS lib — cast through any
const SpeechRecognitionConstructor: any =
  typeof window !== 'undefined'
    ? (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition
    : null;
/* eslint-enable @typescript-eslint/no-explicit-any */

export class BrowserSpeechRecognition implements SpeechRecognitionProvider {
  readonly isSupported: boolean;

  private _state: SpeechRecognitionState;
  private _result: SpeechRecognitionResult;
  private _errorType?: SpeechRecognitionErrorType;
  private _errorMessage?: string;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private recognition: any | null = null;
  private onStateChange: StateCallback;
  private onResult: ResultCallback;
  private onError: ErrorCallback;

  constructor(
    onStateChange: StateCallback,
    onResult: ResultCallback,
    onError: ErrorCallback
  ) {
    this.isSupported = !!SpeechRecognitionConstructor;
    this._state = this.isSupported ? 'idle' : 'unavailable';
    this._result = { transcript: '', finalTranscript: '', interimTranscript: '' };
    this.onStateChange = onStateChange;
    this.onResult = onResult;
    this.onError = onError;
  }

  get state(): SpeechRecognitionState { return this._state; }
  get result(): SpeechRecognitionResult { return this._result; }
  get errorType(): SpeechRecognitionErrorType | undefined { return this._errorType; }
  get errorMessage(): string | undefined { return this._errorMessage; }

  async startListening(language: SupportedLanguage): Promise<void> {
    if (!this.isSupported) {
      this._setState('unavailable');
      return;
    }
    if (this._state === 'listening') return;

    this._setState('requesting');
    this._resetResult();

    // Check mic permission if available
    if (navigator?.permissions) {
      try {
        const perm = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        if (perm.state === 'denied') {
          this._setState('denied');
          this._errorType = 'not-allowed';
          this._errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings.';
          this.onError('not-allowed', this._errorMessage);
          return;
        }
      } catch {
        // permissions API not available — proceed and let recognition handle it
      }
    }

    const rec = new SpeechRecognitionConstructor();
    rec.lang = getLangCode(language);
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      this._setState('listening');
    };

    rec.onresult = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      let interim = '';
      let final = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const r = event.results[i];
        if (r.isFinal) {
          final += r[0].transcript;
        } else {
          interim += r[0].transcript;
        }
      }
      const combined = final || interim;
      this._result = {
        transcript: combined,
        finalTranscript: final,
        interimTranscript: interim,
        confidence: event.results[event.results.length - 1]?.[0]?.confidence,
      };
      this.onResult({ ...this._result });
    };

    rec.onerror = (event: any) => { // eslint-disable-line @typescript-eslint/no-explicit-any
      const errType = this._mapError(event.error);
      this._errorType = errType;
      this._errorMessage = this._errorDescription(errType);
      this._setState('error');
      this.onError(errType, this._errorMessage);
    };

    rec.onend = () => {
      if (this._state === 'listening') {
        // Ended naturally (single-shot recognition)
        this._setState('done');
      }
    };

    this.recognition = rec;
    try {
      rec.start();
    } catch {
      this._setState('error');
      this._errorType = 'unknown';
      this._errorMessage = 'Failed to start speech recognition.';
      this.onError('unknown', this._errorMessage);
    }
  }

  stopListening(): void {
    if (this.recognition && this._state === 'listening') {
      this._setState('processing');
      this.recognition.stop();
    }
  }

  cancelListening(): void {
    if (this.recognition) {
      this.recognition.abort();
      this.recognition = null;
    }
    this._resetResult();
    this._setState('idle');
  }

  reset(): void {
    this.cancelListening();
  }

  private _setState(state: SpeechRecognitionState): void {
    this._state = state;
    this.onStateChange(state);
  }

  private _resetResult(): void {
    this._result = { transcript: '', finalTranscript: '', interimTranscript: '' };
    this._errorType = undefined;
    this._errorMessage = undefined;
    this.onResult({ ...this._result });
  }

  private _mapError(code: string): SpeechRecognitionErrorType {
    switch (code) {
      case 'no-speech': return 'no-speech';
      case 'audio-capture': return 'audio-capture';
      case 'not-allowed': return 'not-allowed';
      case 'network': return 'network';
      case 'service-not-available': return 'service-not-available';
      case 'aborted': return 'aborted';
      default: return 'unknown';
    }
  }

  private _errorDescription(type: SpeechRecognitionErrorType): string {
    switch (type) {
      case 'no-speech': return 'No speech was detected. Please try speaking more clearly.';
      case 'audio-capture': return 'Microphone could not be accessed. Check your device settings.';
      case 'not-allowed': return 'Microphone permission was denied. Please allow access to continue.';
      case 'network': return 'A network error prevented speech recognition. Check your connection.';
      case 'service-not-available': return 'Speech recognition service is unavailable. Please use touch input.';
      case 'aborted': return 'Recognition was cancelled.';
      default: return 'An unexpected error occurred. Please try again or use touch input.';
    }
  }
}
