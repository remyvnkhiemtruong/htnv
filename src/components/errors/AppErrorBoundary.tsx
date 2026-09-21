import React from 'react';
import { AlertTriangle, Home, RefreshCw } from 'lucide-react';

interface AppErrorBoundaryState {
  hasError: boolean;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): AppErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('UNHANDLED_UI_ERROR', { message: error.message, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-slate-50 px-4 py-10">
        <section role="alert" className="w-full max-w-lg rounded-xl border border-rose-200 bg-white p-6 text-center shadow-sm sm:p-8">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600">
            <AlertTriangle className="h-6 w-6" aria-hidden="true" />
          </div>
          <h1 className="mt-4 text-xl font-bold text-slate-950">Giao diện gặp sự cố</h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Dữ liệu của bạn vẫn được giữ nguyên. Hãy tải lại trang hoặc quay về trang chủ để tiếp tục.
          </p>
          <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
            <button type="button" onClick={() => window.location.reload()} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary-700 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-800">
              <RefreshCw className="h-4 w-4" aria-hidden="true" /> Tải lại trang
            </button>
            <button type="button" onClick={() => { window.location.href = '/'; }} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
              <Home className="h-4 w-4" aria-hidden="true" /> Về trang chủ
            </button>
          </div>
        </section>
      </main>
    );
  }
}
