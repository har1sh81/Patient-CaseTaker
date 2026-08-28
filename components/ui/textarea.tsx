import * as React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
  required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className = '', label, error, helperText, required, disabled, ...props }, ref) => {
    return (
      <div className="flex flex-col gap-1.5 w-full">
        {label && (
          <label className="text-sm font-semibold text-text-main flex items-center gap-1 select-none">
            {label}
            {required && <span className="text-error">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          disabled={disabled}
          className={`w-full min-h-[96px] py-3 px-4 rounded-lg border text-base text-text-main bg-white transition-all resize-none
            placeholder:text-text-muted focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary-light
            disabled:bg-surface-muted disabled:text-text-disabled disabled:border-border-light
            ${error ? 'border-error bg-error-light focus:border-error focus:ring-error/10' : 'border-border-light hover:border-border-strong'}
            ${className}`}
          {...props}
        />
        {error && <p className="text-xs font-medium text-error select-none">{error}</p>}
        {!error && helperText && <p className="text-xs text-text-secondary select-none">{helperText}</p>}
      </div>
    );
  }
);
Textarea.displayName = 'Textarea';
