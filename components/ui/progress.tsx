import * as React from 'react';

export interface ProgressProps extends React.HTMLAttributes<HTMLDivElement> {
  value: number; // 0 to 100
}

export const Progress: React.FC<ProgressProps> = ({
  className = '',
  value = 0,
  ...props
}) => {
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div
      className={`h-3 w-full bg-border-light rounded-full overflow-hidden ${className}`}
      role="progressbar"
      aria-valuenow={percentage}
      aria-valuemin={0}
      aria-valuemax={100}
      {...props}
    >
      <div
        className="h-full bg-primary rounded-full transition-all duration-300 ease-out"
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
};
