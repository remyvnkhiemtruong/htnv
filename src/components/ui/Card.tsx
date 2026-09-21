import React from 'react';
import { cn } from '../../utils/cn';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  header?: React.ReactNode;
  footer?: React.ReactNode;
  variant?: 'default' | 'subtle' | 'elevated' | 'bordered';
  padding?: 'none' | 'sm' | 'md' | 'lg';
}

export const Card: React.FC<CardProps> = ({
  children,
  header,
  footer,
  variant = 'default',
  padding = 'md',
  className,
  ...props
}) => {
  const variants = {
    default: "bg-white border-slate-200",
    subtle: "bg-slate-50/80 border-slate-200",
    elevated: "bg-white border-slate-300",
    bordered: "bg-white border-slate-300",
  };

  const paddings = {
    none: "",
    sm: "p-3 sm:p-4",
    md: "p-4 sm:p-5 lg:p-6",
    lg: "p-5 sm:p-6 lg:p-7",
  };

  return (
    <div
      className={cn(
        "min-w-0 overflow-hidden rounded-lg border",
        variants[variant],
        className
      )}
      {...props}
    >
      {header && <div className="flex min-w-0 items-center justify-between gap-3 border-b border-slate-200 px-4 py-3.5 sm:px-5">{header}</div>}
      <div className={paddings[padding]}>{children}</div>
      {footer && <div className="flex min-w-0 flex-wrap items-center justify-between gap-2 border-t border-slate-200 bg-slate-50/80 px-4 py-3 text-xs text-slate-500 sm:px-5">{footer}</div>}
    </div>
  );
};
