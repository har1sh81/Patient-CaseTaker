'use client';

/**
 * OnScreenKeyboard — kiosk-friendly virtual keyboard.
 *
 * Supports: letters, numbers, space, backspace, clear.
 * Architecture supports future multilingual layouts — layout prop accepts any char matrix.
 * No Tamil/Hindi native IME required; browser handles native input.
 */

import * as React from 'react';
import { Delete } from 'lucide-react';

export interface OnScreenKeyboardProps {
  onKey: (key: string) => void;
  onBackspace: () => void;
  onClear: () => void;
  onConfirm?: () => void;
  disabled?: boolean;
  /** Override the keyboard layout rows */
  layout?: string[][];
}

const DEFAULT_LAYOUT: string[][] = [
  ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
  ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
  ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
  ['Z', 'X', 'C', 'V', 'B', 'N', 'M'],
];

export const OnScreenKeyboard: React.FC<OnScreenKeyboardProps> = ({
  onKey,
  onBackspace,
  onClear,
  onConfirm,
  disabled = false,
  layout = DEFAULT_LAYOUT,
}) => {
  const baseKey =
    'flex items-center justify-center rounded-lg border border-border-light bg-white text-text-main font-semibold text-sm min-h-[48px] min-w-[36px] px-2 transition-all active:scale-95 hover:bg-primary-pale hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer disabled:opacity-50 disabled:pointer-events-none';

  return (
    <div
      role="group"
      aria-label="On-screen keyboard"
      className="flex flex-col gap-2 w-full select-none"
    >
      {layout.map((row, ri) => (
        <div key={ri} className="flex justify-center gap-1.5 flex-wrap">
          {row.map((key) => (
            <button
              key={key}
              type="button"
              aria-label={key}
              disabled={disabled}
              onClick={() => onKey(key)}
              className={baseKey}
            >
              {key}
            </button>
          ))}
        </div>
      ))}

      {/* Control row */}
      <div className="flex gap-2 mt-1">
        {/* Space */}
        <button
          type="button"
          aria-label="Space"
          disabled={disabled}
          onClick={() => onKey(' ')}
          className={`${baseKey} flex-1 text-text-muted text-xs`}
        >
          SPACE
        </button>

        {/* Backspace */}
        <button
          type="button"
          aria-label="Backspace"
          disabled={disabled}
          onClick={onBackspace}
          className={`${baseKey} text-error hover:bg-error-light hover:border-error/30 px-4`}
        >
          <Delete className="h-4 w-4" />
        </button>

        {/* Clear */}
        <button
          type="button"
          aria-label="Clear all"
          disabled={disabled}
          onClick={onClear}
          className={`${baseKey} text-text-secondary hover:text-error hover:bg-error-light px-4 text-xs font-bold`}
        >
          CLR
        </button>

        {/* Optional confirm */}
        {onConfirm && (
          <button
            type="button"
            aria-label="Confirm"
            disabled={disabled}
            onClick={onConfirm}
            className="flex items-center justify-center px-5 rounded-lg bg-primary text-white font-bold text-sm min-h-[48px] hover:bg-primary-hover active:scale-95 transition-all cursor-pointer disabled:opacity-50"
          >
            OK
          </button>
        )}
      </div>
    </div>
  );
};
