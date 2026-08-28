import * as React from 'react';

export interface RadioOption {
  value: string;
  label: string;
}

export interface RadioGroupProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'onChange'> {
  label?: string;
  options: RadioOption[];
  value?: string;
  name: string;
  error?: string;
  onChange?: (value: string) => void;
  disabled?: boolean;
}

export const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>(
  ({ className = '', label, options, value, name, error, onChange, disabled, ...props }, ref) => {
    return (
      <div ref={ref} className="flex flex-col gap-2 w-full" {...props}>
        {label && (
          <span className="text-sm font-semibold text-text-main select-none mb-1">
            {label}
          </span>
        )}
        <div className={`flex flex-col gap-3 ${className}`}>
          {options.map((opt) => {
            const isSelected = value === opt.value;
            return (
              <label
                key={opt.value}
                className={`flex items-center gap-3 cursor-pointer select-none ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <div className="relative flex items-center justify-center">
                  <input
                    type="radio"
                    name={name}
                    value={opt.value}
                    checked={isSelected}
                    disabled={disabled}
                    onChange={() => onChange?.(opt.value)}
                    className="sr-only peer"
                  />
                  <div className={`h-6 w-6 rounded-full border transition-all flex items-center justify-center
                    peer-focus-visible:outline-2 peer-focus-visible:outline-primary peer-focus-visible:outline-offset-2
                    ${isSelected 
                      ? 'border-primary' 
                      : 'border-border-light hover:border-border-strong bg-white'}
                    ${error ? 'border-error bg-error-light' : ''}`}
                  >
                    {isSelected && (
                      <div className="h-3 w-3 rounded-full bg-primary" />
                    )}
                  </div>
                </div>
                <span className="text-base font-medium text-text-main">
                  {opt.label}
                </span>
              </label>
            );
          })}
        </div>
        {error && <p className="text-xs font-medium text-error select-none">{error}</p>}
      </div>
    );
  }
);
RadioGroup.displayName = 'RadioGroup';
