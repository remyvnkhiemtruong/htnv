import React, { useEffect, useState } from 'react';
import { Button, Input, Alert } from '../components/ui';
import { useAuthStore } from '../app/store/useAuthStore';
import { CheckCircleIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface LoginViewProps {
  onLoginSuccess: () => void;
  onNavigate?: (view: string) => void;
  forcePasswordChange?: boolean;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  onNavigate,
  forcePasswordChange = false
}) => {
  const { setAuthenticatedUser } = useAuthStore();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [mustChange, setMustChange] = useState(forcePasswordChange);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);

  useEffect(() => {
    if (forcePasswordChange) setMustChange(true);
  }, [forcePasswordChange]);

  const acceptUser = (user: any) =>
    setAuthenticatedUser({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      mustChangePassword: Boolean(user.mustChangePassword),
      accountStatus: user.accountStatus,
      lastLogin: user.lastLogin || null,
      className: user.className || '',
      profile: user.profile || {}
    });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể xác thực tài khoản');
      if (data.user?.mustChangePassword) {
        setPassword('');
        setMustChange(true);
        return;
      }
      acceptUser(data.user);
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Lỗi kết nối');
    } finally {
      setLoading(false);
    }
  };

  const rotatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Không thể đổi mật khẩu');
      acceptUser(data.user);
      setMustChange(false);
      setNewPassword('');
      onLoginSuccess();
    } catch (err: any) {
      setError(err.message || 'Không thể đổi mật khẩu');
    } finally {
      setLoading(false);
    }
  };

  const passwordReady = newPassword.length >= 10;

  return (
    <div className="safe-top safe-bottom min-h-[100dvh] bg-slate-100 px-3 py-3 sm:px-5 sm:py-6 lg:flex lg:items-center lg:justify-center lg:px-8">
      <div className="app-view-enter mx-auto grid w-full max-w-6xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-[0_18px_55px_rgba(15,23,42,0.10)] lg:min-h-[660px] lg:grid-cols-[1.05fr_0.95fr]">
        <section className="relative hidden overflow-hidden bg-slate-950 p-10 text-white lg:flex lg:flex-col lg:justify-between xl:p-12">
          <div>
            <button type="button" onClick={() => onNavigate?.('landing')} className="inline-flex min-h-10 items-center rounded-lg border border-white/15 px-3 text-sm font-medium text-slate-200 hover:bg-white/10 hover:text-white">
              ← Trang chủ
            </button>
          </div>

          <div className="max-w-xl py-12">
            <div className="mb-7 flex items-center gap-4">
              <div className="h-16 w-16 overflow-hidden rounded-xl border border-white/15 bg-white p-1 shadow-lg">
                <img src="/Logo.png" alt="Logo THPT Vị Thanh" className="h-full w-full rounded-xl object-cover" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-300">Trường THPT Vị Thanh</p>
                <h1 className="mt-1 text-3xl font-bold tracking-tight xl:text-4xl">Học tốt Ngữ Văn</h1>
              </div>
            </div>
            <p className="max-w-lg text-base leading-8 text-slate-300">
              Lưu từng phiên bản bài làm, nhận góp ý và theo dõi quá trình sửa bài theo 6 trục thi pháp.
            </p>

            <div className="mt-8 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
              {[
                ['01', 'Lưu phiên bản', 'Không ghi đè bài cũ'],
                ['02', 'Góp ý theo bài', 'AI và giáo viên'],
                ['03', 'Đa thiết bị', 'Điện thoại · iPad · máy tính']
              ].map(([index, title, note]) => (
                <div key={index} className="rounded-xl border border-white/10 bg-white/[0.06] p-4">
                  <div className="text-xs font-bold text-emerald-300">{index}</div>
                  <div className="mt-2 text-sm font-semibold text-white">{title}</div>
                  <div className="mt-1 text-xs leading-5 text-slate-400">{note}</div>
                </div>
              ))}
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">KHKT 2026–2027 · Hệ thống hồ sơ đọc số</p>
        </section>

        <section className="flex min-w-0 flex-col justify-center p-4 sm:p-8 lg:p-10 xl:p-12">
          <div className="mx-auto w-full max-w-md">
            <div className="mb-6 flex items-start justify-between gap-3 lg:hidden">
              <button type="button" onClick={() => onNavigate?.('landing')} className="inline-flex min-h-10 items-center rounded-lg px-2 text-sm font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900">← Trang chủ</button>
              <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white p-0.5 shadow-sm">
                <img src="/Logo.png" alt="Logo THPT Vị Thanh" className="h-full w-full rounded-lg object-cover" />
              </div>
            </div>

            <div className="mb-7">
              <p className="v3-kicker">Học tốt Ngữ Văn</p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">{mustChange ? 'Thiết lập mật khẩu mới' : 'Đăng nhập hệ thống'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                {mustChange ? 'Đổi mật khẩu trước khi tiếp tục.' : 'Dùng tài khoản do nhà trường hoặc quản trị viên cấp.'}
              </p>
            </div>

            {error && <div className="mb-5" role="alert"><Alert type="error" title={mustChange ? 'Đổi mật khẩu không thành công' : 'Đăng nhập không thành công'}>{error}</Alert></div>}

            {mustChange ? (
              <form onSubmit={rotatePassword} className="space-y-5" autoComplete="off">
                <input type="text" name="b_trap_username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <input type="password" name="b_trap_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <Alert type="info" title="Bảo mật tài khoản">Dùng mật khẩu ít nhất 10 ký tự và không chia sẻ cho người khác.</Alert>
                <Input
                  label="Mật khẩu mới"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={10}
                  maxLength={256}
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="10–256 ký tự"
                  name="new_password"
                  autoComplete="new-password"
                  data-lpignore="true"
                />
                <div className="flex items-center justify-between gap-3 text-xs">
                  <button type="button" onClick={() => setShowNewPassword(value => !value)} className="inline-flex items-center gap-1.5 font-medium text-slate-500 hover:text-slate-900">
                    {showNewPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}{showNewPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  </button>
                  <span className={`inline-flex items-center gap-1 font-semibold ${passwordReady ? 'text-emerald-700' : 'text-slate-400'}`}><CheckCircleIcon className="h-4 w-4" /> Tối thiểu 10 ký tự</span>
                </div>
                <Button type="submit" variant="primary" size="lg" isLoading={loading} disabled={!passwordReady} className="w-full">Đổi mật khẩu & tiếp tục</Button>
              </form>
            ) : (
              <form onSubmit={submit} className="space-y-5" autoComplete="on">
                <input type="text" name="b_trap_username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <input type="password" name="b_trap_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" autoComplete="off" />
                <Input
                  label="Email đăng nhập"
                  type="email"
                  required
                  maxLength={240}
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@school.edu.vn"
                  name="user_email"
                  autoComplete="username"
                  spellCheck={false}
                />
                <div className="space-y-2">
                  <Input
                    label="Mật khẩu"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={8}
                    maxLength={512}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Tối thiểu 8 ký tự"
                    name="user_password"
                    autoComplete="current-password"
                  />
                  <button type="button" onClick={() => setShowPassword(value => !value)} className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900">
                    {showPassword ? <EyeSlashIcon className="h-4 w-4" /> : <EyeIcon className="h-4 w-4" />}{showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  </button>
                </div>
                <Button type="submit" variant="primary" size="lg" isLoading={loading} className="w-full">Đăng nhập</Button>
              </form>
            )}

            <div className="mt-7 border-t border-slate-200 pt-5 text-center text-xs leading-5 text-slate-500">Tài khoản do nhà trường hoặc quản trị viên cấp.</div>
          </div>
        </section>
      </div>
    </div>
  );
};
