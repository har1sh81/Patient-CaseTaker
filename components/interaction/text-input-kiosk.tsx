'use client';

/**
 * TextInputKiosk — large, accessible text input for kiosk use.
 * Includes optional on-screen keyboard integration.
 *
 * No clinical validation is performed here.
 */

import * as React from 'react';
import { X, Check } from 'lucide-react';
import { OnScreenKeyboard } from './on-screen-keyboard';

export interface TextInputKioskProps {
  value: string;
  onChange: (value: string) => void;
  onConfirm?: (value: string) => void;
  placeholder?: string;
  label?: string;
  showKeyboard?: boolean;
  maxLength?: number;
  disabled?: boolean;
}

export const TextInputKiosk: React.FC<TextInputKioskProps> = ({
  value,
  onChange,
  onConfirm,
  placeholder = 'Type your answer here...',
  label,
  showKeyboard = false,
  maxLength,
  disabled = false,
}) => {
  const [keyboardVisible, setKeyboardVisible] = React.useState(showKeyboard);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  const handleKey = (key: string) => {
    if (disabled) return;
    if (maxLength && value.length >= maxLength) return;
    onChange(value + key);
  };

  const handleBackspace = () => {
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
    inputRef.current?.focus();
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {label && (
        <p className="text-sm font-bold text-text-secondary">{label}</p>
      )}

      {/* Text area */}
      <div className="relative">
        <textarea
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setKeyboardVisible(true)}
          placeholder={placeholder}
          disabled={disabled}
          maxLength={maxLength}
          rows={3}
          aria-label={label ?? 'Text input'}
          className="w-full rounded-xl border-2 border-border-light bg-white px-5 py-4 text-base text-text-main resize-none focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all disabled:opacity-50 disabled:bg-surface-muted"
        />
        {value && (
          <button
            type="button"
            aria-label="Clear text"
            onClick={handleClear}
            disabled={disabled}
            className="absolute top-3 right-3 text-text-muted hover:text-error cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {maxLength && (
        <p className="text-xs text-text-muted text-right">{value.length}/{maxLength}</p>
      )}

      {/* On-screen keyboard */}
      {keyboardVisible && (
        <OnScreenKeyboard
          onKey={handleKey}
          onBackspace={handleBackspace}
          onClear={handleClear}
          onConfirm={onConfirm ? () => onConfirm(value) : undefined}
          disabled={disabled}
        />
      )}

      {/* Confirm button (when no keyboard confirm) */}
      {onConfirm && !keyboardVisible && (
        <button
          type="button"
          onClick={() => onConfirm(value)}
          disabled={disabled || !value.trim()}
          className="flex items-center justify-center gap-2 w-full rounded-xl bg-primary text-white font-bold text-lg min-h-[56px] hover:bg-primary-hover transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Check className="h-5 w-5" />
          Confirm
        </button>
      )}
    </div>
  );
};
