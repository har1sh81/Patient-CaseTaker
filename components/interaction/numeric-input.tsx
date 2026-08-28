'use client';

/**
 * NumericInput — kiosk-friendly numeric input with large on-screen keypad.
 *
 * Does not apply clinical ranges or interpretation.
 * min/max validation is purely structural (bounds checking).
 */

import * as React from 'react';
import { Delete, Check } from 'lucide-react';

export interface NumericInputProps {
  value?: number | null;
  onChange: (value: number | null) => void;
  onConfirm?: (value: number | null) => void;
  min?: number;
  max?: number;
  placeholder?: string;
  unit?: string;
  disabled?: boolean;
  label?: string;
}

export const NumericInput: React.FC<NumericInputProps> = ({
  value,
  onChange,
  onConfirm,
  min,
  max,
  placeholder = '—',
  unit,
  disabled = false,
  label,
}) => {
  const [raw, setRaw] = React.useState<string>(
    value !== null && value !== undefined ? String(value) : ''
  );

  React.useEffect(() => {
    React.startTransition(() => {
      setRaw(value !== null && value !== undefined ? String(value) : '');
    });
  }, [value]);

  const parsed = raw === '' ? null : Number(raw);
  const isInvalid =
    parsed !== null &&
    ((min !== undefined && parsed < min) || (max !== undefined && parsed > max));

  const handleKey = (key: string) => {
    if (disabled) return;
    if (key === 'CLEAR') {
      setRaw('');
      onChange(null);
      return;
    }
    if (key === 'BACK') {
      const next = raw.slice(0, -1);
      setRaw(next);
      onChange(next === '' ? null : Number(next));
      return;
    }
    if (key === '.' && raw.includes('.')) return;
    const next = raw + key;
    setRaw(next);
    const num = Number(next);
    if (!isNaN(num)) onChange(num);
  };

  const keys = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '.', '0', 'BACK'];

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {label && (
        <p className="text-sm font-bold text-text-secondary self-start">{label}</p>
      )}

      {/* Display */}
      <div
        className={[
          'w-full rounded-xl border-2 px-6 py-4 text-4xl font-bold text-center min-h-[80px] flex items-center justify-center transition-all',
          isInvalid
            ? 'border-error text-error bg-error-light'
            : raw
            ? 'border-primary text-secondary bg-white'
            : 'border-border-light text-text-disabled bg-surface-muted',
        ].join(' ')}
        aria-live="polite"
        aria-label={`Current value: ${raw || placeholder}`}
      >
        {raw || <span className="text-text-disabled text-2xl">{placeholder}</span>}
        {unit && raw && (
          <span className="text-text-secondary text-xl font-normal ml-2">{unit}</span>
        )}
      </div>

      {isInvalid && (
        <p className="text-xs text-error font-semibold" role="alert">
          {min !== undefined && max !== undefined
            ? `Value must be between ${min} and ${max}${unit ? ` ${unit}` : ''}.`
            : min !== undefined
            ? `Value must be at least ${min}${unit ? ` ${unit}` : ''}.`
            : `Value must be at most ${max}${unit ? ` ${unit}` : ''}.`}
        </p>
      )}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3 w-full max-w-xs">
        {keys.map((k) => (
          <button
            key={k}
            type="button"
            aria-label={k === 'BACK' ? 'Backspace' : k === 'CLEAR' ? 'Clear' : k}
            disabled={disabled}
            onClick={() => handleKey(k)}
            className={[
              'flex items-center justify-center rounded-xl border-2 border-border-light bg-white text-text-main font-bold text-xl min-h-[60px] transition-all active:scale-95 hover:bg-primary-pale hover:border-primary/30 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer',
              disabled ? 'opacity-50 pointer-events-none' : '',
              k === 'BACK' ? 'text-error hover:bg-error-light hover:border-error/30' : '',
            ].join(' ')}
          >
            {k === 'BACK' ? <Delete className="h-5 w-5" /> : k}
          </button>
        ))}
        {/* Clear full row */}
        <button
          type="button"
          aria-label="Clear all"
          disabled={disabled}
          onClick={() => handleKey('CLEAR')}
          className="col-span-3 flex items-center justify-center rounded-xl border-2 border-border-light bg-surface-muted text-text-secondary font-bold text-base min-h-[52px] hover:bg-error-light hover:border-error/30 hover:text-error transition-all active:scale-95 focus-visible:outline-2 focus-visible:outline-primary cursor-pointer disabled:opacity-50"
        >
          Clear
        </button>
      </div>

      {/* Confirm button */}
      {onConfirm && (
        <button
          type="button"
          aria-label="Confirm value"
          disabled={disabled || !raw || isInvalid}
          onClick={() => onConfirm(parsed)}
          className="flex items-center justify-center gap-2 w-full max-w-xs rounded-xl bg-primary text-white font-bold text-lg min-h-[56px] shadow-sm hover:bg-primary-hover transition-all disabled:opacity-50 disabled:pointer-events-none cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Check className="h-5 w-5" />
          Confirm
        </button>
      )}
    </div>
  );
};
