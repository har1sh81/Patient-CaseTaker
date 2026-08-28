import * as React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'standard' | 'elevated' | 'outline' | 'interactive' | 'selected' | 'alert' | 'emptyState';
  selected?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className = '', variant = 'standard', selected, children, ...props }, ref) => {
    const baseStyles = 'rounded-xl border transition-all duration-150 overflow-hidden';
    
    const variants = {
      standard: 'bg-white border-border-light shadow-sm',
      elevated: 'bg-white border-border-light shadow-md',
      outline: 'bg-transparent border-border-light',
      interactive: 'bg-white border-border-light hover:border-primary hover:bg-primary-pale hover:shadow-sm cursor-pointer select-none active:scale-[0.99] focus-visible:outline-2 focus-visible:outline-primary',
      selected: 'bg-primary-light border-primary text-primary-hover shadow-sm select-none',
      alert: 'bg-warning-light border-warning-border text-warning',
      emptyState: 'bg-transparent border-dashed border-border-strong text-center py-12 px-6',
    };

    const activeVariant = selected ? 'selected' : variant;
    const variantClass = variants[activeVariant];

    return (
      <div
        ref={ref}
        className={`${baseStyles} ${variantClass} ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);
Card.displayName = 'Card';
