import React from 'react';
import { Button } from '../components/ui';
import { HomeIcon } from '@heroicons/react/24/outline';
import { useAuthStore } from '../app/store/useAuthStore';

interface NotFoundViewProps {
  onNavigate: (view: string) => void;
}

const homeForRole = (role: string) =>
  role === 'ai' ? 'ai-workspace'
    : role === 'teacher' ? 'teacher-dashboard'
      : role === 'researcher' ? 'researcher-view'
        : role === 'admin' ? 'admin-view'
          : role === 'peer' ? 'portfolio-list'
            : 'dashboard';

export const NotFoundView: React.FC<NotFoundViewProps> = ({ onNavigate }) => {
  const currentUser = useAuthStore(state => state.currentUser);
  const homeView = homeForRole(currentUser.role);
  return (
    <div className="max-w-lg mx-auto py-16 px-4 text-center space-y-6 animate-fade-in">
      <div className="w-16 h-16 rounded-full bg-white shadow-sm flex items-center justify-center mx-auto overflow-hidden border border-slate-100 mb-2">
        <img src="/Logo.png" alt="Logo THPT Vị Thanh" className="h-full w-full object-cover" />
      </div>

      <div className="space-y-2">
        <span className="text-caption font-bold text-slate-500 bg-slate-200/70 px-2.5 py-1 rounded-md">
          404 • Không tìm thấy trang
        </span>
        <h1 className="text-h2 font-bold text-slate-900">
          Không tìm thấy trang
        </h1>
        <p className="text-small text-slate-500 leading-relaxed">
          Đường dẫn này không tồn tại hoặc đã được thay đổi.
        </p>
      </div>

      <div className="pt-2 flex items-center justify-center">
        <Button
          variant="primary"
          onClick={() => onNavigate(homeView)}
          leftIcon={<HomeIcon className="w-4 h-4" />}
        >
          Về trang chính
        </Button>
      </div>
    </div>
  );
};

