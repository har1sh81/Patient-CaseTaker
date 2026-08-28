import * as React from 'react';
import { 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Info,
  Clock,
  Loader2
} from 'lucide-react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'pending' | 'active' | 'completed' | 'processing' | 'uploaded' | 'failed' | 'requires_review' | 'confirmed' | 'expired' | 'cancelled' | 'info' | 'ayush';
}

export const Badge: React.FC<BadgeProps> = ({
  className = '',
  variant = 'info',
  children,
  ...props
}) => {
  const baseStyles = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none border w-fit';

  const icons = {
    pending: <Clock className="h-3.5 w-3.5" />,
    active: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    completed: <CheckCircle2 className="h-3.5 w-3.5" />,
    processing: <Loader2 className="h-3.5 w-3.5 animate-spin" />,
    uploaded: <CheckCircle2 className="h-3.5 w-3.5" />,
    failed: <XCircle className="h-3.5 w-3.5" />,
    requires_review: <AlertTriangle className="h-3.5 w-3.5" />,
    confirmed: <CheckCircle2 className="h-3.5 w-3.5" />,
    expired: <Clock className="h-3.5 w-3.5" />,
    cancelled: <XCircle className="h-3.5 w-3.5" />,
    info: <Info className="h-3.5 w-3.5" />,
    ayush: <CheckCircle2 className="h-3.5 w-3.5" />
  };

  const variants = {
    pending: 'bg-warning-light text-warning border-warning-border',
    active: 'bg-information-light text-information border-information-border',
    completed: 'bg-success-light text-success border-success-border',
    processing: 'bg-information-light text-information border-information-border',
    uploaded: 'bg-success-light text-success border-success-border',
    failed: 'bg-error-light text-error border-error-border',
    requires_review: 'bg-priority-light text-priority border-priority-border',
    confirmed: 'bg-success-light text-success border-success-border',
    expired: 'bg-surface-muted text-text-disabled border-border-light',
    cancelled: 'bg-surface-muted text-text-disabled border-border-light',
    info: 'bg-information-light text-information border-information-border',
    ayush: 'bg-ayush-light text-ayush border-ayush-border'
  };

  const badgeIcon = icons[variant];
  const variantStyles = variants[variant];

  return (
    <span className={`${baseStyles} ${variantStyles} ${className}`} {...props}>
      {badgeIcon}
      <span>{children}</span>
    </span>
  );
};
