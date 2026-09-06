'use client';

/**
 * VoiceCorrection — post-transcript correction flow.
 *
 * After a voice transcript is finalized, the patient can:
 * - Accept the answer as-is
 * - Edit the text
 * - Clear and retry by voice
 * - Switch to touch input
 *
 * No clinical validation is performed here.
 */

import * as React from 'react';
import { CheckCircle, Pencil, RefreshCw, Keyboard, Globe } from 'lucide-react';
import { Button } from '../ui/button';
import { Spinner } from '../ui/spinner';
import { translatePatientText } from '../../lib/translation/indictrans-client';

export interface VoiceCorrectionProps {
  transcript: string;
  language?: string;
  onAccept: (finalText: string) => void;
  onRetryVoice: () => void;
  onSwitchToTouch: () => void;
  disabled?: boolean;
}

export const VoiceCorrection: React.FC<VoiceCorrectionProps> = ({
  transcript,
  language = 'en',
  onAccept,
  onRetryVoice,
  onSwitchToTouch,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState(transcript);
  const [translatedText, setTranslatedText] = React.useState<string | null>(null);
  const [isTranslating, setIsTranslating] = React.useState(false);

  const textToTranslate = isEditing ? editedText : transcript;

  const cacheRef = React.useRef<Record<string, string>>({});

  // Sync edited text
  React.useEffect(() => {
    React.startTransition(() => {
      setEditedText(transcript);
      setIsEditing(false);
    });
  }, [transcript]);

  // Fetch translation with debouncing and memory caching
  React.useEffect(() => {
    if (!language || language === 'en' || !textToTranslate.trim()) {
      setTranslatedText(null);
      return;
    }

    const cacheKey = `${language}:${textToTranslate.trim()}`;
    if (cacheRef.current[cacheKey]) {
      setTranslatedText(cacheRef.current[cacheKey]);
      setIsTranslating(false);
      return;
    }

    let isSubscribed = true;
    setIsTranslating(true);

    const timer = setTimeout(() => {
      translatePatientText({
        patientText: textToTranslate,
        sourceLanguage: language,
        targetLanguage: 'eng_Latn',
      })
        .then((res) => {
          if (isSubscribed) {
            if (res.success && res.translatedText) {
              cacheRef.current[cacheKey] = res.translatedText;
              setTranslatedText(res.translatedText);
            } else {
              setTranslatedText(null);
            }
          }
        })
        .catch((err) => {
          console.warn('[VoiceCorrection] Live translation preview failed:', err);
          if (isSubscribed) setTranslatedText(null);
        })
        .finally(() => {
          if (isSubscribed) setIsTranslating(false);
        });
    }, 200);

    return () => {
      isSubscribed = false;
      clearTimeout(timer);
    };
  }, [textToTranslate, language]);

  const handleAccept = () => {
    onAccept(isEditing ? editedText : transcript);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Transcript display / edit area */}
      <div className="rounded-xl border border-border-light bg-surface-muted p-4">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          We heard ({language.toUpperCase()}):
        </p>
        {isEditing ? (
          <textarea
            value={editedText}
            onChange={(e) => setEditedText(e.target.value)}
            className="w-full bg-white border border-border-light rounded-lg p-3 text-base text-text-main resize-none min-h-[80px] focus:outline-none focus:ring-2 focus:ring-primary/40"
            aria-label="Edit transcript"
            autoFocus
          />
        ) : (
          <p className="text-base text-text-main font-medium leading-relaxed min-h-[40px]">
            &ldquo;{transcript}&rdquo;
          </p>
        )}

        {/* Live IndicTrans2 Translation Preview for Non-English Inputs */}
        {language !== 'en' && (
          <div className="mt-3 rounded-xl border border-primary/30 bg-primary/5 p-3.5 animate-in fade-in slide-in-from-top-1">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1.5">
                <Globe className="h-4 w-4 text-primary shrink-0" />
                <span className="text-xs font-bold text-primary uppercase tracking-wider">
                  AI Translation (IndicTrans2 → English)
                </span>
              </div>
              <span className="text-[10px] font-bold bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                Local AI
              </span>
            </div>
            {isTranslating ? (
              <div className="flex items-center gap-2 text-xs text-text-secondary py-1">
                <Spinner size="sm" />
                <span>Translating to English for doctor summary...</span>
              </div>
            ) : translatedText ? (
              <p className="text-base text-secondary font-bold leading-relaxed pt-0.5">
                &ldquo;{translatedText}&rdquo;
              </p>
            ) : (
              <p className="text-xs text-text-muted italic pt-0.5">
                Translation will be auto-generated for clinical history report.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="primary"
          size="lg"
          onClick={handleAccept}
          disabled={disabled || (isEditing && !editedText.trim())}
          className="min-h-[56px] font-bold flex items-center gap-2"
          aria-label="Accept transcript"
        >
          <CheckCircle className="h-5 w-5" />
          {isEditing ? 'Save edit' : 'Accept'}
        </Button>

        <Button
          variant="outline"
          size="lg"
          onClick={() => setIsEditing((e) => !e)}
          disabled={disabled}
          className="min-h-[56px] font-bold flex items-center gap-2"
          aria-label={isEditing ? 'Cancel edit' : 'Edit transcript'}
        >
          <Pencil className="h-5 w-5" />
          {isEditing ? 'Cancel' : 'Edit'}
        </Button>
      </div>

      <div className="flex justify-center gap-4 flex-wrap">
        <button
          type="button"
          onClick={onRetryVoice}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline cursor-pointer disabled:opacity-50"
          aria-label="Record answer again by voice"
        >
          <RefreshCw className="h-4 w-4" />
          Record again
        </button>
        <button
          type="button"
          onClick={onSwitchToTouch}
          disabled={disabled}
          className="flex items-center gap-1.5 text-sm font-semibold text-text-secondary hover:text-text-main cursor-pointer disabled:opacity-50"
          aria-label="Switch to keyboard or touch input"
        >
          <Keyboard className="h-4 w-4" />
          Type instead
        </button>
      </div>
    </div>
  );
};
