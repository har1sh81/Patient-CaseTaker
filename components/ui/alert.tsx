import * as React from 'react';
import { 
  Info, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle,
  AlertCircle
} from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error' | 'priority';
  title: string;
}

export const Alert: React.FC<AlertProps> = ({
  className = '',
  variant = 'info',
  title,
  children,
  ...props
}) => {
  const baseStyles = 'flex gap-3 p-4 rounded-xl border select-none';

  const icons = {
    info: <Info className="h-5.5 w-5.5 text-information flex-shrink-0 mt-0.5" />,
    success: <CheckCircle2 className="h-5.5 w-5.5 text-success flex-shrink-0 mt-0.5" />,
    warning: <AlertTriangle className="h-5.5 w-5.5 text-warning flex-shrink-0 mt-0.5" />,
    error: <XCircle className="h-5.5 w-5.5 text-error flex-shrink-0 mt-0.5" />,
    priority: <AlertCircle className="h-5.5 w-5.5 text-priority flex-shrink-0 mt-0.5" />,
  };

  const variants = {
    info: 'bg-information-light border-information-border text-text-main',
    success: 'bg-success-light border-success-border text-text-main',
    warning: 'bg-warning-light border-warning-border text-text-main',
    error: 'bg-error-light border-error-border text-text-main',
    priority: 'bg-priority-light border-priority-border text-text-main',
  };

  return (
    <div className={`${baseStyles} ${variants[variant]} ${className}`} {...props}>
      {icons[variant]}
      <div className="flex flex-col gap-1 flex-1">
        <h5 className="font-bold text-base leading-6 text-text-main">
          {title}
        </h5>
        {children && (
          <div className="text-sm text-text-secondary leading-5">
            {children}
          </div>
        )}
      </div>
    </div>
  );
};
