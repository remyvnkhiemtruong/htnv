import React from 'react';
import { cn } from '../../utils/cn';

export interface TabItem {
  id: string;
  label: React.ReactNode;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  items: TabItem[];
  activeId: string;
  onChange: (id: string) => void;
  variant?: 'underline' | 'segmented';
  className?: string;
}

export const Tabs: React.FC<TabsProps> = ({
  items,
  activeId,
  onChange,
  variant = 'underline',
  className
}) => {
  if (variant === 'segmented') {
    return (
      <div className={cn("inline-flex p-0.5 bg-slate-100 rounded-md border border-slate-200 gap-0.5", className)}>
        {items.map(tab => {
          const isActive = activeId === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              disabled={tab.disabled}
              onClick={() => onChange(tab.id)}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-medium flex items-center gap-1.5 transition-colors select-none disabled:opacity-40 disabled:cursor-not-allowed",
                isActive
                  ? "bg-white text-slate-900 font-semibold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
              )}
            >
              {tab.icon && <span className="w-3.5 h-3.5">{tab.icon}</span>}
              <span>{tab.label}</span>
              {typeof tab.count === 'number' && (
                <span className="ml-1 text-xs text-slate-500 font-normal">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
    );
  }

  // Underline variant (Default - Clean academic layout)
  return (
    <nav className={cn("flex space-x-6 border-b border-slate-200", className)}>
      {items.map(tab => {
        const isActive = activeId === tab.id;
        return (
          <button
            type="button"
            key={tab.id}
            disabled={tab.disabled}
            onClick={() => onChange(tab.id)}
            className={cn(
              "py-2.5 text-sm font-medium border-b-2 -mb-px flex items-center gap-1.5 transition-colors select-none",
              isActive
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
            )}
          >
            {tab.icon && <span className="w-4 h-4 text-slate-400">{tab.icon}</span>}
            <span>{tab.label}</span>
            {typeof tab.count === 'number' && (
              <span className={cn("text-xs font-normal ml-0.5", isActive ? "text-slate-900" : "text-slate-400")}>
                {tab.count}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};
