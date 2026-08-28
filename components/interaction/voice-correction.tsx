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
import { CheckCircle, Pencil, RefreshCw, Keyboard } from 'lucide-react';
import { Button } from '../ui/button';

export interface VoiceCorrectionProps {
  transcript: string;
  onAccept: (finalText: string) => void;
  onRetryVoice: () => void;
  onSwitchToTouch: () => void;
  disabled?: boolean;
}

export const VoiceCorrection: React.FC<VoiceCorrectionProps> = ({
  transcript,
  onAccept,
  onRetryVoice,
  onSwitchToTouch,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editedText, setEditedText] = React.useState(transcript);

  // Sync edited text if parent updates transcript (e.g. on retry)
  React.useEffect(() => {
    React.startTransition(() => {
      setEditedText(transcript);
      setIsEditing(false);
    });
  }, [transcript]);

  const handleAccept = () => {
    onAccept(isEditing ? editedText : transcript);
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Transcript display / edit area */}
      <div className="rounded-xl border border-border-light bg-surface-muted p-4">
        <p className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2">
          We heard:
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
