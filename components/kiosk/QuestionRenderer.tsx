'use client';

import * as React from 'react';
import { Question } from '../../types';
import {
  VoiceInput,
  VoiceCorrection,
  MultipleChoice,
  NumericInput,
  TextInputKiosk,
} from '../interaction';
import { YesNoSelector } from '../ui/yes-no';
import { useSpeechRecognition } from '../../hooks/use-speech-recognition';
import type { SupportedLanguage } from '../../lib/kiosk/translation';

export interface QuestionRendererProps {
  question: Question;
  language: SupportedLanguage;
  onSubmit: (value: unknown, method: 'voice' | 'touch' | 'keyboard', transcript?: string, edited?: boolean) => void;
  disabled?: boolean;
}

export const QuestionRenderer: React.FC<QuestionRendererProps> = ({
  question,
  language,
  onSubmit,
  disabled = false,
}) => {
  const [inputMode, setInputMode] = React.useState<'voice' | 'touch'>(
    question.allowVoice ? 'voice' : 'touch'
  );
  
  const [touchValue, setTouchValue] = React.useState<unknown>(undefined);
  const [showVoiceCorrection, setShowVoiceCorrection] = React.useState(false);

  // Reset internal state when question changes
  React.useEffect(() => {
    React.startTransition(() => {
      setInputMode(question.allowVoice ? 'voice' : 'touch');
      setTouchValue(undefined);
      setShowVoiceCorrection(false);
    });
  }, [question]);

  const sr = useSpeechRecognition({ mock: false }); // In demo, we could pass mock:true via context, but we use Browser for prod

  // When speech recognition finishes, show correction flow
  React.useEffect(() => {
    if (sr.isDone && sr.result.finalTranscript) {
      React.startTransition(() => {
        setShowVoiceCorrection(true);
      });
    }
  }, [sr.isDone, sr.result.finalTranscript]);

  const handleSwitchToTouch = () => {
    sr.cancelListening();
    setShowVoiceCorrection(false);
    setInputMode('touch');
  };

  const handleVoiceAccept = (finalText: string) => {
    const isEdited = finalText !== sr.result.finalTranscript;
    onSubmit(finalText, 'voice', sr.result.finalTranscript, isEdited);
  };

  const handleVoiceRetry = () => {
    setShowVoiceCorrection(false);
    sr.reset();
    sr.startListening(language);
  };

  const handleTouchSubmit = (val: unknown) => {
    onSubmit(val, question.inputType === 'text' ? 'keyboard' : 'touch');
  };

  if (inputMode === 'voice' && question.allowVoice) {
    if (showVoiceCorrection && sr.result.finalTranscript) {
      return (
        <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
          <VoiceCorrection
            transcript={sr.result.finalTranscript}
            onAccept={handleVoiceAccept}
            onRetryVoice={handleVoiceRetry}
            onSwitchToTouch={handleSwitchToTouch}
            disabled={disabled}
          />
        </div>
      );
    }

    return (
      <div className="w-full max-w-xl mx-auto animate-in fade-in zoom-in-95 duration-300">
        <VoiceInput
          state={sr.state}
          result={sr.result}
          errorMessage={sr.errorMessage}
          isSupported={sr.isSupported}
          onStart={() => sr.startListening(language)}
          onStop={sr.stopListening}
          onCancel={() => {
            sr.cancelListening();
            setShowVoiceCorrection(false);
          }}
          onRetry={sr.reset}
          onSwitchToTouch={handleSwitchToTouch}
          disabled={disabled}
        />
      </div>
    );
  }

  // Touch fallback / native mode
  return (
    <div className="w-full max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300 flex flex-col gap-6">
      {question.inputType === 'yes_no' && (
        <div className="w-full max-w-sm mx-auto">
          <YesNoSelector
            value={touchValue as boolean}
            onChange={(val) => {
              setTouchValue(val);
              handleTouchSubmit(val ? 'yes' : 'no');
            }}
            disabled={disabled}
          />
        </div>
      )}

      {question.inputType === 'single_choice' && question.options && (
        <MultipleChoice
          options={question.options}
          multi={false}
          value={touchValue as string}
          onChange={(val) => {
            setTouchValue(val);
            handleTouchSubmit(val);
          }}
          disabled={disabled}
        />
      )}

      {question.inputType === 'multiple_choice' && question.options && (
        <div className="flex flex-col gap-4">
          <MultipleChoice
            options={question.options}
            multi={true}
            value={touchValue as string[]}
            onChange={(val) => setTouchValue(val)}
            disabled={disabled}
          />
          <button
            type="button"
            disabled={disabled || !touchValue || (Array.isArray(touchValue) && touchValue.length === 0)}
            onClick={() => handleTouchSubmit(touchValue)}
            className="w-full py-4 bg-primary text-white font-bold rounded-xl active:scale-95 transition-all disabled:opacity-50"
          >
            Confirm
          </button>
        </div>
      )}

      {question.inputType === 'number' && (
        <div className="w-full max-w-sm mx-auto">
          <NumericInput
            value={touchValue as number}
            onChange={setTouchValue}
            onConfirm={(val) => handleTouchSubmit(val)}
            disabled={disabled}
          />
        </div>
      )}

      {question.inputType === 'text' && (
        <TextInputKiosk
          value={(touchValue as string) || ''}
          onChange={setTouchValue}
          onConfirm={(val) => handleTouchSubmit(val)}
          showKeyboard={true}
          disabled={disabled}
        />
      )}

      {question.allowVoice && (
        <div className="text-center mt-6">
          <button
            type="button"
            onClick={() => setInputMode('voice')}
            disabled={disabled}
            className="text-primary font-bold text-sm underline active:scale-95 transition-all"
          >
            Switch back to Voice
          </button>
        </div>
      )}
    </div>
  );
};
