import React, { useState } from 'react';
import { ArrowRightIcon, Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui';

interface LandingViewProps {
  onNavigate: (view: string, extraParams?: unknown) => void;
}

const NAV_ITEMS = [
  { id: 'quy-trinh', label: 'Quy trình' },
  { id: 'truc-doc', label: 'Sáu trục đọc' },
  { id: 'giao-vien', label: 'Dành cho giáo viên' },
  { id: 've-he-thong', label: 'Thông tin hệ thống' }
];

const WORKFLOW_STEPS = [
  ['V0', 'Dự đoán trước khi đọc', 'Học sinh ghi dự đoán, căn cứ và mức tự tin trước khi đọc toàn văn.'],
  ['V1', 'Bản phân tích đầu tiên', 'Học sinh phân tích theo từng trục và trích dẫn dẫn chứng từ ngữ liệu.'],
  ['Góp ý', 'Phản hồi theo bài', 'AI và giáo viên góp ý trên đúng phiên bản học sinh đã nộp.'],
  ['V2', 'Bản chỉnh sửa', 'Học sinh sửa lập luận và ghi rõ lí do thay đổi.'],
  ['REF1', 'Tự phản tư', 'Học sinh ghi lại điều đã hiểu rõ hơn sau khi sửa bài.'],
  ['Rubric', 'Giáo viên đánh giá', 'Giáo viên chấm theo rubric gắn với nhiệm vụ.']
];

const POETIC_AXES = [
  ['01', 'Tình huống – Cốt truyện', 'Tình huống nào tổ chức mạch truyện và tạo bước ngoặt cho tác phẩm?'],
  ['02', 'Nhân vật – Chi tiết nghệ thuật', 'Chi tiết nào cho thấy số phận, nội tâm và sự chuyển biến của nhân vật?'],
  ['03', 'Người kể chuyện – Điểm nhìn', 'Điểm nhìn trần thuật chuyển dịch ra sao giữa người kể và nhân vật?'],
  ['04', 'Không gian – Thời gian', 'Bối cảnh và thời gian tác động thế nào đến hành động, tâm lí nhân vật?'],
  ['05', 'Ngôn ngữ – Giọng điệu – Biểu tượng', 'Ngôn từ, hình ảnh và giọng điệu tạo nên tầng nghĩa nào?'],
  ['06', 'Tổng hợp – Lập luận', 'Các trục đọc kết nối thế nào thành một lập luận có căn cứ?']
];

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const goToLogin = () => onNavigate('login');

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#noi-dung" className="flex min-w-0 items-center gap-3" aria-label="Trang chủ Học tốt Ngữ Văn">
            <img src="/Logo.png" alt="Logo Trường THPT Vị Thanh" className="h-9 w-9 rounded-md border border-slate-200 object-cover" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-950">Học tốt Ngữ Văn</span>
              <span className="block truncate text-xs text-slate-500">Trường THPT Vị Thanh</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Điều hướng trang giới thiệu">
            {NAV_ITEMS.map(item => <a key={item.id} href={`#${item.id}`} className="text-sm text-slate-600 hover:text-slate-950">{item.label}</a>)}
          </nav>

          <div className="flex items-center gap-2">
            <Button size="sm" onClick={goToLogin}>Đăng nhập</Button>
            <button type="button" onClick={() => setMobileMenuOpen(value => !value)} className="p-2 text-slate-600 md:hidden" aria-expanded={mobileMenuOpen} aria-controls="mobile-landing-nav" aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}>
              {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav id="mobile-landing-nav" className="border-t border-slate-200 px-4 py-3 md:hidden" aria-label="Điều hướng di động">
            {NAV_ITEMS.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setMobileMenuOpen(false)} className="block border-b border-slate-100 py-3 text-sm text-slate-700 last:border-0">{item.label}</a>)}
          </nav>
        )}
      </header>

      <main id="noi-dung">
        <section className="border-b border-slate-200">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-center">
            <div className="max-w-3xl">
              <p className="text-sm font-semibold text-primary-800">Hồ sơ đọc số · Năm học 2026–2027</p>
              <h1 className="mt-4 max-w-2xl text-4xl font-bold leading-tight tracking-tight text-slate-950 sm:text-5xl">Theo dõi quá trình đọc, viết và sửa bài.</h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">Hệ thống lưu riêng từng phiên bản bài làm, phản hồi và kết quả đánh giá để học sinh nhìn lại sự thay đổi trong cách đọc văn bản.</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Button size="lg" onClick={goToLogin} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>Đăng nhập vào hệ thống</Button>
                <a href="#quy-trinh" className="inline-flex min-h-11 items-center border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50">Xem quy trình</a>
              </div>
            </div>

            <dl className="border-y border-slate-300 text-sm">
              <div className="grid grid-cols-[5rem_1fr] gap-4 border-b border-slate-200 py-4"><dt className="font-mono font-bold text-slate-950">06</dt><dd className="text-slate-600">trục đọc thi pháp</dd></div>
              <div className="grid grid-cols-[5rem_1fr] gap-4 border-b border-slate-200 py-4"><dt className="font-mono font-bold text-slate-950">V0–V2+</dt><dd className="text-slate-600">các mốc bài làm được lưu riêng</dd></div>
              <div className="grid grid-cols-[5rem_1fr] gap-4 border-b border-slate-200 py-4"><dt className="font-mono font-bold text-slate-950">REF1</dt><dd className="text-slate-600">phiếu tự phản tư sau chỉnh sửa</dd></div>
              <div className="grid grid-cols-[5rem_1fr] gap-4 py-4"><dt className="font-mono font-bold text-slate-950">Rubric</dt><dd className="text-slate-600">đánh giá theo tiêu chí của nhiệm vụ</dd></div>
            </dl>
          </div>
        </section>

        <section id="quy-trinh" className="scroll-mt-20 border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl"><h2 className="text-2xl font-bold tracking-tight text-slate-950">Quy trình làm bài</h2><p className="mt-2 text-sm leading-6 text-slate-600">Mỗi bước tạo ra một dữ liệu riêng. Bản mới không ghi đè bản cũ.</p></div>
            <ol className="mt-8 border-t border-slate-300">
              {WORKFLOW_STEPS.map(([code, title, description], index) => (
                <li key={code} className="grid gap-2 border-b border-slate-300 py-5 sm:grid-cols-[3rem_7rem_minmax(0,1fr)] sm:gap-5">
                  <span className="font-mono text-xs text-slate-500">{String(index + 1).padStart(2, '0')}</span>
                  <strong className="text-sm text-slate-950">{code}</strong>
                  <div><h3 className="text-sm font-semibold text-slate-900">{title}</h3><p className="mt-1 text-sm leading-6 text-slate-600">{description}</p></div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        <section id="truc-doc" className="scroll-mt-20 border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl"><h2 className="text-2xl font-bold tracking-tight text-slate-950">Sáu trục đọc</h2><p className="mt-2 text-sm leading-6 text-slate-600">Các câu hỏi định hướng giúp học sinh phân tích có căn cứ thay vì viết chung chung.</p></div>
            <div className="mt-8 overflow-x-auto border-y border-slate-300">
              <table className="w-full min-w-[680px] border-collapse text-left text-sm">
                <thead><tr className="border-b border-slate-300 text-slate-500"><th className="w-16 py-3 pr-4 font-medium">STT</th><th className="w-72 px-4 py-3 font-medium">Trục đọc</th><th className="px-4 py-3 font-medium">Câu hỏi định hướng</th></tr></thead>
                <tbody className="divide-y divide-slate-200">{POETIC_AXES.map(([num, title, question]) => <tr key={num}><td className="py-4 pr-4 font-mono text-slate-500">{num}</td><th className="px-4 py-4 font-semibold text-slate-900">{title}</th><td className="px-4 py-4 leading-6 text-slate-600">{question}</td></tr>)}</tbody>
              </table>
            </div>
          </div>
        </section>

        <section id="giao-vien" className="scroll-mt-20 border-b border-slate-200 bg-slate-50">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Dành cho giáo viên</h2><p className="mt-2 text-sm leading-6 text-slate-600">Các công cụ phục vụ giao nhiệm vụ, phản hồi và đánh giá.</p></div>
            <ul className="border-t border-slate-300 text-sm text-slate-700">{['Tạo nhiệm vụ từ ngữ liệu và rubric đã chọn.', 'Đọc đúng phiên bản học sinh đã nộp; không thay bằng bản nháp.', 'Gắn nhận xét vào từng trục hoặc đoạn trích cụ thể.', 'Theo dõi V0, V1, V2, REF1 và kết quả rubric theo lớp.'].map(item => <li key={item} className="border-b border-slate-300 py-4 leading-6">{item}</li>)}</ul>
          </div>
        </section>

        <section id="ve-he-thong" className="scroll-mt-20">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div><h2 className="text-2xl font-bold tracking-tight text-slate-950">Thông tin hệ thống</h2><p className="mt-2 text-sm leading-6 text-slate-600">Hệ thống phục vụ hoạt động học tập và nghiên cứu tại trường.</p></div>
              <dl className="border-t border-slate-300 text-sm">
                <div className="grid gap-1 border-b border-slate-300 py-4 sm:grid-cols-[180px_1fr]"><dt className="font-semibold text-slate-900">Đơn vị sử dụng</dt><dd className="text-slate-600">Trường THPT Vị Thanh</dd></div>
                <div className="grid gap-1 border-b border-slate-300 py-4 sm:grid-cols-[180px_1fr]"><dt className="font-semibold text-slate-900">Đối tượng</dt><dd className="text-slate-600">Học sinh, giáo viên, phản biện và nhóm nghiên cứu</dd></div>
                <div className="grid gap-1 border-b border-slate-300 py-4 sm:grid-cols-[180px_1fr]"><dt className="font-semibold text-slate-900">Dữ liệu chính</dt><dd className="text-slate-600">Phiên bản bài làm, phản hồi, tự phản tư và kết quả rubric</dd></div>
                <div className="grid gap-1 py-4 sm:grid-cols-[180px_1fr]"><dt className="font-semibold text-slate-900">Truy cập</dt><dd className="text-slate-600">Tài khoản do nhà trường hoặc quản trị viên cấp</dd></div>
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-300 bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6"><span>Học tốt Ngữ Văn · Trường THPT Vị Thanh</span><span>Năm học 2026–2027</span></div>
      </footer>
    </div>
  );
};
