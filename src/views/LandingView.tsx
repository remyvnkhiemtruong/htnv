import React, { useState } from 'react';
import { ArrowRightIcon, Bars3Icon, XMarkIcon, BookOpenIcon, CheckCircleIcon, SparklesIcon, DocumentCheckIcon, AcademicCapIcon, ChartBarIcon } from '@heroicons/react/24/outline';
import { Button } from '../components/ui';

interface LandingViewProps { onNavigate: (view: string, extraParams?: unknown) => void; }

const NAV_ITEMS = [
  { id: 'quy-trinh', label: 'Quy trình' },
  { id: 'truc-doc', label: 'Sáu trục đọc' },
  { id: 'giao-vien', label: 'Dành cho giáo viên' },
  { id: 've-he-thong', label: 'Thông tin hệ thống' }
];

const WORKFLOW_STEPS = [
  ['V0', 'Dự đoán trước khi đọc', 'Ghi dự đoán, căn cứ và mức tự tin trước khi đọc văn bản.'],
  ['V1', 'Bản phân tích đầu tiên', 'Đọc văn bản, phân tích theo 6 trục thi pháp và dẫn chứng từ bài đọc.'],
  ['Góp ý', 'Nhận góp ý', 'Đọc góp ý của AI và giáo viên cho từng phần trong bài đã nộp.'],
  ['V2', 'Bản chỉnh sửa', 'Sửa bài theo góp ý, so sánh với V1 và ghi lý do sửa.'],
  ['REF1', 'Phiếu tự phản tư', 'Trả lời 5 câu hỏi về điều đã hiểu thêm, phần đã sửa và cách làm bài sau.'],
  ['Rubric', 'Đánh giá chính thức', 'Giáo viên chấm theo 4 mức của rubric và xem kết quả từng phiên bản.']
];

const POETIC_AXES = [
  { id: '01', title: 'Tình huống – Cốt truyện', question: 'Tình huống nào mở đầu xung đột và làm thay đổi diễn biến truyện?', focus: 'Xung đột, biến cố, hành động nhân vật' },
  { id: '02', title: 'Nhân vật – Chi tiết nghệ thuật', question: 'Chi tiết nào cho thấy suy nghĩ, tâm trạng hoặc hoàn cảnh của nhân vật?', focus: 'Ngoại hình, ngôn ngữ, cử chỉ, tâm lý' },
  { id: '03', title: 'Người kể chuyện – Điểm nhìn', question: 'Câu chuyện được kể từ điểm nhìn nào? Điểm nhìn có thay đổi không?', focus: 'Ngôi kể, điểm nhìn bên trong/bên ngoài' },
  { id: '04', title: 'Không gian – Thời gian nghệ thuật', question: 'Không gian và thời gian ảnh hưởng thế nào đến tâm trạng nhân vật?', focus: 'Thời gian tâm lý, không gian biểu tượng' },
  { id: '05', title: 'Ngôn ngữ – Giọng điệu – Biểu tượng', question: 'Từ ngữ, hình ảnh và giọng điệu góp phần thể hiện ý nghĩa gì?', focus: 'Biện pháp tu từ, nhịp điệu, biểu tượng văn học' },
  { id: '06', title: 'Tổng hợp & Lập luận', question: 'Em liên kết các nhận xét và dẫn chứng thế nào để làm rõ luận điểm?', focus: 'Luận điểm, liên kết dẫn chứng, tư tưởng tác phẩm' }
];

const STAGE_PREVIEWS = {
  v0: { badge: 'Trước khi đọc', title: 'V0: Ghi dự đoán', desc: 'Dựa vào nhan đề và thông tin giáo viên cung cấp, ghi điều em dự đoán và mức tự tin.', sample: 'Ví dụ: Dự đoán tình huống nhặt vợ trong nạn đói 1945 — Căn cứ: Nhan đề Vợ nhặt và hoàn cảnh lịch sử.' },
  v1: { badge: 'Đọc và phân tích', title: 'V1: Phân tích và dẫn chứng', desc: 'Chọn một đoạn trong ngữ liệu để đưa vào phần dẫn chứng của trục đang viết.', sample: 'Ví dụ ở trục Không gian: Chọn một chi tiết về xóm ngụ cư, rồi giải thích chi tiết đó cho thấy cảnh sống trong nạn đói ra sao.' },
  feedback: { badge: 'Góp ý gợi mở', title: 'Góp ý từ AI và giáo viên', desc: 'Đọc nhận xét về bài đã nộp và chọn phần cần bổ sung hoặc sửa.', sample: 'Góp ý: "Em đã chỉ ra chi tiết nồi cháo cám, hãy phân tích thêm phản ứng của bà cụ Tứ để làm rõ tình mẫu tử."' },
  v2: { badge: 'Hoàn thiện bài viết', title: 'V2 và REF1: Sửa bài và tự nhận xét', desc: 'Xem các đoạn đã thêm, xóa hoặc sửa so với V1. Sau đó trả lời 5 câu hỏi REF1.', sample: 'Phản tư: "Ở bản V2, em đã liên kết được chi tiết giọt nước mắt của bà cụ Tứ với niềm tin vào tương lai."' }
};

