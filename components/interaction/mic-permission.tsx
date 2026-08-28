'use client';

/**
 * MicPermission — Microphone permission UX component.
 *
 * Renders a clear, accessible status for each microphone permission state.
 * Touch input alternative is always shown when mic is denied/unavailable.
 */

import * as React from 'react';
import { Mic, MicOff, ShieldAlert, AlertTriangle, Loader2 } from 'lucide-react';
import type { SpeechRecognitionState } from '../../types';

interface MicPermissionProps {
  state: SpeechRecognitionState;
  errorMessage?: string;
  onRequestPermission: () => void;
  onUseTouchInstead: () => void;
}

export const MicPermission: React.FC<MicPermissionProps> = ({
  state,
  errorMessage,
  onRequestPermission,
  onUseTouchInstead,
}) => {
  if (state === 'idle' || state === 'done') return null;

  const configs: Record<string, { icon: React.ReactNode; title: string; desc: string; color: string }> = {
    requesting: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-primary" />,
      title: 'Requesting microphone access...',
      desc: 'Please allow microphone access in the browser prompt.',
      color: 'bg-primary-pale border-primary/20',
    },
    listening: {
      icon: <Mic className="h-8 w-8 text-primary animate-pulse" />,
      title: 'Microphone is active',
      desc: 'Speak clearly and we will capture your response.',
      color: 'bg-primary-pale border-primary/20',
    },
    processing: {
      icon: <Loader2 className="h-8 w-8 animate-spin text-clinical-blue" />,
      title: 'Processing your response...',
      desc: 'Please wait while your speech is being converted to text.',
      color: 'bg-information-light border-information-border',
    },
    denied: {
      icon: <ShieldAlert className="h-8 w-8 text-error" />,
      title: 'Microphone access was denied',
      desc: 'To use voice input, please allow microphone access in your browser or device settings. You can always continue using touch input instead.',
      color: 'bg-error-light border-error-border',
    },
    unavailable: {
      icon: <MicOff className="h-8 w-8 text-text-muted" />,
      title: 'Voice input is not available',
      desc: 'Your browser does not support speech recognition. Please use touch or keyboard input to answer questions.',
      color: 'bg-surface-muted border-border-light',
    },
    error: {
      icon: <AlertTriangle className="h-8 w-8 text-warning" />,
      title: 'Voice input error',
      desc: errorMessage ?? 'An error occurred. Please try again or switch to touch input.',
      color: 'bg-warning-light border-warning-border',
    },
  };

  const cfg = configs[state];
  if (!cfg) return null;

  const showRetry = state === 'denied' || state === 'error';
  const showTouchFallback = state === 'denied' || state === 'unavailable' || state === 'error';

  return (
    <div
      role="status"
      aria-live="polite"
      className={`rounded-xl border p-5 flex gap-4 items-start ${cfg.color}`}
    >
      <div className="shrink-0 mt-0.5">{cfg.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-text-main text-sm">{cfg.title}</p>
        <p className="text-xs text-text-secondary mt-1 leading-5">{cfg.desc}</p>
        {(showRetry || showTouchFallback) && (
          <div className="flex flex-wrap gap-2 mt-3">
            {showRetry && (
              <button
                type="button"
                onClick={onRequestPermission}
                className="text-xs font-bold text-primary underline cursor-pointer hover:opacity-80"
              >
                Try again
              </button>
            )}
            {showTouchFallback && (
              <button
                type="button"
                onClick={onUseTouchInstead}
                className="text-xs font-bold text-text-secondary underline cursor-pointer hover:text-text-main"
              >
                Use touch input instead
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
