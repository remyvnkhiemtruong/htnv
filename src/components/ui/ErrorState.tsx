import React from 'react';
import { cn } from '../../utils/cn';
import { ExclamationCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { Button } from './Button';

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}

export const ErrorState: React.FC<ErrorStateProps> = ({
  title = 'Đã có lỗi xảy ra',
  message = 'Không thể tải dữ liệu. Vui lòng kiểm tra lại kết nối hoặc thử lại sau.',
  onRetry,
  className
}) => {
  return (
    <div className={cn("p-6 text-center flex flex-col items-center justify-center space-y-3 bg-rose-50/50 rounded-lg border border-rose-200", className)}>
      <ExclamationCircleIcon className="w-10 h-10 text-rose-500" />
      <div className="max-w-xs space-y-1">
        <h4 className="text-xs font-bold text-rose-900">{title}</h4>
        <p className="text-xs text-rose-700 leading-relaxed">{message}</p>
      </div>
      {onRetry && (
        <Button
          size="sm"
          variant="outline"
          onClick={onRetry}
          leftIcon={<ArrowPathIcon className="w-3.5 h-3.5" />}
          className="border-rose-300 text-rose-800 hover:bg-rose-100"
        >
          Thử lại
        </Button>
      )}
    </div>
  );
};
