import * as React from 'react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className = '', label, options, error, helperText, required, disabled, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-semibold text-text-main flex items-center gap-1 select-none">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}
        <div className="relative w-full">
          <select
            ref={ref}
            disabled={disabled}
            className={`w-full min-h-[48px] px-4 pr-10 rounded-lg border text-base text-text-main bg-white transition-all appearance-none cursor-pointer
              focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-light
              disabled:bg-surface-muted disabled:text-text-disabled disabled:border-border-light disabled:cursor-not-allowed
              ${error ? 'border-error bg-error-light focus:border-error focus:ring-error/10' : 'border-border-light hover:border-border-strong'}
              ${className}`}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          <div className="absolute top-1/2 right-4 -translate-y-1/2 pointer-events-none text-text-secondary">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        {error && <p className="text-xs font-medium text-error select-none">{error}</p>}
        {!error && helperText && <p className="text-xs text-text-secondary select-none">{helperText}</p>}
      </div>
    );
  }
);
Select.displayName = 'Select';
