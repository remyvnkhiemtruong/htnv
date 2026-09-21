import React from 'react';
import { cn } from '../../utils/cn';

export interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  trend?: {
    value: string;
    isPositive?: boolean;
  };
  icon?: React.ReactNode;
  variant?: 'default' | 'accent' | 'success' | 'warning' | 'info';
  onClick?: () => void;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  subValue,
  trend,
  icon,
  variant = 'default',
  onClick,
  className
}) => {
  const variants = {
    default: "border-slate-200 bg-white",
    accent: "border-primary-200 bg-primary-50/55",
    success: "border-emerald-200 bg-emerald-50/55",
    warning: "border-amber-200 bg-amber-50/55",
    info: "border-sky-200 bg-sky-50/55",
  };

  const iconVariants = {
    default: "border-slate-200 bg-slate-50 text-slate-600",
    accent: "border-primary-200 bg-white text-primary-700",
    success: "border-emerald-200 bg-white text-emerald-700",
    warning: "border-amber-200 bg-white text-amber-700",
    info: "border-sky-200 bg-white text-sky-700",
  };

  const Wrapper: React.ElementType = onClick ? 'button' : 'div';

  return (
    <Wrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={cn(
        "v3-panel flex w-full items-start justify-between gap-3 p-4 text-left sm:p-5",
        onClick && "v3-panel-interactive cursor-pointer",
        variants[variant],
        className
      )}
    >
      <div className="min-w-0 space-y-1">
        <span className="block truncate text-xs font-semibold uppercase tracking-[0.05em] text-slate-500">{label}</span>
        <div className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{value}</div>
        {subValue && <p className="truncate text-xs text-slate-500">{subValue}</p>}
        {trend && (
          <div className="mt-1 flex items-center gap-1 text-xs font-semibold">
            <span className={trend.isPositive ? "text-emerald-700" : "text-rose-700"}>
              {trend.isPositive ? "▲" : "▼"} {trend.value}
            </span>
          </div>
        )}
      </div>
      {icon && <div className={cn("flex shrink-0 items-center justify-center rounded-lg border p-2.5", iconVariants[variant])}>{icon}</div>}
    </Wrapper>
  );
};

