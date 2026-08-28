import * as React from 'react';
import { Loader2 } from 'lucide-react';

export interface SpinnerProps extends React.HTMLAttributes<HTMLDivElement> {
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export const Spinner: React.FC<SpinnerProps> = ({
  className = '',
  size = 'md',
  ...props
}) => {
  const sizes = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
    xl: 'h-16 w-16',
  };

  return (
    <div className={`flex items-center justify-center ${className}`} {...props}>
      <Loader2 className={`animate-spin text-primary ${sizes[size]}`} />
    </div>
  );
};
