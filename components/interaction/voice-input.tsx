'use client';

/**
 * VoiceInput — reusable voice capture component.
 *
 * Provides: large mic button, listening animation, live + final transcript,
 * clear/reset, retry, stop, and switch-to-touch. Does not embed any clinical logic.
 *
 * Props are intentionally generic — no clinical questions or medical terms.
 */

import * as React from 'react';
import { Mic, MicOff, Square, RefreshCw, Keyboard } from 'lucide-react';
import type { SpeechRecognitionState } from '../../types';
import type { SpeechRecognitionResult } from '../../lib/voice/speech-recognition.provider';
import { MicPermission } from './mic-permission';

export interface VoiceInputProps {
  /** Current recognition state from useSpeechRecognition */
  state: SpeechRecognitionState;
  /** Current result from useSpeechRecognition */
  result: SpeechRecognitionResult;
  /** Error message from useSpeechRecognition */
  errorMessage?: string;
  /** Whether mic is supported */
  isSupported: boolean;
  /** Called when the patient presses the mic button to start */
  onStart: () => void;
  /** Called when the patient presses stop */
  onStop: () => void;
  /** Called when the patient cancels the current attempt */
  onCancel: () => void;
  /** Called when the patient wants to clear and retry */
  onRetry: () => void;
  /** Called when the patient switches to touch/text input */
  onSwitchToTouch: () => void;
  /** Optional placeholder shown before any transcript exists */
  placeholder?: string;
  /** Whether the component is disabled (e.g., during session cleanup) */
  disabled?: boolean;
}

const STATE_LABEL: Partial<Record<SpeechRecognitionState, string>> = {
  idle: 'Tap to speak',
  requesting: 'Requesting microphone...',
  listening: 'Listening — tap to stop',
  processing: 'Processing...',
  done: 'Tap to record again',
  error: 'Error — tap to retry',
};

export const VoiceInput: React.FC<VoiceInputProps> = ({
  state,
  result,
  errorMessage,
  isSupported,
  onStart,
  onStop,
  onCancel,
  onRetry,
  onSwitchToTouch,
  placeholder = 'Your spoken answer will appear here...',
  disabled = false,
}) => {
  const isListening = state === 'listening';
  const isProcessing = state === 'processing' || state === 'requesting';
  const isDone = state === 'done';
  const isError = state === 'error';
  const isDenied = state === 'denied';
  const isUnavailable = state === 'unavailable' || !isSupported;

  const showTranscriptArea = isDone || isListening || isProcessing;
  const showPermissionBlock = isProcessing || isDenied || isUnavailable || isError;

  const handleMicClick = () => {
    if (disabled) return;
    if (isListening) {
      onStop();
    } else if (isDone || isError) {
      onRetry();
    } else {
      onStart();
    }
  };

  const micButtonClass = [
    'relative flex items-center justify-center rounded-full transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-primary cursor-pointer',
    'w-28 h-28 shadow-lg',
    isListening
      ? 'bg-error text-white scale-110 shadow-error/40'
      : isDone
      ? 'bg-success text-white'
      : isError || isDenied || isUnavailable
      ? 'bg-surface-muted text-text-muted cursor-not-allowed'
      : 'bg-primary text-white hover:bg-primary-hover hover:scale-105 active:scale-100',
    disabled ? 'opacity-50 pointer-events-none' : '',
  ].join(' ');

  return (
    <div className="flex flex-col items-center gap-6 w-full">
      {/* Mic Button */}
      <div className="relative">
        {/* Pulse ring when listening */}
        {isListening && (
          <>
            <span className="absolute inset-0 rounded-full bg-error/20 animate-ping" />
            <span className="absolute inset-[-8px] rounded-full border-2 border-error/30 animate-pulse" />
          </>
        )}
        <button
          type="button"
          aria-label={isListening ? 'Stop recording' : 'Start voice recording'}
          aria-pressed={isListening}
          aria-disabled={disabled || isDenied || isUnavailable}
          className={micButtonClass}
          onClick={handleMicClick}
        >
          {isProcessing ? (
            <svg className="h-10 w-10 animate-spin text-primary" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
          ) : isDenied || isUnavailable ? (
            <MicOff className="h-10 w-10" />
          ) : (
            <Mic className="h-10 w-10" />
          )}
        </button>
      </div>

      {/* State label */}
      <p className="text-sm font-semibold text-text-secondary text-center" aria-live="polite">
        {STATE_LABEL[state] ?? 'Ready'}
      </p>

      {/* Permission / error block */}
      {showPermissionBlock && (
        <div className="w-full">
          <MicPermission
            state={state}
            errorMessage={errorMessage}
            onRequestPermission={onRetry}
            onUseTouchInstead={onSwitchToTouch}
          />
        </div>
      )}

      {/* Transcript display */}
      {showTranscriptArea && (
        <div
          role="region"
          aria-label="Voice transcript"
          className="w-full bg-surface-muted rounded-xl border border-border-light p-4 min-h-[80px] text-text-main text-base leading-relaxed relative"
        >
          {result.interimTranscript && (
            <span className="text-text-muted italic">{result.interimTranscript}</span>
          )}
          {result.finalTranscript && (
            <span className="font-medium">{result.finalTranscript}</span>
          )}
          {!result.transcript && (
            <span className="text-text-disabled italic text-sm">{placeholder}</span>
          )}
        </div>
      )}

      {/* Action row */}
      {isDone && (
        <div className="flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer"
            aria-label="Record again"
          >
            <RefreshCw className="h-4 w-4" />
            Record again
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 text-sm font-semibold text-error hover:underline cursor-pointer"
            aria-label="Clear response"
          >
            <Square className="h-4 w-4" />
            Clear
          </button>
          <button
            type="button"
            onClick={onSwitchToTouch}
            className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-main cursor-pointer"
            aria-label="Switch to text input"
          >
            <Keyboard className="h-4 w-4" />
            Type instead
          </button>
        </div>
      )}

      {/* Always offer touch input */}
      {(state === 'idle' || isError || isDenied || isUnavailable) && !isDone && (
        <button
          type="button"
          onClick={onSwitchToTouch}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-main underline cursor-pointer"
        >
          <Keyboard className="h-4 w-4" />
          Use keyboard / touch instead
        </button>
      )}
    </div>
  );
};
