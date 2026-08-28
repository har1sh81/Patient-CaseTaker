import * as React from 'react';
import { Check } from 'lucide-react';

export interface CheckboxProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className = '', label, error, checked, disabled, onChange, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1 w-full">
        <label className={`flex items-start gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
          <div className="relative flex items-center justify-center mt-0.5">
            <input
              ref={ref}
              type="checkbox"
              checked={checked}
              disabled={disabled}
              onChange={onChange}
              className="sr-only peer"
              {...props}
            />
            <div className={`h-6 w-6 rounded border transition-all flex items-center justify-center
              peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2
              ${checked 
                ? 'bg-primary border-primary text-white' 
                : 'bg-white border-border-light hover:border-border-strong'}
              ${error ? 'border-error bg-error-light' : ''}
              ${className}`}
            >
              {checked && <Check className="h-4.5 w-4.5 stroke-[3px]" />}
            </div>
          </div>
          {label && (
            <span className="text-base font-medium text-text-main leading-6 select-none">
              {label}
            </span>
          )}
        </label>
        {error && <p className="text-xs font-medium text-error select-none ml-9">{error}</p>}
      </div>
    );
  }
);
Checkbox.displayName = 'Checkbox';