const TEACHER_TOOLS = [
  { icon: DocumentCheckIcon, title: 'Giao bài và quản lý ngữ liệu', desc: 'Chọn văn bản, nhập yêu cầu và câu hỏi dự đoán V0.' },
  { icon: SparklesIcon, title: 'Xem góp ý AI', desc: 'Xem góp ý gắn với bài đã nộp và bổ sung nhận xét cho học sinh.' },
  { icon: CheckCircleIcon, title: 'Chấm theo rubric', desc: 'Chọn mức cho từng tiêu chí sau khi học sinh nộp REF1. Hệ thống tính tổng điểm.' },
  { icon: ChartBarIcon, title: 'Theo dõi kết quả của lớp', desc: 'So sánh điểm từng trục giữa V1 và V2 khi đã có kết quả chấm.' }
];

const SYSTEM_INFO = [
  ['Phạm vi áp dụng', 'Học sinh và giáo viên THPT.'],
  ['Đơn vị sở hữu', 'Trường THPT Vị Thanh.'],
  ['Đối tượng sử dụng', 'Học sinh, giáo viên Ngữ văn và tổ chuyên môn.'],
  ['Quy trình học tập', 'Lưu dự đoán V0, bài V1, góp ý, bản sửa V2, phiếu REF1 và kết quả chấm.']
];

type StageKey = keyof typeof STAGE_PREVIEWS;

