import * as React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'success' | 'kioskLarge';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', size = 'md', isLoading, disabled, children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium rounded-lg transition-all focus-visible:outline-2 focus-visible:outline-offset-2 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50 select-none cursor-pointer duration-150';
    
    const variants = {
      primary: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover focus-visible:outline-primary shadow-sm',
      secondary: 'bg-white text-primary border border-primary hover:bg-primary-pale active:bg-primary-light focus-visible:outline-primary',
      outline: 'bg-transparent text-text-secondary border border-border-light hover:bg-surface-muted active:bg-border-light focus-visible:outline-primary',
      ghost: 'bg-transparent text-text-secondary hover:bg-surface-muted active:bg-border-light focus-visible:outline-primary',
      destructive: 'bg-error text-white hover:bg-red-800 active:bg-red-800 focus-visible:outline-error',
      success: 'bg-success text-white hover:bg-green-800 active:bg-green-800 focus-visible:outline-success',
      kioskLarge: 'bg-primary text-white hover:bg-primary-hover active:bg-primary-hover text-lg py-5 px-8 rounded-xl shadow-md min-h-[64px] font-semibold tracking-wide w-full focus-visible:outline-primary',
    };

    const sizes = {
      sm: 'text-sm py-1.5 px-3 min-h-[36px]',
      md: 'text-base py-2.5 px-5 min-h-[44px]',
      lg: 'text-lg py-3 px-6 min-h-[52px]',
      xl: 'text-xl py-4.5 px-8 min-h-[60px]',
    };

    const variantClass = variants[variant];
    const sizeClass = variant === 'kioskLarge' ? '' : sizes[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantClass} ${sizeClass} ${className}`}
        {...props}
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            <span>Loading...</span>
          </>
        ) : (
          children
        )}
      </button>
    );
  }
);
Button.displayName = 'Button';
