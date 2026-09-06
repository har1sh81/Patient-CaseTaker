'use client';

import * as React from 'react';
import { Button } from '../ui/button';
import { Steps } from '../ui/steps';
import { Badge } from '../ui/badge';
import { HelpCircle, LogOut, ShieldAlert, Globe, Check, Search } from 'lucide-react';
import { Dialog } from '../ui/dialog';
import { Input } from '../ui/input';
import { SCHEDULED_LANGUAGES, getLanguageInfo, SupportedLanguage } from '../../lib/language/config';

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
  language?: string;
  onLanguageChange?: (lang: SupportedLanguage) => void;
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
  const [isLangDialogOpen, setIsLangDialogOpen] = React.useState(false);
  const [langSearch, setLangSearch] = React.useState('');

  const activeLangInfo = getLanguageInfo(language);

  const filteredLanguages = React.useMemo(() => {
    if (!langSearch.trim()) return SCHEDULED_LANGUAGES;
    const q = langSearch.toLowerCase().trim();
    return SCHEDULED_LANGUAGES.filter(
      (l) =>
        l.name.toLowerCase().includes(q) ||
        l.nativeName.toLowerCase().includes(q) ||
        l.id.toLowerCase().includes(q)
    );
  }, [langSearch]);

  const steps = [
    { id: 'step_consent', label: 'Consent' },
    { id: 'step_interview', label: 'Interview' },
    { id: 'step_documents', label: 'Documents' },
    { id: 'step_review', label: 'Review' },
    { id: 'step_send', label: 'Send to Doctor' },
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

          {/* Multilingual IndicTrans2 Language Switcher */}
          {onLanguageChange && (
            <button
              onClick={() => setIsLangDialogOpen(true)}
              className="flex items-center gap-2 bg-surface-muted hover:bg-primary-light/20 p-2 px-3.5 rounded-xl border border-border-light text-xs font-bold text-text-main transition-all cursor-pointer shadow-sm hover:border-primary/40"
              title="Select Patient Language"
            >
              <Globe className="h-4 w-4 text-primary" />
              <span>{activeLangInfo.nativeName}</span>
              {activeLangInfo.id !== 'en' && (
                <span className="text-text-muted text-[10px]">({activeLangInfo.name})</span>
              )}
            </button>
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
        <div className="max-w-3xl w-full flex flex-col gap-6">{children}</div>
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

      {/* Multilingual 22 Scheduled Indian Languages Selection Modal */}
      <Dialog
        isOpen={isLangDialogOpen}
        onClose={() => setIsLangDialogOpen(false)}
        title="Select Patient Language / भाषा चुनें / மொழியைத் தேர்ந்தெடுக்கவும்"
      >
        <div className="flex flex-col gap-4 max-h-[70vh]">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-text-muted" />
            <Input
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              placeholder="Search Indian languages... (e.g., Hindi, Tamil, Telugu, Marathi)"
              className="pl-9 text-sm"
            />
          </div>

          <p className="text-xs text-text-secondary">
            MediKiosk supports all 22 scheduled Indian languages using local IndicTrans2 AI models.
          </p>

          {/* Language grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 overflow-y-auto max-h-[360px] p-1 pr-2">
            {filteredLanguages.map((lang) => {
              const isSelected = language === lang.id;
              return (
                <button
                  key={lang.id}
                  onClick={() => {
                    onLanguageChange?.(lang.id as SupportedLanguage);
                    setIsLangDialogOpen(false);
                  }}
                  className={`p-3 rounded-xl border text-left flex flex-col gap-0.5 transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-primary/10 border-primary text-primary font-bold shadow-sm'
                      : 'border-border-light hover:border-primary/50 hover:bg-surface-muted text-text-main'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-base font-bold leading-tight">{lang.nativeName}</span>
                    {isSelected && <Check className="h-4 w-4 text-primary shrink-0" />}
                  </div>
                  <span className="text-xs text-text-secondary">{lang.name}</span>
                </button>
              );
            })}

            {filteredLanguages.length === 0 && (
              <div className="col-span-full py-8 text-center text-text-muted text-sm">
                No matching languages found.
              </div>
            )}
          </div>
        </div>
      </Dialog>

      {/* Exit confirmation dialog */}
      <Dialog
        isOpen={isExitDialogOpen}
        onClose={() => setIsExitDialogOpen(false)}
        title="Cancel Patient Intake?"
        destructive
        footer={
          <>
            <Button variant="outline" onClick={() => setIsExitDialogOpen(false)}>
              No, Continue
            </Button>
            <Button variant="destructive" onClick={handleConfirmExit}>
              Yes, Cancel & Clear Data
            </Button>
          </>
        }
      >
        <div className="flex gap-4 items-start">
          <ShieldAlert className="h-10 w-10 text-error shrink-0" />
          <div>
            <p className="font-semibold text-text-main mb-1">
              Are you sure you want to cancel the check-in?
            </p>
            <p className="text-sm text-text-secondary">
              All your entered details, voice answers, and uploaded documents will be permanently
              cleared to protect your privacy.
            </p>
          </div>
        </div>
      </Dialog>
    </div>
  );
};
