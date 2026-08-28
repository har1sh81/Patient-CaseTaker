'use client';

/**
 * useSpeechRecognition — React hook wrapping a SpeechRecognitionProvider.
 *
 * Provides React state for all provider properties.
 * Handles cleanup on unmount (stops active recognition).
 *
 * Usage:
 *   const sr = useSpeechRecognition({ mock: false });
 *   sr.startListening('en');
 *
 * Privacy: raw audio is never stored. Only text transcripts are kept.
 * Cleanup: recognition is stopped on unmount and when stopOnUnmount is called.
 */

import * as React from 'react';
import type { SpeechRecognitionState, SpeechRecognitionErrorType } from '../types';
import type { SpeechRecognitionResult } from '../lib/voice/speech-recognition.provider';
import type { SupportedLanguage } from '../lib/kiosk/translation';
import { BrowserSpeechRecognition } from '../lib/voice/browser-speech-recognition';
import { MockSpeechRecognition, type MockSpeechConfig } from '../lib/voice/mock-speech-recognition';

export interface UseSpeechRecognitionOptions {
  /** Use mock provider (for demos) — defaults to false */
  mock?: boolean;
  /** Mock config if mock === true */
  mockConfig?: Partial<MockSpeechConfig>;
}

export interface UseSpeechRecognitionReturn {
  isSupported: boolean;
  state: SpeechRecognitionState;
  result: SpeechRecognitionResult;
  errorType?: SpeechRecognitionErrorType;
  errorMessage?: string;
  isListening: boolean;
  isProcessing: boolean;
  isDone: boolean;
  isError: boolean;
  isDenied: boolean;
  isUnavailable: boolean;
  startListening: (language: SupportedLanguage) => Promise<void>;
  stopListening: () => void;
  cancelListening: () => void;
  reset: () => void;
}

export function useSpeechRecognition(
  options: UseSpeechRecognitionOptions = {}
): UseSpeechRecognitionReturn {
  const { mock = false, mockConfig } = options;

  const [state, setState] = React.useState<SpeechRecognitionState>('idle');
  const [isSupported, setIsSupported] = React.useState(false);
  const [result, setResult] = React.useState<SpeechRecognitionResult>({
    transcript: '',
    finalTranscript: '',
    interimTranscript: '',
  });
  const [errorType, setErrorType] = React.useState<SpeechRecognitionErrorType | undefined>();
  const [errorMessage, setErrorMessage] = React.useState<string | undefined>();

  // Provider is stable across renders — kept in a ref
  const providerRef = React.useRef<BrowserSpeechRecognition | MockSpeechRecognition | null>(null);

  React.useEffect(() => {
    const provider = mock
      ? new MockSpeechRecognition(setState, setResult, (type, msg) => {
          setErrorType(type);
          setErrorMessage(msg);
        }, mockConfig)
      : new BrowserSpeechRecognition(setState, setResult, (type, msg) => {
          setErrorType(type);
          setErrorMessage(msg);
        });
    providerRef.current = provider;
    React.startTransition(() => {
      setIsSupported(provider.isSupported);
      setState(provider.state);
    });

    return () => {
      // Cleanup on unmount — stop any active recognition
      provider.cancelListening();
    };
  // mockConfig is intentionally excluded: config updates are handled by the separate effect below
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mock]);

  // Update mock config if it changes without re-creating the provider
  React.useEffect(() => {
    if (mock && mockConfig && providerRef.current instanceof MockSpeechRecognition) {
      providerRef.current.setConfig(mockConfig);
    }
  }, [mock, mockConfig]);

  const startListening = React.useCallback(async (language: SupportedLanguage) => {
    if (providerRef.current) {
      setErrorType(undefined);
      setErrorMessage(undefined);
      await providerRef.current.startListening(language);
    }
  }, []);

  const stopListening = React.useCallback(() => {
    providerRef.current?.stopListening();
  }, []);

  const cancelListening = React.useCallback(() => {
    providerRef.current?.cancelListening();
  }, []);

  const reset = React.useCallback(() => {
    providerRef.current?.reset();
    setResult({ transcript: '', finalTranscript: '', interimTranscript: '' });
    setErrorType(undefined);
    setErrorMessage(undefined);
    setState('idle');
  }, []);

  return {
    isSupported,
    state,
    result,
    errorType,
    errorMessage,
    isListening: state === 'listening',
    isProcessing: state === 'processing' || state === 'requesting',
    isDone: state === 'done',
    isError: state === 'error',
    isDenied: state === 'denied',
    isUnavailable: state === 'unavailable',
    startListening,
    stopListening,
    cancelListening,
    reset,
  };
}
