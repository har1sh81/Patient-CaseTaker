'use client';

import * as React from 'react';
import { Volume2, Square, Pause, Play } from 'lucide-react';
import { Question } from '../../types';
import type { SupportedLanguage } from '../../lib/kiosk/translation';
import { useTTS } from '../../hooks/use-tts';

export interface QuestionCardProps {
  question: Question;
  language: SupportedLanguage;
  children: React.ReactNode;
  disabled?: boolean;
}

export const QuestionCard: React.FC<QuestionCardProps> = ({
  question,
  language,
  children,
  disabled = false,
}) => {
  const tts = useTTS();
  const text = question.question[language] || question.question.en;
  const helpText = question.helpText?.[language] || question.helpText?.en;

  // Auto-play TTS on mount if supported (optional based on UX design)
  // For now, let's make it manual via the button, or auto-play. Let's do manual to avoid annoyance in testing.

  return (
    <div className="w-full flex flex-col gap-8 bg-white rounded-3xl shadow-sm border border-border-light p-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* Header: Text + TTS Controls */}
      <div className="flex flex-col md:flex-row gap-6 md:items-start justify-between border-b border-border-light pb-6">
        <div className="flex-1">
          <h2 className="text-3xl font-black text-text-main leading-tight tracking-tight">
            {text}
          </h2>
          {helpText && (
            <p className="mt-2 text-text-secondary text-lg">
              {helpText}
            </p>
          )}
        </div>

        {/* TTS Controls */}
        <div className="shrink-0 flex items-center gap-2">
          {!tts.isSpeaking && !tts.isPaused ? (
            <button
              type="button"
              onClick={() => tts.speak(text, language)}
              disabled={disabled || tts.isUnavailable || !tts.isSupported}
              aria-label="Read question aloud"
              className="flex items-center justify-center w-14 h-14 rounded-full bg-primary-pale text-primary hover:bg-primary hover:text-white transition-all disabled:opacity-50"
            >
              <Volume2 className="h-6 w-6" />
            </button>
          ) : (
            <>
              {tts.isSpeaking ? (
                <button
                  type="button"
                  onClick={tts.pause}
                  aria-label="Pause reading"
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white hover:bg-primary-hover transition-all"
                >
                  <Pause className="h-6 w-6" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={tts.resume}
                  aria-label="Resume reading"
                  className="flex items-center justify-center w-14 h-14 rounded-full bg-primary text-white hover:bg-primary-hover transition-all"
                >
                  <Play className="h-6 w-6" />
                </button>
              )}
              <button
                type="button"
                onClick={tts.stop}
                aria-label="Stop reading"
                className="flex items-center justify-center w-14 h-14 rounded-full bg-surface-muted text-text-secondary hover:bg-error hover:text-white transition-all"
              >
                <Square className="h-5 w-5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Input Area */}
      <div className="w-full pt-4">
        {children}
      </div>
      
    </div>
  );
};
