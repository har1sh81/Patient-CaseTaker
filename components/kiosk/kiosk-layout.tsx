'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { Steps } from '../ui/steps';
import { Badge } from '../ui/badge';
import { HelpCircle, LogOut, ShieldAlert } from 'lucide-react';
import { Dialog } from '../ui/dialog';

export interface KioskLayoutProps {
  children: React.ReactNode;
  activeStepIndex: number;
  onBack?: () => void;
  onNext?: () => void;
  onExit?: () => void;
  nextDisabled?: boolean;
  nextLoading?: boolean;
  backLabel?: string;
  nextLabel?: string;
  departmentMode?: 'standard' | 'ayush';
  language?: 'en' | 'hi' | 'ta';
  onLanguageChange?: (lang: 'en' | 'hi' | 'ta') => void;
}

export const KioskLayout: React.FC<KioskLayoutProps> = ({
  children,
  activeStepIndex,
  onBack,
  onNext,
  onExit,
  nextDisabled,
  nextLoading,
  backLabel = 'Back',
  nextLabel = 'Continue',
  departmentMode = 'standard',
  language = 'en',
  onLanguageChange,
}) => {
  const [isExitDialogOpen, setIsExitDialogOpen] = React.useState(false);

  const steps = [
    { id: 'step_consent', label: 'Consent' },
    { id: 'step_interview', label: 'Interview' },
    { id: 'step_documents', label: 'Documents' },
    { id: 'step_review', label: 'Review' },
    { id: 'step_print', label: 'Print' },
  ];

  const handleExitClick = () => {
    if (onExit) {
      setIsExitDialogOpen(true);
    }
  };

  const handleConfirmExit = () => {
    setIsExitDialogOpen(false);
    onExit?.();
  };

  return (
    <div className="flex flex-col min-h-screen bg-background-main font-sans">
      {/* Top Header Bar */}
      <header className="bg-white border-b border-border-light h-20 px-6 flex items-center justify-between select-none shrink-0 z-20">
        {/* Brand logo */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center text-white font-black text-xl">
            MK
          </div>
          <div>
            <h1 className="text-lg font-bold text-secondary leading-5">MediKiosk</h1>
            <p className="text-xs text-text-secondary">Smart Clinical Intake Assistant</p>
          </div>
        </div>

        {/* Badges & Actions */}
        <div className="flex items-center gap-4">
          {/* Department badge */}
          {departmentMode === 'ayush' ? (
            <Badge variant="ayush">AYUSH Mode</Badge>
          ) : (
            <Badge variant="info">Standard Mode</Badge>
          )}

          {/* Language Switcher */}
          {onLanguageChange && (
            <div className="flex items-center gap-1 bg-surface-muted p-1 rounded-lg border border-border-light">
              {(['en', 'hi', 'ta'] as const).map((lang) => (
                <button
                  key={lang}
                  onClick={() => onLanguageChange(lang)}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all cursor-pointer
                    ${language === lang
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-text-secondary hover:text-text-main'}`}
                >
                  {lang === 'en' ? 'EN' : lang === 'hi' ? 'हिं' : 'தமிழ்'}
                </button>
              ))}
            </div>
          )}

          {/* Help Button */}
          <Button
            variant="ghost"
            size="sm"
            className="flex items-center gap-1.5 min-h-[36px]"
            onClick={() => alert('Please ask the clinic receptionist for assistance.')}
          >
            <HelpCircle className="h-4.5 w-4.5" />
            <span className="text-sm font-semibold">Help</span>
          </Button>
        </div>
      </header>

      {/* Progress timeline */}
      <div className="bg-white border-b border-border-light px-8 py-4 shrink-0 z-10">
        <div className="max-w-4xl mx-auto">
          <Steps steps={steps} activeStepIndex={activeStepIndex} />
        </div>
      </div>

      {/* Scrollable Content Workspace */}
      <main className="flex-1 overflow-y-auto p-8 flex justify-center items-start">
        <div className="max-w-3xl w-full flex flex-col gap-6">
          {children}
        </div>
      </main>

      {/* Fixed bottom navigation panel */}
      <footer className="bg-white border-t border-border-light h-24 px-8 flex items-center justify-between shrink-0 select-none z-20">
        {/* Left Action (Exit/Cancel) */}
        <div>
          {onExit && (
            <Button
              variant="outline"
              size="lg"
              className="flex items-center gap-2 font-bold min-h-[52px]"
              onClick={handleExitClick}
            >
              <LogOut className="h-5 w-5 text-error" />
              <span>Cancel Intake</span>
            </Button>
          )}
        </div>

        {/* Right Navigation Controls */}
        <div className="flex items-center gap-4">
          {onBack && (
            <Button
              variant="secondary"
              size="lg"
              onClick={onBack}
              className="font-bold min-h-[52px]"
            >
              {backLabel}
            </Button>
          )}

          {onNext && (
            <Button
              variant="primary"
              size="lg"
              onClick={onNext}
              disabled={nextDisabled}
              isLoading={nextLoading}
              className="font-bold min-h-[52px] px-8"
            >
              {nextLabel}
            </Button>
          )}
        </div>
      </footer>

      {/* Exit confirmation dialog */}
      <Dialog
        isOpen={isExitDialogOpen}
        onClose={() => setIsExitDialogOpen(false)}
        title="Cancel Patient Intake?"
        destructive
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setIsExitDialogOpen(false)}
            >
              No, Continue
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmExit}
            >
              Yes, Cancel & Clear Data
            </Button>
          </>
        }
      >
        <div className="flex gap-4 items-start">
          <ShieldAlert className="h-10 w-10 text-error shrink-0" />
          <div>
            <p className="font-semibold text-text-main mb-1">Are you sure you want to cancel the check-in?</p>
            <p className="text-sm text-text-secondary">All your entered details, voice answers, and uploaded documents will be permanently cleared to protect your privacy.</p>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
