import React from 'react';
import { cn } from '../../utils/cn';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options?: SelectOption[];
  helperText?: string;
  error?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
  label,
  options,
  helperText,
  error,
  children,
  className,
  id,
  disabled,
  ...props
}, ref) => {
  const generatedId = React.useId();
  const selectId = id || generatedId;

  return (
    <div className="w-full space-y-1">
      {label && (
        <label htmlFor={selectId} className="block text-xs font-semibold text-slate-700">
          {label}
        </label>
      )}
      <select
        ref={ref}
        id={selectId}
        disabled={disabled}
        className={cn(
          "w-full bg-white border border-slate-300 rounded-lg text-xs py-2 px-3 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-800 focus:border-transparent transition-all disabled:bg-slate-50 disabled:text-slate-400 cursor-pointer",
          error && "border-rose-500 focus:ring-rose-500",
          className
        )}
        {...props}
      >
        {options ? options.map(opt => (
          <option key={opt.value} value={opt.value} disabled={opt.disabled}>
            {opt.label}
          </option>
        )) : children}
      </select>
      {error ? (
        <p className="text-xs font-medium text-rose-600">{error}</p>
      ) : helperText ? (
        <p className="text-xs text-slate-500">{helperText}</p>
      ) : null}
    </div>
  );
});

Select.displayName = 'Select';
