'use client';

import * as React from 'react';
import { ChevronLeft, XCircle } from 'lucide-react';
import { Button } from '../ui/button';

export interface ConversationControlsProps {
  onBack?: () => void;
  onCancel: () => void;
  canGoBack: boolean;
  disabled?: boolean;
}

export const ConversationControls: React.FC<ConversationControlsProps> = ({
  onBack,
  onCancel,
  canGoBack,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-between w-full pt-8 animate-in fade-in duration-700">
      <div className="flex-1">
        {canGoBack && onBack && (
          <Button
            variant="outline"
            onClick={onBack}
            disabled={disabled}
            className="flex items-center gap-2 font-bold text-text-secondary min-h-[56px] px-6"
            aria-label="Go back to previous question"
          >
            <ChevronLeft className="h-5 w-5" />
            Back
          </Button>
        )}
      </div>

      <div className="flex-1 flex justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={disabled}
          className="flex items-center gap-2 text-text-secondary hover:text-error hover:underline text-sm font-semibold cursor-pointer disabled:opacity-50"
          aria-label="Cancel session"
        >
          <XCircle className="h-5 w-5" />
          Cancel Interview
        </button>
      </div>
    </div>
  );
};
