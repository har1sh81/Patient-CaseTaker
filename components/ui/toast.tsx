'use client';

import * as React from 'react';
import { useToast, ToastMessage } from '../../hooks/use-toast';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';
import { Button } from './button';

export const ToastProvider: React.FC = () => {
  const { toasts, removeToast } = useToast();

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-3 max-w-sm w-full pointer-events-none select-none">
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={() => removeToast(toast.id)} />
      ))}
    </div>
  );
};

interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: () => void;
}

const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const baseStyles = 'flex gap-3 p-4 rounded-xl border bg-white shadow-lg pointer-events-auto w-full border-border-light transition-all duration-300 animate-slide-in';

  const icons = {
    success: <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />,
    information: <Info className="h-5 w-5 text-information flex-shrink-0" />,
    warning: <AlertTriangle className="h-5 w-5 text-warning flex-shrink-0" />,
    error: <XCircle className="h-5 w-5 text-error flex-shrink-0" />,
  };

  return (
    <div className={baseStyles}>
      {icons[toast.type]}
      <div className="flex-1 flex flex-col gap-0.5">
        <h6 className="font-bold text-sm text-text-main leading-5">
          {toast.title}
        </h6>
        {toast.message && (
          <p className="text-xs text-text-secondary leading-4">
            {toast.message}
          </p>
        )}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={onDismiss}
        className="p-0.5 rounded-full text-text-muted hover:bg-surface-muted min-h-[24px] w-[24px] flex items-center justify-center self-start"
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
};
