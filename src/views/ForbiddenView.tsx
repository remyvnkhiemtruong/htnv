import React from 'react';
import { Button } from '../components/ui';
import { HomeIcon, ArrowLeftIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../app/store/useAuthStore';

interface ForbiddenViewProps {
  onNavigate: (view: string) => void;
  requiredRole?: string;
}

const homeForRole = (role: string) =>
  role === 'ai' ? 'ai-workspace'
    : role === 'teacher' ? 'teacher-dashboard'
      : role === 'researcher' ? 'researcher-view'
        : role === 'admin' ? 'admin-view'
          : role === 'peer' ? 'portfolio-list'
            : 'dashboard';

export const ForbiddenView: React.FC<ForbiddenViewProps> = ({ onNavigate }) => {
  const { currentUser } = useAuthStore();
  const homeView = homeForRole(currentUser.role);

  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto overflow-hidden border border-slate-100 mb-2">
        <img src="/Logo.png" alt="Logo THPT Vị Thanh" className="h-full w-full object-cover" />
      </div>

      <div className="space-y-2">
        <span className="text-caption font-bold text-rose-600 bg-rose-100/70 px-2.5 py-1 rounded-md">
          403 • Không có quyền truy cập
        </span>
        <h1 className="text-h2 font-bold text-slate-900">
          Bạn không có quyền mở trang này
        </h1>
        <p className="text-small text-slate-600 leading-relaxed">
          Tài khoản <strong>{currentUser.name}</strong> không được phép truy cập trang này.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center gap-3">
        <Button
          variant="outline"
          onClick={() => onNavigate(homeView)}
          leftIcon={<ArrowLeftIcon className="w-4 h-4" />}
        >
          Về trang chính
        </Button>
        <Button
          variant="primary"
          onClick={() => onNavigate(homeView)}
          leftIcon={<HomeIcon className="w-4 h-4" />}
        >
          Trang chính
        </Button>
      </div>
    </div>
  );
};

