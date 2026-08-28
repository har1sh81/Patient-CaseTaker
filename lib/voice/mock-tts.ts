/**
 * MockTTS — deterministic Text-to-Speech mock for demos and testing.
 * No audio is played. State transitions happen on a timer.
 */

import type { TTSState } from '../../types';
import type { SupportedLanguage } from '../kiosk/translation';
import type { TTSProvider, TTSVoiceInfo } from './tts.provider';

type StateCallback = (state: TTSState) => void;

export interface MockTTSConfig {
  /** Duration in ms to simulate speech for each character */
  msPerChar?: number;
  /** Whether to simulate TTS being unavailable */
  simulateUnavailable?: boolean;
  /** Whether to simulate a TTS error */
  simulateError?: boolean;
}

export class MockTTS implements TTSProvider {
  readonly isSupported: boolean;

  private _state: TTSState;
  private _errorMessage?: string;
  private _timer: ReturnType<typeof setTimeout> | null = null;
  private config: MockTTSConfig;
  private onStateChange: StateCallback;

  constructor(onStateChange: StateCallback, config?: MockTTSConfig) {
    this.config = { msPerChar: 50, ...config };
    this.isSupported = !this.config.simulateUnavailable;
    this._state = this.isSupported ? 'idle' : 'unavailable';
    this.onStateChange = onStateChange;
  }

  get state(): TTSState { return this._state; }
  get isSpeaking(): boolean { return this._state === 'speaking'; }
  get isPaused(): boolean { return this._state === 'paused'; }
  get errorMessage(): string | undefined { return this._errorMessage; }
  get availableVoices(): TTSVoiceInfo[] {
    return this.isSupported
      ? [{ name: 'Mock Voice (en-IN)', lang: 'en-IN', isAvailable: true }]
      : [];
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  speak(text: string, language: SupportedLanguage, rate?: number): void {
    if (!this.isSupported) {
      this._setState('unavailable');
      return;
    }
    if (this.config.simulateError) {
      this._errorMessage = 'Mock TTS error simulated.';
      this._setState('error');
      return;
    }
    this._clearTimer();
    this._setState('speaking');
    const duration = text.length * (this.config.msPerChar ?? 50);
    this._timer = setTimeout(() => this._setState('done'), duration);
  }

  stop(): void {
    this._clearTimer();
    this._setState('idle');
  }

  pause(): void {
    if (this._state === 'speaking') {
      this._clearTimer();
      this._setState('paused');
    }
  }

  resume(): void {
    if (this._state === 'paused') {
      this._setState('speaking');
      this._timer = setTimeout(() => this._setState('done'), 1000);
    }
  }

  reset(): void {
    this.stop();
    this._errorMessage = undefined;
  }

  private _setState(state: TTSState): void {
    this._state = state;
    this.onStateChange(state);
  }

  private _clearTimer(): void {
    if (this._timer !== null) {
      clearTimeout(this._timer);
      this._timer = null;
    }
  }
}
