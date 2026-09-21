import React, { useEffect, useState } from 'react';
import { Badge, Button } from '../components/ui';
import {
  ArrowRightIcon,
  ArrowTopRightOnSquareIcon,
  Bars3Icon,
  XMarkIcon,
  CheckIcon,
  BookOpenIcon,
  AcademicCapIcon,
  DocumentDuplicateIcon,
  SparklesIcon,
  ShieldCheckIcon,
  PencilSquareIcon,
  ChatBubbleBottomCenterTextIcon,
  DocumentCheckIcon
} from '@heroicons/react/24/outline';

interface LandingViewProps {
  onNavigate: (view: string, extraParams?: unknown) => void;
}

// 6 Poetic axes data
const POETIC_AXES_DATA = [
  {
    num: '01',
    title: 'Tình huống – Cốt truyện',
    question: 'Tình huống nào tổ chức mạch truyện và tạo bước ngoặt nghệ thuật cho toàn bộ tác phẩm?',
    concept: 'Điểm khởi đầu và xung đột trung tâm'
  },
  {
    num: '02',
    title: 'Nhân vật – Chi tiết nghệ thuật',
    question: 'Chi tiết đắt giá nào khắc họa số phận, đời sống nội tâm và sự chuyển biến tính cách?',
    concept: 'Hạt nhân cấu trúc hình tượng'
  },
  {
    num: '03',
    title: 'Người kể chuyện – Điểm nhìn',
    question: 'Điểm nhìn trần thuật chuyển dịch ra sao giữa người kể chuyện và tâm cảm nhân vật?',
    concept: 'Khoảng cách thẩm mĩ và giọng điệu'
  },
  {
    num: '04',
    title: 'Không gian – Thời gian nghệ thuật',
    question: 'Bối cảnh không gian và dòng thời gian tác động thế nào đến hành động và tâm lí nhân vật?',
    concept: 'Môi trường sinh tồn và nhịp điệu trần thuật'
  },
  {
    num: '05',
    title: 'Ngôn ngữ – Giọng điệu – Biểu tượng',
    question: 'Lớp ngôn từ, hình ảnh biểu tượng và nhạc tính tạo nên phong cách nghệ thuật độc đáo ra sao?',
    concept: 'Chất liệu ngôn từ và tầng nghĩa biểu trưng'
  },
  {
    num: '06',
    title: 'Tổng hợp – Lập luận',
    question: 'Những luận điểm, thông điệp tư tưởng nào được đúc kết từ toàn bộ cấu trúc thẩm mĩ của bài đọc?',
    concept: 'Khái quát tư tưởng và giá trị nhân văn'
  }
];

