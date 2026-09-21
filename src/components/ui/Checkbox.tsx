import React from 'react';
import { cn } from '../../utils/cn';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: React.ReactNode;
  description?: string;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(({
  label,
  description,
  className,
  id,
  disabled,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const checkboxId = id || generatedId;

  return (
    <div className="flex items-start gap-2.5">
      <input
        ref={ref}
        type="checkbox"
        id={checkboxId}
        disabled={disabled}
        className={cn(
          "mt-0.5 h-4 w-4 rounded border-slate-300 text-slate-900 focus:ring-2 focus:ring-slate-800 transition cursor-pointer disabled:cursor-not-allowed",
          className
        )}
        {...props}
      />
      <div className="text-xs">
        <label htmlFor={checkboxId} className={cn("font-medium text-slate-800 select-none cursor-pointer", disabled && "text-slate-400")}>
          {label}
        </label>
        {description && <p className="text-xs text-slate-500 mt-0.5">{description}</p>}
      </div>
    </div>
  );
});

Checkbox.displayName = 'Checkbox';