export const LandingView: React.FC<LandingViewProps> = ({ onNavigate }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeStage, setActiveStage] = useState<StageKey>('v1');
  const [selectedAxis, setSelectedAxis] = useState(0);
  const goToLogin = () => onNavigate('login');
  const currentPreview = STAGE_PREVIEWS[activeStage];

  return (
    <div className="min-h-[100dvh] bg-white text-slate-900 scroll-smooth">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6">
          <a href="#noi-dung" className="flex min-w-0 items-center gap-3" aria-label="Trang chủ Học tốt Ngữ Văn">
            <img src="/Logo.png" alt="Logo Trường THPT Vị Thanh" className="h-10 w-10 shrink-0 object-contain drop-shadow-sm" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-slate-950">Học tốt Ngữ Văn</span>
              <span className="block truncate text-xs font-medium text-slate-500">Copyright © THPT Vị Thanh</span>
            </span>
          </a>

          <nav className="hidden items-center gap-6 md:flex" aria-label="Điều hướng trang giới thiệu">
            {NAV_ITEMS.map(item => <a key={item.id} href={`#${item.id}`} className="text-sm font-medium text-slate-600 hover:text-primary-800 transition-colors">{item.label}</a>)}
          </nav>

          <div className="flex items-center gap-2">
            <Button size="sm" variant="primary" onClick={goToLogin}>Đăng nhập</Button>
            <button type="button" onClick={() => setMobileMenuOpen(value => !value)} className="p-2 text-slate-600 md:hidden" aria-expanded={mobileMenuOpen} aria-controls="mobile-landing-nav" aria-label={mobileMenuOpen ? 'Đóng menu' : 'Mở menu'}>
              {mobileMenuOpen ? <XMarkIcon className="h-5 w-5" /> : <Bars3Icon className="h-5 w-5" />}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <nav id="mobile-landing-nav" className="border-t border-slate-200 px-4 py-3 md:hidden bg-white" aria-label="Điều hướng di động">
            {NAV_ITEMS.map(item => <a key={item.id} href={`#${item.id}`} onClick={() => setMobileMenuOpen(false)} className="block border-b border-slate-100 py-3 text-sm font-medium text-slate-700 last:border-0">{item.label}</a>)}
          </nav>
        )}
      </header>

      <main id="noi-dung">
        <section className="border-b border-slate-200 bg-slate-50/50">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 sm:py-18 lg:grid-cols-[minmax(0,1.15fr)_minmax(340px,0.85fr)] lg:items-center">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary-200 bg-primary-50 px-3 py-1 text-xs font-semibold text-primary-900">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                Ngữ văn THPT · Năm học 2026–2027
              </div>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Đọc, viết và sửa bài Ngữ văn.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Học sinh làm bài theo 6 trục thi pháp, nhận góp ý và lưu từng bản sửa. Giáo viên giao bài, theo dõi tiến độ và chấm theo rubric.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" variant="primary" onClick={goToLogin} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
                  Vào học
                </Button>
                <a href="#quy-trinh" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  Xem cách làm bài
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-500">Ví dụ cách làm bài</span>
                <span className="rounded bg-primary-50 px-2 py-0.5 text-xs font-bold text-primary-800">{currentPreview.badge}</span>
              </div>
              <div className="mt-3 flex rounded-md bg-slate-100 p-1 text-xs">
                {(['v0', 'v1', 'feedback', 'v2'] as StageKey[]).map(key => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setActiveStage(key)}
                    className={`flex-1 rounded py-1.5 font-bold transition-all ${activeStage === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
                  >
                    {key === 'v0' ? 'V0 Dự đoán' : key === 'v1' ? 'V1 6 Trục' : key === 'feedback' ? 'Góp ý' : 'V2 & REF1'}
                  </button>
                ))}
              </div>
              <div className="mt-4 space-y-2.5">
                <h3 className="text-sm font-bold text-slate-900">{currentPreview.title}</h3>
                <p className="text-xs leading-5 text-slate-600">{currentPreview.desc}</p>
                <div className="rounded-md border-l-2 border-primary-500 bg-slate-50 p-3 text-xs italic leading-relaxed text-slate-700">
                  {currentPreview.sample}
                </div>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                <div className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" /> Giữ các bản đã nộp</div>
                <div className="flex items-center gap-1.5"><SparklesIcon className="h-4 w-4 text-primary-600 shrink-0" /> Chọn đoạn để trích dẫn</div>
              </div>
            </div>
          </div>
        </section>

        <section id="quy-trinh" className="scroll-mt-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Các bước làm bài</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Mỗi lần nộp được lưu thành một phiên bản riêng để xem lại và so sánh.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {WORKFLOW_STEPS.map(([code, title, description], index) => (
                <div key={code} className="rounded-lg border border-slate-200 bg-slate-50/40 p-4 transition-all hover:border-slate-300 hover:bg-white hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">0{index + 1}</span>
                    <span className="rounded bg-primary-100 px-2 py-0.5 font-mono text-xs font-extrabold text-primary-900">{code}</span>
                  </div>
                  <h3 className="mt-2.5 text-sm font-bold text-slate-900">{title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="truc-doc" className="scroll-mt-20 border-b border-slate-200 bg-slate-50/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">6 trục thi pháp</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Dùng các câu hỏi dưới đây để tìm chi tiết, chọn dẫn chứng và viết phân tích.</p>
            </div>
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {POETIC_AXES.map((axis, idx) => (
                <div
                  key={axis.id}
                  onClick={() => setSelectedAxis(idx)}
                  className={`cursor-pointer rounded-lg border p-4 transition-all ${selectedAxis === idx ? 'border-primary-600 bg-white ring-2 ring-primary-500/20 shadow-sm' : 'border-slate-200 bg-white hover:border-slate-300'}`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-slate-400">Trục {axis.id}</span>
                    <BookOpenIcon className={`h-4 w-4 ${selectedAxis === idx ? 'text-primary-700' : 'text-slate-400'}`} />
                  </div>
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{axis.title}</h3>
                  <p className="mt-1.5 text-xs leading-5 text-slate-600">{axis.question}</p>
                  <div className="mt-3 border-t border-slate-100 pt-2 text-xs font-medium text-primary-800">
                    Trọng tâm: {axis.focus}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="giao-vien" className="scroll-mt-20 border-b border-slate-200 bg-white">
          <div className="mx-auto grid max-w-6xl gap-8 px-4 py-14 sm:px-6 sm:py-16 lg:grid-cols-[280px_minmax(0,1fr)]">
            <div>
              <div className="inline-flex items-center gap-1.5 rounded bg-primary-50 px-2.5 py-1 text-xs font-bold text-primary-900">
                <AcademicCapIcon className="h-4 w-4" /> Dành cho Giáo viên
              </div>
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Giao bài, góp ý và chấm điểm</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Xem bài đã nộp, góp ý và chấm cho các lớp được phân công.</p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {TEACHER_TOOLS.map(tool => (
                <div key={tool.title} className="rounded-lg border border-slate-200 p-4">
                  <tool.icon className="h-5 w-5 text-primary-700" />
                  <h3 className="mt-2 text-sm font-bold text-slate-900">{tool.title}</h3>
                  <p className="mt-1 text-xs leading-5 text-slate-600">{tool.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section id="ve-he-thong" className="scroll-mt-20 bg-slate-50/50">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="grid gap-8 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-950">Thông tin hệ thống</h2>
                <p className="mt-2 text-sm leading-6 text-slate-600">Học tốt Ngữ Văn lưu bài làm, nhận xét và kết quả chấm của từng nhiệm vụ.</p>
              </div>
              <dl className="grid gap-3 sm:grid-cols-2 text-xs">
                {SYSTEM_INFO.map(([title, desc]) => (
                  <div key={title} className="rounded-lg border border-slate-200 bg-white p-4">
                    <dt className="font-bold text-slate-900">{title}</dt>
                    <dd className="mt-1 text-slate-600 leading-relaxed">{desc}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-slate-950 text-slate-300">
        <div className="mx-auto flex max-w-6xl flex-col gap-2 px-4 py-8 text-xs sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div className="flex items-center gap-2.5">
            <img src="/Logo.png" alt="Logo THPT Vị Thanh" className="h-6 w-6 object-contain" />
            <span>Học tốt Ngữ Văn · Dành cho học sinh và giáo viên THPT</span>
          </div>
          <span>© 2026–2027 Trường THPT Vị Thanh.</span>
        </div>
      </footer>
    </div>
  );
};
