/**
 * BrowserTTS — concrete Text-to-Speech implementation using browser SpeechSynthesis API.
 *
 * Operates only through the TTSProvider interface.
 * If no voice is available for the selected language, state is set to 'unavailable'
 * and the caller must show text on screen instead.
 */

import type { TTSState } from '../../types';
import type { SupportedLanguage } from '../kiosk/translation';
import { selectVoice } from './language-map';
import type { TTSProvider, TTSVoiceInfo } from './tts.provider';

type StateCallback = (state: TTSState) => void;

const isTTSSupported = (): boolean =>
  typeof window !== 'undefined' && 'speechSynthesis' in window;

export class BrowserTTS implements TTSProvider {
  readonly isSupported: boolean;

  private _state: TTSState;
  private _errorMessage?: string;
  private _voices: SpeechSynthesisVoice[] = [];
  private _voicesLoaded = false;
  private onStateChange: StateCallback;

  constructor(onStateChange: StateCallback) {
    this.isSupported = isTTSSupported();
    this._state = this.isSupported ? 'idle' : 'unavailable';
    this.onStateChange = onStateChange;

    if (this.isSupported) {
      this._loadVoices();
      // voices may load asynchronously
      window.speechSynthesis.onvoiceschanged = () => this._loadVoices();
    }
  }

  get state(): TTSState { return this._state; }
  get isSpeaking(): boolean { return this._state === 'speaking'; }
  get isPaused(): boolean { return this._state === 'paused'; }
  get errorMessage(): string | undefined { return this._errorMessage; }
  get availableVoices(): TTSVoiceInfo[] {
    return this._voices.map((v) => ({
      name: v.name,
      lang: v.lang,
      isAvailable: true,
    }));
  }

  speak(text: string, language: SupportedLanguage, rate = 0.9): void {
    if (!this.isSupported) {
      this._setState('unavailable');
      return;
    }
    window.speechSynthesis.cancel();
    this._loadVoices();

    const voice = selectVoice(language, this._voices);
    if (!voice) {
      // No matching voice — show unavailable, caller must fall back to showing text
      this._errorMessage = `No voice available for ${language}. Text is shown on screen.`;
      this._setState('unavailable');
      return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.voice = voice;
    utterance.lang = voice.lang;
    utterance.rate = Math.max(0.5, Math.min(2.0, rate));

    utterance.onstart = () => this._setState('speaking');
    utterance.onend = () => this._setState('done');
    utterance.onerror = (e) => {
      this._errorMessage = `TTS error: ${e.error}`;
      this._setState('error');
    };
    utterance.onpause = () => this._setState('paused');
    utterance.onresume = () => this._setState('speaking');

    this._setState('speaking');
    window.speechSynthesis.speak(utterance);
  }

  stop(): void {
    if (this.isSupported) window.speechSynthesis.cancel();
    this._setState('idle');
  }

  pause(): void {
    if (this.isSupported && this._state === 'speaking') {
      window.speechSynthesis.pause();
      this._setState('paused');
    }
  }

  resume(): void {
    if (this.isSupported && this._state === 'paused') {
      window.speechSynthesis.resume();
      this._setState('speaking');
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

  private _loadVoices(): void {
    if (!this.isSupported) return;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
      this._voices = voices;
      this._voicesLoaded = true;
    }
  }
}
