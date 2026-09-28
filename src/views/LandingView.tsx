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
  ['V0', 'Dự đoán trước khi đọc', 'Học sinh ghi nhận suy nghĩ ban đầu, căn cứ và mức tự tin trước khi tiếp cận toàn văn.'],
  ['V1', 'Bản phân tích đầu tiên', 'Đọc sâu tác phẩm, phân tích theo 6 trục thi pháp và trích dẫn bằng chứng từ ngữ liệu.'],
  ['Góp ý', 'Phản hồi Socratic', 'AI gợi mở và giáo viên nhận xét gắn liền với từng trục của đúng phiên bản đã nộp.'],
  ['V2', 'Bản chỉnh sửa nâng cao', 'Học sinh hoàn thiện lập luận, so sánh thay đổi qua trình diff và ghi rõ lý do sửa.'],
  ['REF1', 'Phiếu tự phản tư', '5 câu hỏi giúp học sinh nhìn nhận bước chuyển nhận thức trước khi kết thúc nhiệm vụ.'],
  ['Rubric', 'Đánh giá chính thức', 'Giáo viên chấm điểm theo rubric 4 mức gắn với nhiệm vụ, thống kê tiến bộ rõ rệt.']
];

const POETIC_AXES = [
  { id: '01', title: 'Tình huống – Cốt truyện', question: 'Tình huống nào tổ chức mạch truyện và tạo bước ngoặt nhận thức cho tác phẩm?', focus: 'Xung đột, biến cố, hành động nhân vật' },
  { id: '02', title: 'Nhân vật – Chi tiết nghệ thuật', question: 'Chi tiết nghệ thuật nào thể hiện chiều sâu nội tâm và số phận nhân vật?', focus: 'Ngoại hình, ngôn ngữ, cử chỉ, tâm lý' },
  { id: '03', title: 'Người kể chuyện – Điểm nhìn', question: 'Điểm nhìn trần thuật chuyển dịch ra sao giữa người kể chuyện và nhân vật?', focus: 'Ngôi kể, điểm nhìn bên trong/bên ngoài' },
  { id: '04', title: 'Không gian – Thời gian nghệ thuật', question: 'Bối cảnh không gian và bước đi thời gian tác động thế nào đến tâm trạng nhân vật?', focus: 'Thời gian tâm lý, không gian biểu tượng' },
  { id: '05', title: 'Ngôn ngữ – Giọng điệu – Biểu tượng', question: 'Ngôn từ, hình ảnh và giọng điệu chủ đạo kiến tạo nên những tầng nghĩa nào?', focus: 'Biện pháp tu từ, nhịp điệu, biểu tượng văn học' },
  { id: '06', title: 'Tổng hợp & Lập luận', question: 'Các trục thi pháp kết nối thế nào thành một bài phân tích chặt chẽ, có căn cứ?', focus: 'Luận điểm, liên kết dẫn chứng, tư tưởng tác phẩm' }
];

const STAGE_PREVIEWS = {
  v0: { badge: 'Khởi động tiếp nhận', title: 'V0: Dự đoán độc lập trước khi đọc', desc: 'Học sinh dựa trên nhan đề, tác giả hoặc đoạn trích mở đầu để phán đoán xung đột và tư tưởng, kèm đánh giá độ tự tin.', sample: 'Ví dụ: Dự đoán tình huống nhặt vợ trong nạn đói 1945 — Căn cứ: Nhan đề Vợ nhặt và hoàn cảnh lịch sử.' },
  v1: { badge: 'Đọc sâu văn bản', title: 'V1: Phân tích 6 trục & Trích dẫn 1 chạm', desc: 'Bàn làm việc thông minh cho phép bôi đen câu chữ ngữ liệu để trích dẫn trực tiếp vào từng trục thi pháp đang phân tích.', sample: 'Ví dụ: "Cái đói đã tràn đến xóm này tự lúc nào..." — Trục Không gian: Bức tranh xóm ngụ cư u ám thời tao loạn.' },
  feedback: { badge: 'Góp ý gợi mở', title: 'Góp ý gợi mở: AI trợ lực & Thầy cô', desc: 'Góp ý định hướng tư duy phân tích; giáo viên nhận xét và hướng dẫn hoàn thiện bài viết qua từng phiên bản.', sample: 'Góp ý: "Em đã chỉ ra chi tiết nồi cháo cám, hãy phân tích thêm phản ứng của bà cụ Tứ để làm rõ tình mẫu tử."' },
  v2: { badge: 'Hoàn thiện bài viết', title: 'V2 & REF1: So sánh trực quan & Tự phản tư', desc: 'Trình so sánh phiên bản (Visual Diff) phân định đoạn thêm/sửa; 5 câu hỏi tự phản tư REF1 giúp học sinh đúc kết kinh nghiệm học tập.', sample: 'Phản tư: "Ở bản V2, em đã liên kết được chi tiết giọt nước mắt của bà cụ Tứ với niềm tin vào tương lai."' }
};

