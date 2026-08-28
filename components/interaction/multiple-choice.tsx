'use client';

/**
 * MultipleChoice — kiosk-friendly single or multi-select option component.
 *
 * Reusable by any future clinical question screen.
 * Does not attach clinical meaning to any option value.
 */

import * as React from 'react';
import { Check } from 'lucide-react';

export interface ChoiceOption {
  id: string;
  label: string;
  value: string;
  disabled?: boolean;
}

export interface MultipleChoiceProps {
  options: ChoiceOption[];
  /** If true, multiple items can be selected */
  multi?: boolean;
  /** Selected value(s) */
  value?: string | string[];
  onChange: (value: string | string[]) => void;
  disabled?: boolean;
  /** aria-label for the group */
  label?: string;
}

export const MultipleChoice: React.FC<MultipleChoiceProps> = ({
  options,
  multi = false,
  value,
  onChange,
  disabled = false,
  label,
}) => {
  const selectedSet = React.useMemo<Set<string>>(() => {
    if (!value) return new Set();
    if (Array.isArray(value)) return new Set(value);
    return new Set([value]);
  }, [value]);

  const handleSelect = (optValue: string) => {
    if (disabled) return;
    if (multi) {
      const next = new Set(selectedSet);
      if (next.has(optValue)) {
        next.delete(optValue);
      } else {
        next.add(optValue);
      }
      onChange(Array.from(next));
    } else {
      onChange(optValue);
    }
  };

  return (
    <div role="group" aria-label={label ?? 'Select an option'} className="flex flex-col gap-3 w-full">
      {options.map((opt) => {
        const isSelected = selectedSet.has(opt.value);
        const isDisabled = disabled || opt.disabled;
        return (
          <button
            key={opt.id}
            type="button"
            role={multi ? 'checkbox' : 'radio'}
            aria-checked={isSelected}
            aria-disabled={isDisabled}
            disabled={isDisabled}
            onClick={() => handleSelect(opt.value)}
            className={[
              'flex items-center gap-4 w-full text-left px-5 py-4 rounded-xl border-2 transition-all min-h-[60px] cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
              isSelected
                ? 'border-primary bg-primary-pale text-primary font-bold shadow-sm'
                : 'border-border-light bg-white text-text-main hover:border-primary/40 hover:bg-primary-pale/40',
              isDisabled ? 'opacity-50 pointer-events-none' : '',
            ].join(' ')}
          >
            <span
              className={[
                'h-6 w-6 rounded flex items-center justify-center shrink-0 border-2 transition-all',
                multi ? 'rounded-md' : 'rounded-full',
                isSelected
                  ? 'border-primary bg-primary text-white'
                  : 'border-border-strong bg-white',
              ].join(' ')}
              aria-hidden="true"
            >
              {isSelected && <Check className="h-4 w-4" />}
            </span>
            <span className="text-base leading-snug flex-1">{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
};
