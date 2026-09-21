import React from 'react';
import { cn } from '../../utils/cn';
import { CalendarIcon } from '@heroicons/react/24/outline';

export interface DatePickerProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(({
  label,
  error,
  helperText,
  className,
  id,
  disabled,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const dateId = id || generatedId;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={dateId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none text-slate-400">
          <CalendarIcon className="w-4 h-4" />
        </div>
        <input
          ref={ref}
          id={dateId}
          type="date"
          disabled={disabled}
          autoComplete="off"
          className={cn(
            "w-full bg-white border border-slate-300 rounded-lg text-xs py-2 pl-9 pr-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer",
            error && "border-rose-500 focus:ring-rose-500",
            className
          )}
          {...props}
        />
      </div>
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

DatePicker.displayName = 'DatePicker';
