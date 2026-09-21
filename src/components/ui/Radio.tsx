import React from 'react';
import { cn } from '../../utils/cn';

export interface RadioOption {
  value: string;
  label: React.ReactNode;
  description?: string;
  disabled?: boolean;
}

export interface RadioGroupProps {
  name: string;
  options: RadioOption[];
  selectedValue?: string;
  onChange?: (value: string) => void;
  label?: string;
  className?: string;
}

export const RadioGroup: React.FC<RadioGroupProps> = ({
  name,
  options,
  selectedValue,
  onChange,
  label,
  className
}) => {
  return (
    <div className={cn("space-y-2", className)}>
      {label && <span className="block text-xs font-semibold text-slate-700">{label}</span>}
      <div className="space-y-2">
        {options.map(opt => {
          const id = `${name}-${opt.value}`;
          const isChecked = selectedValue === opt.value;
          return (
            <div key={opt.value} className="flex items-start gap-2.5">
              <input
                type="radio"
                id={id}
                name={name}
                value={opt.value}
                checked={isChecked}
                disabled={opt.disabled}
                onChange={() => onChange?.(opt.value)}
                className="mt-0.5 h-4 w-4 border-slate-300 text-slate-900 focus:ring-slate-800 cursor-pointer"
              />
              <label htmlFor={id} className="text-xs font-medium text-slate-800 cursor-pointer">
                {opt.label}
                {opt.description && (
                  <p className="text-xs text-slate-500 font-normal mt-0.5">{opt.description}</p>
                )}
              </label>
            </div>
          );
        })}
      </div>
    </div>
  );
};
