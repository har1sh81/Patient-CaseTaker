'use client';

/**
 * useTTS — React hook wrapping a TTSProvider.
 *
 * Handles provider creation, state lifting, and cleanup on unmount.
 *
 * When a voice for the selected language is unavailable, the hook reports
 * isUnavailable = true. The caller must display the text on screen instead.
 */

import * as React from 'react';
import type { TTSState } from '../types';
import type { TTSVoiceInfo } from '../lib/voice/tts.provider';
import type { SupportedLanguage } from '../lib/kiosk/translation';
import { BrowserTTS } from '../lib/voice/browser-tts';
import { MockTTS, type MockTTSConfig } from '../lib/voice/mock-tts';

export interface UseTTSOptions {
  mock?: boolean;
  mockConfig?: MockTTSConfig;
}

export interface UseTTSReturn {
  isSupported: boolean;
  state: TTSState;
  isSpeaking: boolean;
  isPaused: boolean;
  isUnavailable: boolean;
  isError: boolean;
  errorMessage?: string;
  availableVoices: TTSVoiceInfo[];
  speak: (text: string, language: SupportedLanguage, rate?: number) => void;
  stop: () => void;
  pause: () => void;
  resume: () => void;
  reset: () => void;
}

export function useTTS(options: UseTTSOptions = {}): UseTTSReturn {
  const { mock = false, mockConfig } = options;

  const [state, setState] = React.useState<TTSState>('idle');
  const [isSupported, setIsSupported] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();
  const [availableVoices, setAvailableVoices] = React.useState<TTSVoiceInfo[]>([]);

  const providerRef = React.useRef<BrowserTTS | MockTTS | null>(null);

  React.useEffect(() => {
    const stateCallback = (s: TTSState) => {
      setState(s);
      if (s === 'error' || s === 'unavailable') {
        setErrorMessage(providerRef.current?.errorMessage);
      }
    };

    const provider = mock
      ? new MockTTS(stateCallback, mockConfig)
      : new BrowserTTS(stateCallback);

    providerRef.current = provider;
    React.startTransition(() => {
      setIsSupported(provider.isSupported);
      setState(provider.state);
      setAvailableVoices(provider.availableVoices);
    });

    return () => {
      provider.stop();
    };
  }, [mock]); // eslint-disable-line react-hooks/exhaustive-deps

  const speak = React.useCallback(
    (text: string, language: SupportedLanguage, rate?: number) => {
      setErrorMessage(undefined);
      providerRef.current?.speak(text, language, rate);
      // Refresh voices list after speak (may have loaded async)
      setAvailableVoices(providerRef.current?.availableVoices ?? []);
    },
    []
  );

  const stop = React.useCallback(() => providerRef.current?.stop(), []);
  const pause = React.useCallback(() => providerRef.current?.pause(), []);
  const resume = React.useCallback(() => providerRef.current?.resume(), []);
  const reset = React.useCallback(() => {
    providerRef.current?.reset();
    setState('idle');
    setErrorMessage(undefined);
  }, []);

  return {
    isSupported,
    state,
    isSpeaking: state === 'speaking',
    isPaused: state === 'paused',
    isUnavailable: state === 'unavailable',
    isError: state === 'error',
    errorMessage,
    availableVoices,
    speak,
    stop,
    pause,
    resume,
    reset,
  };
}