// Workflow storytelling data
const WORKFLOW_STEPS = [
  {
    code: 'V0',
    title: 'Dự đoán trước khi đọc',
    desc: 'Học sinh ghi lại dự đoán, căn cứ và mức tự tin trước khi đọc toàn văn.',
    artifact: 'Lưu V0 riêng · Không chấm đúng – sai'
  },
  {
    code: 'V1',
    title: 'Bản phân tích đầu tiên',
    desc: 'Học sinh phân tích theo từng trục thi pháp và trích dẫn dẫn chứng từ ngữ liệu.',
    artifact: 'Lưu V1 · Không ghi đè bản cũ'
  },
  {
    code: 'PHẢN HỒI',
    title: 'Góp ý AI & giáo viên',
    desc: 'AI và giáo viên góp ý theo từng trục và dẫn chứng.',
    artifact: 'Phản hồi được lưu theo từng phiên bản'
  },
  {
    code: 'V2',
    title: 'Bản chỉnh sửa',
    desc: 'Học sinh đọc góp ý, sửa lập luận và ghi lí do thay đổi.',
    artifact: 'Lưu V2 · Có thể so sánh với V1'
  },
  {
    code: 'REF1',
    title: 'Phiếu tự phản tư',
    desc: 'Học sinh ghi lại điều đã hiểu rõ hơn sau khi sửa bài.',
    artifact: 'Hoàn thành REF1 trước khi giáo viên chấm'
  },
  {
    code: 'RUBRIC',
    title: 'Rubric giáo viên',
    desc: 'Giáo viên chấm bài theo Rubric của nhiệm vụ.',
    artifact: 'Điểm được tính từ Rubric đã chọn'
  }
];

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStoryStep, setActiveStoryStep] = useState(0);
  const [demoTab, setDemoTab] = useState<'v1' | 'feedback' | 'v2'>('v2');
  const [activeNav, setActiveNav] = useState('');

  // Scroll listener for active header link
  useEffect(() => {
    const handleScroll = () => {
      const sections = ['trai-nghiem', 'quy-trinh', 'truc-doc', 'giao-vien', 've-he-thong'];
      const scrollPos = window.scrollY + 100;
      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPos >= top && scrollPos < top + height) {
            setActiveNav(section);
            return;
          }
        }
      }
      if (window.scrollY < 200) {
        setActiveNav('');
      }
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900 font-sans selection:bg-primary-100 selection:text-primary-950">
      {/* 1. Header Sticky */}
      <header className="sticky top-0 z-40 border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        <div className="mx-auto flex h-[68px] max-w-7xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          {/* Logo & Identity */}
          <button
            type="button"
            onClick={() => {
              window.scrollTo({ top: 0, behavior: 'smooth' });
              setActiveNav('');
            }}
            className="flex min-w-0 items-center gap-3 text-left focus-visible:outline-none"
            aria-label="Trang chủ Học tốt Ngữ Văn"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white shadow-xs">
              <img src="/Logo.png" alt="Logo Trường THPT Vị Thanh" className="h-full w-full object-cover" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-base font-bold text-slate-950 leading-tight">
                Học tốt Ngữ Văn
              </span>
              <span className="block truncate text-xs font-medium text-slate-500">
                Trường THPT Vị Thanh
              </span>
            </span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden items-center gap-7 lg:flex" aria-label="Điều hướng chính trang chủ">
            {[
              { id: 'trai-nghiem', label: 'Trải nghiệm' },
              { id: 'quy-trinh', label: 'Quy trình' },
              { id: 'truc-doc', label: '6 trục đọc' },
              { id: 'giao-vien', label: 'Giáo viên' },
              { id: 've-he-thong', label: 'Về hệ thống' }
            ].map(item => (
              <a
                key={item.id}
                href={`#${item.id}`}
                className={`relative py-2 text-sm font-medium transition-colors ${
                  activeNav === item.id
                    ? 'text-primary-800 font-semibold'
                    : 'text-slate-600 hover:text-slate-950'
                }`}
              >
                {item.label}
                {activeNav === item.id && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 rounded-full bg-primary-600" />
                )}
              </a>
            ))}
          </nav>

          {/* Right Action & Mobile Toggle */}
          <div className="flex items-center gap-3">
            <Button
              variant="primary"
              size="sm"
              onClick={() => onNavigate('login')}
              className="font-semibold shadow-xs"
            >
              Đăng nhập
            </Button>

            <button
              type="button"
              onClick={() => setMobileMenuOpen(prev => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 lg:hidden"
              aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu điều hướng'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="border-b border-slate-200 bg-white px-4 py-4 shadow-lg lg:hidden">
            <nav className="flex flex-col space-y-2 text-sm font-medium" aria-label="Điều hướng di động">
              {[
                { id: 'trai-nghiem', label: 'Trải nghiệm' },
                { id: 'quy-trinh', label: 'Quy trình' },
                { id: 'truc-doc', label: '6 trục đọc' },
                { id: 'giao-vien', label: 'Giáo viên' },
                { id: 've-he-thong', label: 'Về hệ thống' }
              ].map(item => (
                <a
                  key={item.id}
                  href={`#${item.id}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-lg px-3 py-2.5 text-slate-700 hover:bg-slate-50 hover:text-slate-950"
                >
                  {item.label}
                </a>
              ))}
              <div className="pt-2 border-t border-slate-100">
                <Button
                  variant="primary"
                  size="sm"
                  className="w-full justify-center"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onNavigate('login');
                  }}
                >
                  Đăng nhập vào hệ thống
                </Button>
              </div>
            </nav>
          </div>
        )}
      </header>

      <main>
        {/* 2. Hero Section */}
        <section id="trai-nghiem" className="relative overflow-hidden border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-[45%_55%]">
              {/* Left Column: Academic Editorial Copy */}
              <div className="animate-hero-text space-y-6">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-primary-600" />
                  <span>Trường THPT Vị Thanh · Năm học 2026–2027</span>
                </div>

                <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-bold tracking-tight text-slate-950 leading-[1.08]">
                  Đọc sâu hơn<br />qua từng phiên bản.
                </h1>

                <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-[62ch]">
                  Học sinh lưu từng phiên bản bài làm, nhận góp ý và xem lại quá trình sửa bài.
                </p>

                {/* CTAs */}
                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <Button
                    variant="primary"
                    size="lg"
                    rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                    onClick={() => onNavigate('login')}
                    className="font-semibold shadow-xs"
                  >
                    Đăng nhập vào hệ thống
                  </Button>

                  <a
                    href="#quy-trinh"
                    className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:border-slate-300 hover:bg-slate-50 transition"
                  >
                    Xem quy trình
                  </a>
                </div>

                {/* Mini Workflow Nodes */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2.5">
                    Quy trình làm bài
                  </div>
                  <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
                    <span className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-slate-700">V0 Dự đoán</span>
                    <span className="text-slate-300">→</span>
                    <span className="rounded-md border border-primary-200 bg-primary-50 px-2.5 py-1 text-primary-900">V1 Bản đầu</span>
                    <span className="text-slate-300">→</span>
                    <span className="rounded-md border border-sky-200 bg-sky-50 px-2.5 py-1 text-sky-900">Phản hồi AI/GV</span>
                    <span className="text-slate-300">→</span>
                    <span className="rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-emerald-900">V2 Chỉnh sửa</span>
                    <span className="text-slate-300">→</span>
                    <span className="rounded-md border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-900">REF1 Tự phản tư</span>
                    <span className="text-slate-300">→</span>
                    <span className="rounded-md border border-slate-900 bg-slate-900 px-2.5 py-1 text-white">Rubric Giáo viên</span>
                  </div>
                </div>
              </div>

              {/* Right Column: HTML/CSS Product Mockup (PortfolioEditor V4) */}
              <div className="animate-hero-mockup">
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
                  {/* Mockup Window Titlebar */}
                  <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="h-3 w-3 rounded-full bg-slate-200" />
                      <span className="h-3 w-3 rounded-full bg-slate-200" />
                      <span className="h-3 w-3 rounded-full bg-slate-200" />
                      <span className="ml-2 font-mono text-xs font-semibold text-slate-600 truncate">
                        Phân tích tác phẩm Vợ nhặt (Kim Lân)
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        <CheckIcon className="h-3 w-3" />
                        <span>Đã lưu</span>
                      </span>
                      <Badge size="sm" variant="primary">V1 · Bản đầu</Badge>
                    </div>
                  </div>

                  {/* Mockup Workspace 3-Pane Body */}
                  <div className="grid grid-cols-1 md:grid-cols-[160px_minmax(0,1fr)_190px] text-xs divide-y md:divide-y-0 md:divide-x divide-slate-200 bg-white min-h-[340px]">
                    {/* Left Pane: 6 Axes Rail */}
                    <div className="bg-slate-50/50 p-2.5 space-y-1">
                      <span className="block font-bold uppercase tracking-wider text-slate-400 mb-1">
                        6 Trục thi pháp
                      </span>
                      {[
                        { title: '1. Cốt truyện', status: 'done' },
                        { title: '2. Nhân vật', status: 'done' },
                        { title: '3. Điểm nhìn', status: 'active' },
                        { title: '4. Không gian', status: 'todo' },
                        { title: '5. Ngôn ngữ', status: 'todo' },
                        { title: '6. Lập luận', status: 'todo' }
                      ].map(item => (
                        <div
                          key={item.title}
                          className={`flex items-center justify-between rounded px-2 py-1.5 ${
                            item.status === 'active'
                              ? 'bg-primary-50 text-primary-950 font-bold border border-primary-200'
                              : item.status === 'done'
                              ? 'text-slate-700 font-medium'
                              : 'text-slate-400'
                          }`}
                        >
                          <span className="truncate">{item.title}</span>
                          {item.status === 'done' ? (
                            <CheckIcon className="h-3 w-3 text-emerald-600 shrink-0" />
                          ) : item.status === 'active' ? (
                            <span className="h-1.5 w-1.5 rounded-full bg-primary-600 shrink-0" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-300 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Center Pane: Editor Writing Canvas */}
                    <div className="p-4 space-y-2.5">
                      <div className="border-b border-slate-100 pb-2">
                        <span className="font-bold text-slate-900 block text-xs">
                          Trục 3: Người kể chuyện – Điểm nhìn trần thuật
                        </span>
                        <p className="text-slate-500 text-xs mt-0.5">
                          Yêu cầu: Chỉ ra sự luân chuyển điểm nhìn giữa người kể và tâm trạng bà cụ Tứ.
                        </p>
                      </div>

                      <div className="space-y-2 leading-relaxed text-slate-800 text-xs font-sans">
                        <p>
                          Kim Lân đã lựa chọn điểm nhìn trần thuật nửa trực tiếp khi miêu tả tâm trạng của bà cụ Tứ. Người kể chuyện dường như hòa vào nỗi lòng người mẹ nghèo để thấu cảm sâu sắc nỗi xót xa xen lẫn tủi hờn khi con trai nhặt được vợ giữa ngày đói giáp hạt.
                        </p>
                        <blockquote className="rounded border-l-2 border-primary-400 bg-slate-50 p-2 italic text-slate-600">
                          &ldquo;Bà lão cúi đầu nín lặng. Bà lão hiểu rồi. Lòng người mẹ nghèo khổ ấy còn hiểu ra biết bao nhiêu cơ sự...&rdquo;
                        </blockquote>
                        <p>
                          Từ điểm nhìn nội tâm này, tình thương con và niềm tin hướng về sự sống được thắp sáng một cách chân thực, đầy xúc động.
                        </p>
                      </div>
                    </div>

                    {/* Right Pane: Inspector & Feedback Snippet */}
                    <div className="bg-slate-50/50 p-3 space-y-3">
                      <div>
                        <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                          <span>Phản hồi gắn kèm</span>
                          <span className="rounded bg-sky-100 text-sky-800 px-1.5 py-0.2 font-mono">1</span>
                        </div>
                        <div className="mt-2 space-y-2">
                          <div className="rounded border border-sky-200 bg-white p-2 text-xs">
                            <span className="font-semibold text-sky-950 block">Góp ý:</span>
                            <p className="mt-1 text-slate-600 leading-normal">
                              Em đã nhận diện đúng điểm nhìn nửa trực tiếp. Ở bản V2, hãy đối chiếu thêm với chi tiết nồi chè khoán để làm rõ chiều sâu nhân đạo.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="border-t border-slate-200 pt-2 text-slate-400">
                        <span className="font-bold uppercase tracking-wider block mb-1">Thống kê bài</span>
                        <span>542 từ · 6 dẫn chứng</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Product Principle Strip */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="grid grid-cols-2 gap-6 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-slate-200">
              <div className="pt-4 sm:pt-0 sm:px-4 first:pl-0">
                <div className="font-mono text-3xl font-bold text-slate-900 tracking-tight">06</div>
                <div className="mt-1 text-sm font-bold text-slate-900">Trục đọc thi pháp</div>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                  Dùng cho truyện ngắn, tiểu thuyết và thơ.
                </p>
              </div>

              <div className="pt-4 sm:pt-0 sm:px-4">
                <div className="font-mono text-3xl font-bold text-primary-700 tracking-tight">V0 → V2+</div>
                <div className="mt-1 text-sm font-bold text-slate-900">Lưu từng phiên bản</div>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                  Mỗi lần nộp được lưu riêng; bản sửa không ghi đè bản cũ.
                </p>
              </div>

              <div className="pt-4 sm:pt-0 sm:px-4">
                <div className="font-mono text-3xl font-bold text-amber-700 tracking-tight">REF1</div>
                <div className="mt-1 text-sm font-bold text-slate-900">Tự phản tư sau sửa</div>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                  Học sinh ghi lại điều đã thay đổi sau khi sửa.
                </p>
              </div>

              <div className="pt-4 sm:pt-0 sm:px-4 last:pr-0">
                <div className="font-mono text-3xl font-bold text-slate-900 tracking-tight">RUBRIC</div>
                <div className="mt-1 text-sm font-bold text-slate-900">Giáo viên đánh giá</div>
                <p className="mt-0.5 text-xs text-slate-500 leading-relaxed">
                  Rubric 4 mức được tính theo tiêu chí của nhiệm vụ.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Product Story Section: Workflow Storytelling */}
        <section id="quy-trinh" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid gap-12 lg:grid-cols-[380px_minmax(0,1fr)]">
              {/* Left Column: Sticky Story Kicker */}
              <div className="lg:sticky lg:top-24 self-start space-y-4">
                <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                  Cách học
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-tight">
                  Một bài đọc không chỉ có một đáp án.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Học sinh có thể đọc lại, nhận góp ý, sửa lập luận và tự nhìn lại cách hiểu của mình.
                </p>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-xs space-y-2 text-slate-600">
                  <span className="font-bold text-slate-900 block">Cách hệ thống ghi nhận:</span>
                  <p>
                    Hệ thống lưu từng mốc V0, V1, V2 và REF1 thay vì chỉ giữ bài cuối.
                  </p>
                </div>
              </div>

              {/* Right Column: Vertical Storytelling Steps */}
              <div className="space-y-6">
                {WORKFLOW_STEPS.map((step, idx) => {
                  const isActive = activeStoryStep === idx;
                  return (
                    <button
                      type="button"
                      key={step.code}
                      onClick={() => setActiveStoryStep(idx)}
                      aria-pressed={isActive}
                      className={`w-full rounded-xl border p-5 text-left sm:p-6 transition-all duration-200 ${
                        isActive
                          ? 'border-primary-400 bg-primary-50/40 shadow-xs ring-1 ring-primary-400'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50'
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg font-mono text-xs font-bold ${
                          isActive ? 'bg-primary-700 text-white shadow-xs' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {step.code}
                        </span>
                        <div className="space-y-1.5 min-w-0">
                          <h3 className="text-base font-bold text-slate-950">
                            {step.title}
                          </h3>
                          <p className="text-sm text-slate-600 leading-relaxed">
                            {step.desc}
                          </p>
                          <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-primary-800">
                            <span className="font-mono">→</span>
                            <span>{step.artifact}</span>
                          </div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* 5. V1 → Feedback → V2 Interactive Showcase */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20 space-y-8">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                Minh họa đối chiếu
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Nhìn thấy điều gì đã thay đổi.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                So sánh V1 và V2 để thấy phần được thêm, bớt hoặc sửa.
              </p>
            </div>

            {/* Metric Summary Strip */}
            <div className="flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-xs font-semibold text-slate-700 shadow-xs">
              <span className="font-mono text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded border border-emerald-200">
                +42 từ thêm mới
              </span>
              <span className="font-mono text-rose-700 font-bold bg-rose-50 px-2.5 py-1 rounded border border-rose-200">
                −12 từ lược bỏ
              </span>
              <span className="font-mono text-amber-700 font-bold bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                2/6 trục thi pháp hoàn thiện
              </span>
              <span className="text-slate-400 ml-auto italic font-normal">
                * Dữ liệu minh họa
              </span>
            </div>

            {/* Mobile Tab Switcher */}
            <div className="flex gap-2 sm:hidden">
              {(['v1', 'feedback', 'v2'] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setDemoTab(tab)}
                  className={`flex-1 rounded-lg border py-2 text-xs font-bold transition ${
                    demoTab === tab ? 'border-primary-700 bg-primary-700 text-white' : 'border-slate-200 bg-white text-slate-600'
                  }`}
                >
                  {tab === 'v1' ? 'V1 (Bản đầu)' : tab === 'feedback' ? 'Phản hồi GV' : 'V2 (Chỉnh sửa)'}
                </button>
              ))}
            </div>

            {/* 3-Column Progression on Desktop */}
            <div className="grid gap-5 sm:grid-cols-3">
              {/* Column 1: V1 Initial */}
              <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-xs space-y-3 ${demoTab !== 'v1' ? 'hidden sm:block' : ''}`}>
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <Badge size="sm" variant="outline">V1 · Bản đầu</Badge>
                  <span className="text-xs text-slate-400">Chưa nhận góp ý</span>
                </div>
                <div className="text-xs font-bold text-slate-800">Trục: Tình huống – Cốt truyện</div>
                <p className="text-xs leading-relaxed text-slate-700">
                  Kim Lân miêu tả tình huống nhặt vợ trong nạn đói năm 1945. Tràng là một người nghèo ở xóm ngụ cư, bất ngờ đưa một người phụ nữ xa lạ về làm vợ chỉ sau vài câu bông đùa và bốn bát bánh đúc.
                </p>
                <div className="rounded border-l-2 border-slate-300 bg-slate-50 p-2 text-xs italic text-slate-500">
                  &ldquo;Có ăn gì thì ra ăn cùng cho vui...&rdquo;
                </div>
              </div>

              {/* Column 2: Teacher Feedback */}
              <div className={`rounded-xl border border-sky-200 bg-sky-50/60 p-5 shadow-xs space-y-3 ${demoTab !== 'feedback' ? 'hidden sm:block' : ''}`}>
                <div className="flex items-center justify-between border-b border-sky-200 pb-2.5">
                  <Badge size="sm" variant="blue">Phản hồi của giáo viên</Badge>
                  <span className="text-xs text-sky-800 font-medium">Gắn với V1</span>
                </div>
                <div className="text-xs font-bold text-sky-950">Góp ý:</div>
                <p className="text-xs leading-relaxed text-slate-800">
                  “Em đã nắm được sự kiện bề nổi của tình huống truyện. Tuy nhiên, cần lí giải rõ: Tại sao tình huống oái oăm, cười ra nước mắt này lại làm bật lên khát vọng sống, hơi ấm gia đình và niềm tin vào tương lai của con người Việt Nam?”
                </p>
                <div className="text-xs text-slate-500 pt-1">
                  Định hướng: Bổ sung chi tiết bữa cơm ngày đói và hình ảnh lá cờ đỏ.
                </div>
              </div>

              {/* Column 3: V2 Revised with Diff Highlights */}
              <div className={`rounded-xl border border-emerald-200 bg-white p-5 shadow-xs space-y-3 ${demoTab !== 'v2' ? 'hidden sm:block' : ''}`}>
                <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                  <Badge size="sm" variant="emerald">V2 · Bản chỉnh sửa</Badge>
                  <span className="text-xs text-emerald-800 font-bold">So sánh với V1</span>
                </div>
                <div className="text-xs font-bold text-slate-800">Trục: Tình huống – Cốt truyện</div>
                <p className="text-xs leading-relaxed text-slate-800">
                  Nhà văn Kim Lân đã khắc họa sâu sắc tình huống nhặt vợ trong nạn đói năm 1945.{' '}
                  <span className="diff-tag-added">
                    Tình huống éo le này không đơn thuần tạo tiếng cười bi hài, mà còn là một phép thử nghiệt ngã khẳng định khát vọng hạnh phúc gia đình và tình người ấm áp giữa ranh giới sống chết.
                  </span>{' '}
                  <span className="diff-tag-removed">Tràng nhặt vợ sau bốn bát bánh đúc.</span>{' '}
                  <span className="diff-tag-changed">
                    Dù phía trước là bóng tối đói khát, nhưng sự xuất hiện của người vợ nhặt đã thổi vào căn nhà dột nát một luồng sinh khí mới.
                  </span>
                </p>
                <div className="rounded border-l-2 border-emerald-400 bg-emerald-50/50 p-2 text-xs italic text-slate-700">
                  &ldquo;Trong óc Tràng vẫn thấy đám người đói và lá cờ đỏ bay phấp phới...&rdquo;
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 6. 6 Poetic Axes Grid */}
        <section id="truc-doc" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20 space-y-10">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                6 trục thi pháp
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                6 trục thi pháp.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Gợi ý các hướng đọc và phân tích theo chương trình GDPT 2018.
              </p>
            </div>

            {/* 3x2 Cards Grid */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {POETIC_AXES_DATA.map(axis => (
                <div
                  key={axis.num}
                  className="academic-card-hover flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-6 shadow-xs"
                >
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-primary-700 bg-primary-50 px-2.5 py-1 rounded border border-primary-200">
                        Trục {axis.num}
                      </span>
                      <span className="text-xs font-semibold text-slate-400">{axis.concept}</span>
                    </div>
                    <h3 className="text-base font-bold text-slate-950 leading-snug">
                      {axis.title}
                    </h3>
                    <p className="text-xs leading-relaxed text-slate-600">
                      {axis.question}
                    </p>
                  </div>

                  <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                    <span>Câu hỏi gợi ý</span>
                    <span className="font-mono">GDPT 2018</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 7. Student Workspace Showcase */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              <div className="space-y-6">
                <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                  Không gian học sinh
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-tight">
                  Viết theo từng trục, dễ theo dõi.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Mỗi trục có câu hỏi riêng; bản nháp được tự động lưu và có góp ý theo bài.
                </p>

                {/* Feature Pills */}
                <div className="flex flex-wrap gap-2 text-xs font-semibold">
                  <Badge variant="primary">Chế độ tập trung</Badge>
                  <Badge variant="outline">Tự động lưu</Badge>
                  <Badge variant="outline">6 trục thi pháp</Badge>
                  <Badge variant="outline">Lịch sử phiên bản</Badge>
                  <Badge variant="outline">Góp ý đúng vị trí</Badge>
                </div>

                <div className="space-y-4 pt-2 text-xs leading-relaxed">
                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-100 text-primary-800 font-bold">1</div>
                    <div>
                      <strong className="text-slate-900 block font-semibold text-sm">Viết theo từng trục</strong>
                      <span className="text-slate-600">Mỗi trục có câu hỏi riêng để học sinh tập trung vào đúng phần cần viết.</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-100 text-primary-800 font-bold">2</div>
                    <div>
                      <strong className="text-slate-900 block font-semibold text-sm">Tự động lưu</strong>
                      <span className="text-slate-600">Bản nháp được tự động lưu trong khi viết.</span>
                    </div>
                  </div>

                  <div className="flex gap-3">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-primary-100 text-primary-800 font-bold">3</div>
                    <div>
                      <strong className="text-slate-900 block font-semibold text-sm">Nhìn lại sự tiến bộ của bản thân</strong>
                      <span className="text-slate-600">V1, V2 và các lần sửa được lưu riêng để học sinh xem lại quá trình làm bài.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Showcase Visual Card */}
              <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <PencilSquareIcon className="h-4 w-4 text-primary-700" />
                    <span className="font-bold text-slate-900 text-xs">Bài viết của học sinh</span>
                  </div>
                  <Badge size="sm" variant="emerald">Chế độ tập trung</Badge>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-4 space-y-2 text-xs">
                  <div className="flex items-center justify-between text-slate-500 font-mono">
                    <span>Trục 1: Tình huống – Cốt truyện</span>
                    <span>348 từ</span>
                  </div>
                  <p className="text-slate-700 italic leading-relaxed">
                    &ldquo;Kim Lân không tô vẽ cái đói một cách ghê rợn đơn thuần, mà đặt nhân vật vào tình huống nhặt vợ để thử thách phẩm giá con người...&rdquo;
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg border border-slate-200 p-3 bg-white">
                    <span className="font-semibold text-slate-800 block mb-1">Dẫn chứng tác phẩm</span>
                    <span className="text-slate-500">4 trích đoạn ngữ liệu đã gắn vào bài</span>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-3 bg-white">
                    <span className="font-semibold text-slate-800 block mb-1">Góp ý</span>
                    <span className="text-emerald-700 font-semibold">2 nhận xét đã tiếp thu</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 8. Teacher Workspace Showcase */}
        <section id="giao-vien" className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
            <div className="grid items-center gap-12 lg:grid-cols-2">
              {/* Teacher Console Mockup */}
              <div className="order-2 lg:order-1 rounded-xl border border-slate-200 bg-white p-5 shadow-lg shadow-slate-200/50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div className="flex items-center gap-2">
                    <DocumentCheckIcon className="h-4 w-4 text-slate-900" />
                    <span className="font-bold text-slate-900 text-xs">Bảng điều khiển chấm bài giáo viên</span>
                  </div>
                  <Badge size="sm" variant="outline">Học sinh 12/40</Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg border border-slate-200 p-2.5 bg-slate-50">
                    <span className="text-slate-400 block font-mono">Phiên bản</span>
                    <strong className="text-slate-900">V2 (Bản sửa)</strong>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2.5 bg-slate-50">
                    <span className="text-slate-400 block font-mono">Trạng thái</span>
                    <strong className="text-amber-700">Chờ chấm Rubric</strong>
                  </div>
                  <div className="rounded-lg border border-slate-200 p-2.5 bg-slate-50">
                    <span className="text-slate-400 block font-mono">Phiếu REF1</span>
                    <strong className="text-emerald-700">Đã hoàn thành</strong>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-100 bg-slate-50/70 p-3 text-xs space-y-1.5">
                  <span className="font-bold text-slate-900 block">Đọc phiếu tự phản tư (REF1):</span>
                  <p className="text-slate-600 leading-relaxed italic">
                    &ldquo;Sau khi đọc góp ý của thầy/cô về chi tiết nồi chè khoán, em nhận ra sự chuyển biến tâm trạng của bà cụ Tứ từ tủi hờn sang hy vọng mới là hạt nhân của tư tưởng nhân đạo.&rdquo;
                  </p>
                </div>
              </div>

              {/* Teacher Copy */}
              <div className="order-1 lg:order-2 space-y-6">
                <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                  Giáo viên
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950 leading-tight">
                  Giáo viên theo dõi toàn bộ quá trình sửa bài.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Xem từng phiên bản, góp ý, REF1 và chấm Rubric trên cùng một bài.
                </p>

                {/* 3 Pedagogical Questions */}
                <div className="space-y-3.5 pt-1 text-xs">
                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <strong className="text-slate-900 block text-sm font-semibold mb-1">
                      1. Bài nào cần xem trước?
                    </strong>
                    <span className="text-slate-600 leading-relaxed">
                      Hàng đợi phân loại rõ bài mới nộp V1, bài vừa chỉnh sửa V2 hoặc bài học sinh đã hoàn tất REF1 cần chấm điểm.
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <strong className="text-slate-900 block text-sm font-semibold mb-1">
                      2. Học sinh đã thay đổi điều gì?
                    </strong>
                    <span className="text-slate-600 leading-relaxed">
                      So sánh V1 và V2 để thấy ngay phần được thêm, bớt hoặc sửa.
                    </span>
                  </div>

                  <div className="rounded-lg border border-slate-200 bg-slate-50/60 p-3.5">
                    <strong className="text-slate-900 block text-sm font-semibold mb-1">
                      3. Trục thi pháp nào cả lớp đang gặp khó?
                    </strong>
                    <span className="text-slate-600 leading-relaxed">
                      Thống kê theo lớp cho biết trục nào học sinh đang yếu để giáo viên điều chỉnh bài dạy.
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 9. Analytics Preview Section */}
        <section className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20 space-y-8">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-3">
              <div className="max-w-2xl space-y-2">
                <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                  Phân tích lớp
                </div>
                <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                  Theo dõi tiến độ của lớp.
                </h2>
                <p className="text-base text-slate-600 leading-relaxed">
                  Xem kết quả theo từng trục để biết phần nào cả lớp còn yếu.
                </p>
              </div>
              <Badge size="sm" variant="outline">Ví dụ minh họa lớp học</Badge>
            </div>

            {/* Static Analytics Preview Bars */}
            <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="font-bold text-slate-900 text-sm">
                  Kết quả trung bình theo 6 trục (Lớp 12A1 · 40 học sinh)
                </span>
                <span className="text-xs text-slate-400 font-mono">Điểm trung bình: 72.8%</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  { label: 'Tình huống – Cốt truyện', score: 82, status: 'emerald' },
                  { label: 'Nhân vật – Chi tiết', score: 78, status: 'emerald' },
                  { label: 'Người kể – Điểm nhìn', score: 61, status: 'amber' },
                  { label: 'Không gian – Thời gian', score: 69, status: 'primary' },
                  { label: 'Ngôn ngữ – Giọng điệu', score: 76, status: 'emerald' },
                  { label: 'Tổng hợp – Lập luận', score: 71, status: 'primary' }
                ].map(item => (
                  <div key={item.label} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3.5 space-y-2 text-xs">
                    <div className="flex items-center justify-between font-semibold text-slate-800">
                      <span>{item.label}</span>
                      <span className="font-mono font-bold">{item.score}%</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                      <div
                        className={`h-full rounded-full ${
                          item.score >= 75 ? 'bg-emerald-600' : item.score >= 70 ? 'bg-primary-600' : 'bg-amber-500'
                        }`}
                        style={{ width: `${item.score}%` }}
                      />
                    </div>
                    <div className="text-slate-400 text-xs">
                      {item.score < 65 ? 'Cần củng cố' : 'Đạt'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* 10. AI Section: AI + Teacher Responsibility */}
        <section className="border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20 space-y-10">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                AI trong hệ thống
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                AI góp ý, giáo viên chấm.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                AI đưa góp ý để học sinh sửa bài; giáo viên là người quyết định điểm.
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-sky-100 text-sky-800">
                  <SparklesIcon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-950">1. AI góp ý</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  AI chỉ ra điểm cần xem lại theo các trục và dẫn chứng trong bài.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800">
                  <PencilSquareIcon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-950">2. Học sinh sửa bài</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  Học sinh tự chọn cách sửa, nộp V2 và ghi lí do thay đổi trong REF1.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-6 space-y-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white">
                  <AcademicCapIcon className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold text-slate-950">3. Giáo viên chấm</h3>
                <p className="text-xs leading-relaxed text-slate-600">
                  Giáo viên xem bài sửa, góp ý đã có và chấm Rubric.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 11. Academic Integrity Section */}
        <section id="ve-he-thong" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20 space-y-10">
            <div className="max-w-3xl space-y-3">
              <div className="text-xs font-bold uppercase tracking-wider text-primary-700">
                Lịch sử bài làm
              </div>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-950">
                Lưu đầy đủ lịch sử bài làm.
              </h2>
              <p className="text-base text-slate-600 leading-relaxed">
                Mỗi lần nộp, góp ý và REF1 đều được lưu để có thể xem lại.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
                <DocumentDuplicateIcon className="h-5 w-5 text-primary-700" />
                <h3 className="text-sm font-bold text-slate-950">Lưu từng phiên bản</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mỗi lần nộp tạo một bản riêng; V2 không ghi đè V1.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
                <ChatBubbleBottomCenterTextIcon className="h-5 w-5 text-sky-700" />
                <h3 className="text-sm font-bold text-slate-950">Góp ý có người gửi</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Mỗi góp ý lưu người gửi, thời điểm và đoạn bài liên quan.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
                <BookOpenIcon className="h-5 w-5 text-amber-700" />
                <h3 className="text-sm font-bold text-slate-950">Phiếu tự phản tư REF1</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Học sinh ghi lại điều đã thay đổi sau khi sửa bài.
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-5 space-y-2 shadow-xs">
                <ShieldCheckIcon className="h-5 w-5 text-emerald-700" />
                <h3 className="text-sm font-bold text-slate-950">Rubric theo nhiệm vụ</h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Giáo viên chấm theo 4 mức của Rubric đã gắn với nhiệm vụ.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 12. Final CTA Section */}
        <section className="bg-slate-950 text-white py-16 sm:py-20 border-b border-slate-900">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-center space-y-6">
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white leading-tight">
              Bắt đầu từ bài đọc tiếp theo.
            </h2>
            <p className="mx-auto max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
              Tài khoản do nhà trường cấp. Đăng nhập để bắt đầu.
            </p>
            <div className="pt-2">
              <Button
                variant="primary"
                size="lg"
                rightIcon={<ArrowRightIcon className="h-4 w-4" />}
                onClick={() => onNavigate('login')}
                className="font-semibold shadow-xs"
              >
                Đăng nhập vào hệ thống
              </Button>
            </div>
            <p className="text-xs text-slate-500">
              Hệ thống không hỗ trợ đăng ký công khai. Học sinh liên hệ giáo viên bộ môn nếu chưa nhận được tài khoản.
            </p>
          </div>
        </section>

        {/* 13. Contact Section */}
        <section id="lien-he" className="border-b border-slate-200 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
            <div className="grid gap-8 lg:grid-cols-[260px_minmax(0,1fr)]">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Thông tin liên hệ</h2>
                <p className="mt-2 text-sm text-slate-600">
                  Trường THPT Vị Thanh · Đơn vị chủ quản và triển khai hệ thống hồ sơ đọc số môn Ngữ văn.
                </p>
              </div>

              <div className="divide-y divide-slate-200 border-y border-slate-200 text-xs">
                <div className="grid gap-1 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6">
                  <div className="font-bold text-slate-900">Địa chỉ</div>
                  <div className="leading-relaxed text-slate-700">
                    Số 559, đường Trần Hưng Đạo, khu vực 9, phường Vị Thanh, TP. Cần Thơ
                  </div>
                </div>

                <div className="grid gap-1 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6">
                  <div className="font-bold text-slate-900">Điện thoại liên hệ</div>
                  <div className="leading-relaxed text-slate-700">0965 163 188</div>
                </div>

                <div className="grid gap-1 py-4 sm:grid-cols-[140px_minmax(0,1fr)] sm:gap-6">
                  <div className="font-bold text-slate-900">Cổng thông tin trường</div>
                  <a
                    className="inline-flex items-center gap-1.5 font-semibold text-primary-800 hover:underline"
                    href="https://thptvithanh.cantho.edu.vn/"
                    target="_blank"
                    rel="noreferrer"
                  >
                    <span>thptvithanh.cantho.edu.vn</span>
                    <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5 shrink-0" />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 14. Footer */}
      <footer className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3 pb-8 border-b border-slate-100 text-xs">
            {/* Col 1: Brand */}
            <div className="space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-white">
                  <img src="/Logo.png" alt="Logo Trường THPT Vị Thanh" className="h-full w-full object-cover" />
                </span>
                <span className="font-bold text-slate-900 text-sm">Học tốt Ngữ Văn</span>
              </div>
              <p className="text-slate-500 leading-relaxed">
                Hệ thống hồ sơ đọc số môn Ngữ văn theo 6 trục thi pháp dành cho học sinh Trường THPT Vị Thanh.
              </p>
            </div>

            {/* Col 2: Navigation */}
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Điều hướng nhanh
              </span>
              <ul className="space-y-1.5 text-slate-600">
                <li><a href="#trai-nghiem" className="hover:text-slate-950">Trải nghiệm</a></li>
                <li><a href="#quy-trinh" className="hover:text-slate-950">Quy trình</a></li>
                <li><a href="#truc-doc" className="hover:text-slate-950">6 trục đọc</a></li>
                <li><a href="#giao-vien" className="hover:text-slate-950">Giáo viên</a></li>
                <li><button type="button" onClick={() => onNavigate('login')} className="hover:text-slate-950 text-left">Đăng nhập tài khoản</button></li>
              </ul>
            </div>

            {/* Col 3: School details */}
            <div className="space-y-2">
              <span className="font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Đơn vị đào tạo
              </span>
              <p className="text-slate-600 leading-relaxed">
                Trường THPT Vị Thanh<br />
                Số 559, đường Trần Hưng Đạo, phường Vị Thanh, TP. Cần Thơ<br />
                Hotline: 0965 163 188
              </p>
            </div>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <span>© 2026 Trường THPT Vị Thanh · Hệ thống hồ sơ đọc số Ngữ văn</span>
            <span>Năm học 2026–2027</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
