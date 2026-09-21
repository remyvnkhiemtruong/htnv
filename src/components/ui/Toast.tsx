import React from 'react';
import { cn } from '../../utils/cn';
import { CheckCircleIcon, XCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XMarkIcon } from '@heroicons/react/24/outline';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title?: string;
  message: string;
}

export interface ToastItemProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

export const ToastItem: React.FC<ToastItemProps> = ({ toast, onDismiss }) => {
  const icons = {
    success: <CheckCircleIcon className="w-5 h-5 text-emerald-500 shrink-0" />,
    error: <XCircleIcon className="w-5 h-5 text-rose-500 shrink-0" />,
    info: <InformationCircleIcon className="w-5 h-5 text-sky-500 shrink-0" />,
    warning: <ExclamationTriangleIcon className="w-5 h-5 text-amber-500 shrink-0" />
  };

  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-start gap-3 p-3.5 bg-white border border-slate-200 rounded-lg shadow-dropdown text-xs text-slate-800 animate-toast-slide min-w-[280px] max-w-sm pointer-events-auto")}
    >
      {icons[toast.type]}
      <div className="flex-1">
        {toast.title && <h4 className="font-bold text-slate-900">{toast.title}</h4>}
        <p className="text-slate-600 mt-0.5 leading-normal">{toast.message}</p>
      </div>
      <button type="button" onClick={() => onDismiss(toast.id)} className="text-slate-400 hover:text-slate-600 p-0.5 rounded" aria-label="Đóng thông báo">
        <XMarkIcon className="w-4 h-4" />
      </button>
    </div>
  );
};