const TEACHER_TOOLS = [
  { icon: DocumentCheckIcon, title: 'Quản lý nhiệm vụ & Ngữ liệu', desc: 'Tạo đề từ ngân hàng văn bản; thiết lập V0 dự đoán và câu hỏi khởi động.' },
  { icon: SparklesIcon, title: 'Kiểm duyệt phản hồi AI', desc: 'Xem xét và bổ sung góp ý AI trước hoặc sau khi gửi đến học sinh trên từng bản nộp.' },
  { icon: CheckCircleIcon, title: 'Đánh giá Rubric 6 trục', desc: 'Chấm điểm 4 mức tiêu chuẩn sau khi học sinh nộp REF1; tự tính tổng và phần trăm.' },
  { icon: ChartBarIcon, title: 'Phân tích tiến bộ lớp học', desc: 'Biểu đồ đối chiếu sự tiến bộ giữa bản đầu V1 và bản chỉnh sửa V2 trên từng trục.' }
];

const SYSTEM_INFO = [
  ['Phạm vi áp dụng', 'Dành cho học sinh và giáo viên tất cả các trường THPT trên toàn quốc.'],
  ['Bản quyền sở hữu', 'Bản quyền thuộc về Trường THPT Vị Thanh (Copyright © THPT Vị Thanh).'],
  ['Đối tượng sử dụng', 'Học sinh, Giáo viên tổ Ngữ văn và Ban chuyên môn các nhà trường.'],
  ['Quy trình học tập', 'Lưu giữ toàn diện tiến trình từ dự đoán ban đầu, bài nháp V1, góp ý, bản sửa V2 đến Rubric đánh giá.']
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
                Dành cho các trường THPT · Năm học 2026–2027
              </div>
              <h1 className="mt-4 text-3xl font-extrabold leading-tight tracking-tight text-slate-950 sm:text-4xl lg:text-5xl">
                Học tốt Ngữ Văn qua tiến trình 6 trục thi pháp.
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-slate-600 sm:text-base">
                Nền tảng hỗ trợ học sinh và giáo viên các trường THPT rèn luyện kỹ năng đọc hiểu văn bản, viết bài nghị luận và nâng cao kỹ năng diễn đạt theo Chương trình GDPT 2018.
              </p>
              <div className="mt-7 flex flex-wrap items-center gap-3">
                <Button size="lg" variant="primary" onClick={goToLogin} rightIcon={<ArrowRightIcon className="h-4 w-4" />}>
                  Vào bàn học trực tuyến
                </Button>
                <a href="#quy-trinh" className="inline-flex min-h-11 items-center rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-sm">
                  Khám phá quy trình
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-500">Mô phỏng bàn làm việc</span>
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
                <div className="flex items-center gap-1.5"><CheckCircleIcon className="h-4 w-4 text-emerald-600 shrink-0" /> Bản lưu bất biến</div>
                <div className="flex items-center gap-1.5"><SparklesIcon className="h-4 w-4 text-primary-600 shrink-0" /> Trích dẫn 1 chạm</div>
              </div>
            </div>
          </div>
        </section>

        <section id="quy-trinh" className="scroll-mt-20 border-b border-slate-200 bg-white">
          <div className="mx-auto max-w-6xl px-4 py-14 sm:px-6 sm:py-16">
            <div className="max-w-2xl">
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Tiến trình làm bài khoa học</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Dữ liệu được lưu độc lập qua từng mốc. Bản chỉnh sửa sau không làm mất dấu vết bản trước.</p>
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
              <h2 className="text-2xl font-bold tracking-tight text-slate-950 sm:text-3xl">Khung phân tích 6 trục thi pháp</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Câu hỏi định hướng giúp học sinh bám sát đặc trưng thể loại thay vì diễn giải cảm tính.</p>
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
              <h2 className="mt-3 text-2xl font-bold tracking-tight text-slate-950">Công cụ sư phạm số</h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">Quản lý nhiệm vụ, theo dõi tiến độ và chấm điểm chính xác theo lớp được phân công.</p>
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
                <p className="mt-2 text-sm leading-6 text-slate-600">Hệ thống hồ sơ học tập số môn Ngữ văn dành cho học sinh và giáo viên các trường THPT toàn quốc.</p>
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
            <span>Học tốt Ngữ Văn · Nền tảng học tập số dành cho các trường THPT</span>
          </div>
          <span>Copyright © 2026–2027 Trường THPT Vị Thanh. All rights reserved.</span>
        </div>
      </footer>
    </div>
  );
};
