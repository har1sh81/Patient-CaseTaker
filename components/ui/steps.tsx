import * as React from 'react';
import { Check } from 'lucide-react';

export interface StepItem {
  id: string;
  label: string;
}

export interface StepsProps extends React.HTMLAttributes<HTMLDivElement> {
  steps: StepItem[];
  activeStepIndex: number;
}

export const Steps: React.FC<StepsProps> = ({
  className = '',
  steps,
  activeStepIndex,
  ...props
}) => {
  return (
    <div className={`flex items-center justify-between w-full select-none ${className}`} {...props}>
      {steps.map((step, idx) => {
        const isCompleted = idx < activeStepIndex;
        const isActive = idx === activeStepIndex;

        return (
          <React.Fragment key={step.id}>
            {/* Step Node */}
            <div className="flex flex-col items-center gap-2 flex-1 relative">
              <div
                className={`h-10 w-10 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-all duration-300 z-10
                  ${isCompleted 
                    ? 'bg-primary border-primary text-white' 
                    : isActive 
                      ? 'bg-white border-clinical-blue text-clinical-blue ring-4 ring-clinical-blue-light font-extrabold' 
                      : 'bg-white border-border-light text-text-disabled'}`}
              >
                {isCompleted ? (
                  <Check className="h-5 w-5 stroke-[3px]" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>
              <span
                className={`text-xs font-semibold text-center leading-4 max-w-[96px]
                  ${isCompleted 
                    ? 'text-primary' 
                    : isActive 
                      ? 'text-clinical-blue font-bold' 
                      : 'text-text-disabled font-medium'}`}
              >
                {step.label}
              </span>
            </div>

            {/* Step Line Connector */}
            {idx < steps.length - 1 && (
              <div className="flex-1 h-0.5 relative -top-3">
                <div
                  className={`h-full transition-all duration-500
                    ${idx < activeStepIndex 
                      ? 'bg-primary' 
                      : 'bg-border-light'}`}
                />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};
