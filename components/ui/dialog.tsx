import * as React from 'react';
import { X } from 'lucide-react';
import { Button } from './button';

export interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  destructive?: boolean;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  footer,
  destructive,
}) => {
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-secondary/60 backdrop-blur-sm animate-fade-in select-none">
      <div 
        className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden border border-border-light flex flex-col max-h-[85vh] animate-scale-up"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border-light">
          <h2 className={`text-xl font-bold ${destructive ? 'text-error' : 'text-text-main'}`}>
            {title}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="p-1 rounded-full text-text-secondary hover:bg-surface-muted min-h-[36px] w-[36px] flex items-center justify-center"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 text-base text-text-secondary">
          {description && <p className="mb-4">{description}</p>}
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 bg-surface-muted border-t border-border-light flex items-center justify-end gap-3">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};
