/**
 * MockSpeechRecognition — deterministic mock provider for demos and testing.
 *
 * Produces a configured transcript after a configurable delay.
 * No microphone access is requested. No random content.
 * Used in demo mode and unit tests.
 */

import type { SpeechRecognitionErrorType, SpeechRecognitionState } from '../../types';
import type { SupportedLanguage } from '../kiosk/translation';
import type { SpeechRecognitionProvider, SpeechRecognitionResult } from './speech-recognition.provider';

type StateCallback = (state: SpeechRecognitionState) => void;
type ResultCallback = (result: SpeechRecognitionResult) => void;
type ErrorCallback = (type: SpeechRecognitionErrorType, message: string) => void;

export interface MockSpeechConfig {
  /** The transcript text that will be delivered as the final result */
  transcript: string;
  /** Delay in ms before interim transcript appears */
  interimDelayMs?: number;
  /** Delay in ms before final transcript is committed */
  finalDelayMs?: number;
  /** If set, the mock will produce this error instead of a transcript */
  simulateError?: SpeechRecognitionErrorType;
}

const DEFAULT_CONFIG: MockSpeechConfig = {
  transcript: 'I have had a headache for three days.',
  interimDelayMs: 800,
  finalDelayMs: 2000,
};

export class MockSpeechRecognition implements SpeechRecognitionProvider {
  readonly isSupported = true;

  private _state: SpeechRecognitionState = 'idle';
  private _result: SpeechRecognitionResult = {
    transcript: '',
    finalTranscript: '',
    interimTranscript: '',
  };
  private _errorType?: SpeechRecognitionErrorType;
  private _errorMessage?: string;
  private _timers: ReturnType<typeof setTimeout>[] = [];

  private config: MockSpeechConfig;
  private onStateChange: StateCallback;
  private onResult: ResultCallback;
  private onError: ErrorCallback;

  constructor(
    onStateChange: StateCallback,
    onResult: ResultCallback,
    onError: ErrorCallback,
    config?: Partial<MockSpeechConfig>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.onStateChange = onStateChange;
    this.onResult = onResult;
    this.onError = onError;
  }

  get state(): SpeechRecognitionState { return this._state; }
  get result(): SpeechRecognitionResult { return this._result; }
  get errorType(): SpeechRecognitionErrorType | undefined { return this._errorType; }
  get errorMessage(): string | undefined { return this._errorMessage; }

  /** Update the mock transcript at runtime (e.g., when switching demo scenarios) */
  setConfig(config: Partial<MockSpeechConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async startListening(language: SupportedLanguage): Promise<void> {
    if (this._state === 'listening') return;
    this._clearTimers();
    this._setState('requesting');
    this._resetResult();

    // Simulate ~200ms permission request
    this._timers.push(setTimeout(() => {
      this._setState('listening');

      if (this.config.simulateError) {
        const err = this.config.simulateError;
        this._timers.push(setTimeout(() => {
          this._errorType = err;
          this._errorMessage = `Mock error: ${err}`;
          this._setState('error');
          this.onError(err, this._errorMessage);
        }, this.config.interimDelayMs ?? 800));
        return;
      }

      // Show interim transcript
      this._timers.push(setTimeout(() => {
        const interim = this.config.transcript.slice(0, Math.floor(this.config.transcript.length * 0.6));
        this._result = { transcript: interim, finalTranscript: '', interimTranscript: interim };
        this.onResult({ ...this._result });
      }, this.config.interimDelayMs ?? 800));

      // Deliver final transcript
      this._timers.push(setTimeout(() => {
        this._result = {
          transcript: this.config.transcript,
          finalTranscript: this.config.transcript,
          interimTranscript: '',
          confidence: 0.95,
        };
        this.onResult({ ...this._result });
        this._setState('done');
      }, this.config.finalDelayMs ?? 2000));
    }, 200));
  }

  stopListening(): void {
    this._clearTimers();
    if (this._state === 'listening') {
      // Deliver whatever transcript was built so far
      const partial = this._result.transcript || this.config.transcript;
      this._result = {
        transcript: partial,
        finalTranscript: partial,
        interimTranscript: '',
        confidence: 0.9,
      };
      this.onResult({ ...this._result });
      this._setState('done');
    }
  }

  cancelListening(): void {
    this._clearTimers();
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

  private _clearTimers(): void {
    this._timers.forEach(clearTimeout);
    this._timers = [];
  }
}
