import React from 'react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  helperText?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  disableAutofill?: boolean;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
  label,
  helperText,
  error,
  leftIcon,
  rightIcon,
  className,
  id,
  disabled,
  autoComplete,
  disableAutofill = true,
  type = 'text',
  ...props
}, ref) => {
  const generatedId = React.useId();
  const inputId = id || generatedId;
  const helperId = helperText || error ? `${inputId}-help` : undefined;

  const resolvedAutoComplete = autoComplete
    ? autoComplete
    : disableAutofill
      ? (type === 'password' ? 'new-password' : 'one-time-code')
      : undefined;

  return (
    <div className="w-full space-y-1.5">
      {label && <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700 sm:text-[13px]">{label}</label>}
      <div className="relative flex items-center">
        {leftIcon && <div className="pointer-events-none absolute left-3 text-slate-400">{leftIcon}</div>}
        <input
          ref={ref}
          id={inputId}
          type={type}
          disabled={disabled}
          autoComplete={resolvedAutoComplete}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={helperId}
          data-lpignore={disableAutofill ? "true" : undefined}
          data-1p-ignore={disableAutofill ? "true" : undefined}
          data-form-type={disableAutofill ? "other" : undefined}
          autoCorrect={disableAutofill ? "off" : undefined}
          autoCapitalize={disableAutofill ? "off" : undefined}
          spellCheck={disableAutofill ? false : undefined}
          className={cn(
            "min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-[16px] text-slate-900 shadow-[0_1px_1px_rgba(15,23,42,0.02)] placeholder:text-slate-400 focus:border-primary-600 focus:outline-none focus:ring-3 focus:ring-primary-600/10 disabled:bg-slate-50 disabled:text-slate-400 sm:min-h-10 sm:text-sm",
            leftIcon && "pl-9",
            rightIcon && "pr-9",
            error && "border-rose-500 focus:border-rose-500 focus:ring-rose-500/10",
            className
          )}
          {...props}
        />
        {rightIcon && <div className="pointer-events-none absolute right-3 text-slate-400">{rightIcon}</div>}
      </div>
      {error ? <p id={helperId} className="text-xs font-medium text-rose-600">{error}</p> : helperText ? <p id={helperId} className="text-xs leading-5 text-slate-500">{helperText}</p> : null}
    </div>
  );
});

Input.displayName = 'Input';

