import React from 'react';
import { cn } from '../../utils/cn';

export interface Column<T> {
  key: string;
  header: React.ReactNode;
  render?: (row: T, index: number) => React.ReactNode;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T, index: number) => string;
  isLoading?: boolean;
  emptyMessage?: React.ReactNode;
  onRowClick?: (row: T) => void;
  className?: string;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  isLoading = false,
  emptyMessage = 'Không có dữ liệu hiển thị.',
  onRowClick,
  className
}: DataTableProps<T>) {
  if (isLoading) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 space-y-2">
        <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-800 rounded-full animate-spin mx-auto" />
        <p>Đang tải dữ liệu...</p>
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-slate-400">
        {emptyMessage}
      </div>
    );
  }

  const alignments = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
  };

  return (
    <div className={cn("overflow-x-auto w-full", className)}>
      <table className="w-full text-xs text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600">
            {columns.map(col => (
              <th
                key={col.key}
                className={cn("py-3 px-4 font-semibold tracking-tight", alignments[col.align || 'left'], col.className)}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">
          {data.map((row, idx) => (
            <tr
              key={keyExtractor(row, idx)}
              onClick={() => onRowClick?.(row)}
              onKeyDown={(event) => {
                if (!onRowClick || (event.key !== 'Enter' && event.key !== ' ')) return;
                event.preventDefault();
                onRowClick(row);
              }}
              tabIndex={onRowClick ? 0 : undefined}
              className={cn(
                "transition-colors focus:outline-none focus:ring-2 focus:ring-inset focus:ring-primary-500",
                onRowClick ? "hover:bg-slate-50/70 cursor-pointer" : "hover:bg-slate-50/30"
              )}
            >
              {columns.map(col => (
                <td
                  key={col.key}
                  className={cn("py-3 px-4 text-slate-700", alignments[col.align || 'left'], col.className)}
                >
                  {col.render ? col.render(row, idx) : (row as any)[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
