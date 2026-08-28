import * as React from 'react';
import { Button } from './button';

export interface YesNoSelectorProps {
  value?: boolean;
  onChange: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
  yesLabel?: string;
  noLabel?: string;
}

export const YesNoSelector: React.FC<YesNoSelectorProps> = ({
  value,
  onChange,
  label,
  disabled,
  yesLabel = 'Yes',
  noLabel = 'No',
}) => {
  return (
    <div className="flex flex-col gap-2 w-full">
      {label && (
        <span className="text-sm font-semibold text-text-main select-none mb-1">
          {label}
        </span>
      )}
      <div className="grid grid-cols-2 gap-4 w-full">
        <Button
          type="button"
          disabled={disabled}
          variant={value === true ? 'primary' : 'outline'}
          onClick={() => onChange(true)}
          className={`py-5 text-lg font-bold min-h-[64px] rounded-xl border-2 transition-all
            ${value === true 
              ? 'border-primary shadow-sm bg-primary text-white' 
              : 'border-border-light hover:border-primary-light hover:bg-primary-pale text-text-secondary bg-white'}`}
        >
          {yesLabel}
        </Button>
        <Button
          type="button"
          disabled={disabled}
          variant={value === false ? 'destructive' : 'outline'}
          onClick={() => onChange(false)}
          className={`py-5 text-lg font-bold min-h-[64px] rounded-xl border-2 transition-all
            ${value === false 
              ? 'border-error shadow-sm bg-error text-white' 
              : 'border-border-light hover:border-error-light hover:bg-error-light/10 text-text-secondary bg-white'}`}
        >
          {noLabel}
        </Button>
      </div>
    </div>
  );
};
