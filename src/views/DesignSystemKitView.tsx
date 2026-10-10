import React, { useState } from 'react';
import {
  Button,
  IconButton,
  Input,
  Textarea,
  Select,
  Checkbox,
  RadioGroup,
  DatePicker,
  Badge,
  Avatar,
  Tooltip,
  Dropdown,
  Popover,
  Modal,
  Drawer,
  Alert,
  EmptyState,
  Skeleton,
  Tabs,
  Breadcrumb,
  Card,
  DataTable,
  Progress,
  StatCard,
  ChartContainer,
  PageHeader
} from '../components/ui';
import { useNotificationStore } from '../app/store/useNotificationStore';
import {
  SparklesIcon,
  BookOpenIcon,
  CheckCircleIcon,
  PlusIcon,
  TrashIcon,
  EyeIcon,
  ArrowsRightLeftIcon,
  AcademicCapIcon,
  EllipsisVerticalIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';

export const DesignSystemKitView: React.FC = () => {
  const { addToast } = useNotificationStore();

  // Interactive demo states
  const [activeTab, setActiveTab] = useState('overview');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [radioVal, setRadioVal] = useState('opt1');
  const [checkboxVal, setCheckboxVal] = useState(true);
  const [loadingBtn, setLoadingBtn] = useState(false);

  const triggerLoading = () => {
    setLoadingBtn(true);
    setTimeout(() => setLoadingBtn(false), 2000);
  };

  const sampleTableData = [
    { id: '1', name: 'Nguyễn Văn An', version: 'v2.0', status: 'Đã chấm Rubric', score: '22/24' },
    { id: '2', name: 'Trần Thị Bình', version: 'v1.0', status: 'Chờ nhận xét', score: '18/24' },
    { id: '3', name: 'Lê Hoàng Cường', version: 'v1.1', status: 'Đang sửa nháp', score: '15/24' },
  ];

  return (
    <div className="space-y-12 animate-fade-in pb-16">
      {/* Breadcrumb preview */}
      <Breadcrumb
        items={[
          { label: 'Hệ thống' },
          { label: 'Cấu hình thiết kế' },
          { label: 'Design System Kit' }
        ]}
      />

      <PageHeader
        title="Thư viện chuẩn hóa Design System & UI Kit"
        description="Tổng hợp toàn bộ Semantic Tokens, Typography, Color Palette và Base Components phục vụ hệ thống Học tốt Ngữ Văn."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsDrawerOpen(true)}
              leftIcon={<EyeIcon className="w-4 h-4" />}
            >
              Mở Drawer Preview
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setIsModalOpen(true)}
            >
              Mở Modal Dialog
            </Button>
          </div>
        }
      />

      {/* Tabs Navigation for Sections */}
      <Tabs
        activeId={activeTab}
        onChange={setActiveTab}
        items={[
          { id: 'overview', label: '1. Typography & Colors' },
          { id: 'components', label: '2. Base UI & Forms' },
          { id: 'diff-rubric', label: '3. Diff Tokens & Rubric' },
          { id: 'data-views', label: '4. Tables & Analytics' },
        ]}
      />

      {/* SECTION 1: TYPOGRAPHY & COLORS */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Typography Scale */}
          <section aria-labelledby="typography-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="typography-heading" className="text-h3 font-bold text-slate-900">
                Thang Bậc Typography (Be Vietnam Pro / Inter - Sans-serif Tiếng Việt Hoàn Chỉnh)
              </h2>
              <p className="text-caption text-slate-500">Cấu hình chuẩn xác kích thước và khoảng cách dòng</p>
            </header>

            <div className="space-y-4 divide-y divide-slate-100">
              <div className="pt-2">
                <span className="text-caption font-semibold text-slate-400 block uppercase">Display (36–40px / 700)</span>
                <p className="text-display text-slate-900 mt-1">Phát triển năng lực đọc hiểu thi pháp truyện ngắn</p>
              </div>

              <div className="pt-3">
                <span className="text-caption font-semibold text-slate-400 block uppercase">Heading 1 (30–32px / 700)</span>
                <h1 className="text-h1 text-slate-900 mt-1">Học tốt Ngữ Văn - Lưu Phiên Bản & Visual Diff</h1>
              </div>

              <div className="pt-3">
                <span className="text-caption font-semibold text-slate-400 block uppercase">Heading 2 (24–28px / 600)</span>
                <h2 className="text-h2 text-slate-900 mt-1">Không Gian Nghệ Thuật & Điểm Nhìn Trần Thuật</h2>
              </div>

              <div className="pt-3">
                <span className="text-caption font-semibold text-slate-400 block uppercase">Heading 3 (20–22px / 600)</span>
                <h3 className="text-h3 text-slate-900 mt-1">Nghệ Thuật Xây Dựng Tình Huống Truyện</h3>
              </div>

              <div className="pt-3">
                <span className="text-caption font-semibold text-slate-400 block uppercase">Body (15–16px / 400)</span>
                <p className="text-body text-slate-700 mt-1">
                  Ví dụ phân tích: Chi tiết chiếc lá sen khô bọc nắm xôi cần được đọc cùng hành động và tâm trạng của nhân vật.
                </p>
              </div>

              <div className="pt-3">
                <span className="text-caption font-semibold text-slate-400 block uppercase">Small (13–14px) & Caption (12px)</span>
                <div className="flex items-center gap-6 mt-1">
                  <span className="text-small text-slate-600">Text Small: Đã lưu tự động lúc 14:30</span>
                  <span className="text-caption text-slate-400">Text Caption: Phiên bản v1.0 • Đã đồng bộ máy chủ</span>
                </div>
              </div>

              {/* Literary Reading Content Block */}
              <div className="pt-4 bg-slate-50 p-5 rounded-lg border border-slate-200">
                <span className="text-caption font-bold text-slate-500 block mb-2">
                  Chuyên mục Đọc Văn Bản Nghệ Thuật (Be Vietnam Pro / Inter Sans-serif • Line-height 1.75 • Max-width 68ch)
                </span>
                <div className="lit-reader-content">
                  <p>
                    "Bữa cơm ngày đói trông thật thảm hại. Giữa cái mẹt rách có một lùm rau chuối thái rối, và một đĩa muối ăn với cháo, nhưng niêu cháo thì lỏng bỏng, mỗi người được lưng hai bát đã hết nhẵn. Bà lão múc niêu cháo cám ra, khói bốc lên nghi ngút..."
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Semantic Color Palette */}
          <section aria-labelledby="colors-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="colors-heading" className="text-h3 font-bold text-slate-900">
                Bảng Màu Semantic Tokens (Không Lạm Dụng Màu Bão Hòa)
              </h2>
              <p className="text-caption text-slate-500">Màu dùng cho từng trạng thái trong giao diện</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Primary */}
              <div className="p-4 rounded-lg bg-primary-50/50 border border-primary-100 space-y-2">
                <div className="w-full h-12 rounded-lg bg-primary-600 flex items-center justify-center text-white font-bold text-xs">
                  Primary #4F46E5
                </div>
                <div className="text-xs font-bold text-primary-950">Primary (primary)</div>
                <p className="text-caption text-primary-900">Active • Action • Information • Điều hướng chính</p>
              </div>

              {/* Success */}
              <div className="p-4 rounded-lg bg-emerald-50/50 border border-emerald-100 space-y-2">
                <div className="w-full h-12 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-bold text-xs">
                  Success #10B981
                </div>
                <div className="text-xs font-bold text-emerald-950">Success (Emerald)</div>
                <p className="text-caption text-emerald-900">Saved • Completed • Added in Diff • Đạt chuẩn</p>
              </div>

              {/* Warning */}
              <div className="p-4 rounded-lg bg-amber-50/50 border border-amber-100 space-y-2">
                <div className="w-full h-12 rounded-lg bg-amber-500 flex items-center justify-center text-white font-bold text-xs">
                  Warning #F59E0B
                </div>
                <div className="text-xs font-bold text-amber-950">Warning (Amber)</div>
                <p className="text-caption text-amber-900">Deadline • Needs Revision • Pending • Changed</p>
              </div>

              {/* Danger */}
              <div className="p-4 rounded-lg bg-rose-50/50 border border-rose-100 space-y-2">
                <div className="w-full h-12 rounded-lg bg-rose-600 flex items-center justify-center text-white font-bold text-xs">
                  Danger #EF4444
                </div>
                <div className="text-xs font-bold text-rose-950">Danger (Rose)</div>
                <p className="text-caption text-rose-900">Error • Deleted in Diff • Overdue • Xung đột</p>
              </div>

              {/* Neutral */}
              <div className="p-4 rounded-lg bg-slate-100/70 border border-slate-200 space-y-2">
                <div className="w-full h-12 rounded-lg bg-slate-800 flex items-center justify-center text-white font-bold text-xs">
                  Neutral #1E293B
                </div>
                <div className="text-xs font-bold text-slate-950">Neutral (Slate)</div>
                <p className="text-caption text-slate-700">Surface • Inactive • Historical • Borders</p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SECTION 2: BASE UI & FORMS */}
      {activeTab === 'components' && (
        <div className="space-y-8">
          {/* Button Matrix */}
          <section aria-labelledby="buttons-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="buttons-heading" className="text-h3 font-bold text-slate-900">
                Hệ Thống Nút Bấm & Trạng Thái Tương Tác (Button Variants & States)
              </h2>
            </header>

            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <Button variant="primary" leftIcon={<PlusIcon className="w-4 h-4" />}>
                  Primary (Slate 900)
                </Button>
                <Button variant="academic" leftIcon={<AcademicCapIcon className="w-4 h-4" />}>
                  Academic (primary)
                </Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="danger" leftIcon={<TrashIcon className="w-4 h-4" />}>
                  Danger
                </Button>
              </div>

              {/* Interactive states demo */}
              <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
                <Button variant="primary" size="sm">Size Small</Button>
                <Button variant="primary" size="md">Size Medium</Button>
                <Button variant="primary" size="lg">Size Large</Button>
                
                <Button
                  variant="academic"
                  isLoading={loadingBtn}
                  onClick={triggerLoading}
                >
                  {loadingBtn ? 'Đang xử lý...' : 'Bấm thử Loading State'}
                </Button>

                <Button variant="primary" disabled>Disabled State</Button>

                <IconButton ariaLabel="So sánh Diff" variant="outline">
                  <ArrowsRightLeftIcon className="w-4 h-4 text-slate-700" />
                </IconButton>

                {/* Dropdown Demo */}
                <Dropdown
                  trigger={
                    <Button variant="outline" rightIcon={<EllipsisVerticalIcon className="w-4 h-4" />}>
                      Menu Tác Vụ
                    </Button>
                  }
                  items={[
                    { key: '1', label: 'Xem chi tiết hồ sơ' },
                    { key: '2', label: 'Tải về bản in PDF' },
                    { key: '3', label: 'Xóa bản nháp', danger: true }
                  ]}
                />

                {/* Popover Demo */}
                <Popover
                  trigger={
                    <Button variant="secondary" leftIcon={<InformationCircleIcon className="w-4 h-4" />}>
                      Popover Gợi Ý
                    </Button>
                  }
                  content={
                    <div className="w-56 text-xs space-y-1">
                      <div className="font-bold text-slate-900">Ghi chú:</div>
                      <p className="text-slate-600">Đã neo 3 phản hồi vào phiên bản này.</p>
                    </div>
                  }
                />
              </div>
            </div>
          </section>

          {/* Form Controls */}
          <section aria-labelledby="forms-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="forms-heading" className="text-h3 font-bold text-slate-900">
                Biểu Mẫu & Trường Dữ Liệu (Form Controls & Validation States)
              </h2>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input
                label="Tiêu đề nhiệm vụ đọc hiểu"
                placeholder="Ví dụ: Phân tích nghệ thuật xây dựng tình huống truyện..."
                helperText="Tên nhiệm vụ sẽ hiển thị trên dashboard học sinh"
              />

              <Input
                label="Mã định danh (Bắt buộc)"
                defaultValue="ASSIGN-2026-VONHAT"
                error="Mã nhiệm vụ này đã tồn tại trong học kỳ I"
              />

              <Select
                label="Trục thi pháp trọng tâm"
                options={[
                  { value: '1', label: '1. Tình huống – Cốt truyện' },
                  { value: '2', label: '2. Nhân vật – Chi tiết nghệ thuật' },
                  { value: '3', label: '3. Người kể chuyện – Điểm nhìn' },
                  { value: '4', label: '4. Không gian – Thời gian nghệ thuật' },
                  { value: '5', label: '5. Ngôn ngữ – Giọng điệu – Biểu tượng' },
                  { value: '6', label: '6. Tính chỉnh thể & Lập luận' },
                ]}
              />

              <DatePicker
                label="Hạn nộp bản sơ thảo v1.0"
                defaultValue="2026-09-30"
              />

              <div className="md:col-span-2">
                <Textarea
                  label="Gợi ý câu hỏi Scaffolding cho học sinh"
                  rows={3}
                  placeholder="Nhập hướng dẫn giúp học sinh tiếp cận trục thi pháp từng bước..."
                  defaultValue="1. Tìm các chi tiết miêu tả ngoại hình của nhân vật Tràng. 2. Nhận xét về sự biến đổi tâm lý sau khi có vợ."
                />
              </div>

              <div className="space-y-3">
                <span className="text-caption font-semibold text-slate-700 block">Tùy chọn tương tác:</span>
                <Checkbox
                  id="chk-1"
                  label="Bật tính năng Phản hồi Neo Ngữ Cảnh (In-line Feedback)"
                  description="Cho phép giáo viên và bạn học gắn nhận xét trực tiếp vào từng câu văn."
                  checked={checkboxVal}
                  onChange={(e) => setCheckboxVal(e.target.checked)}
                />
              </div>

              <div>
                <RadioGroup
                  name="demo-mode"
                  label="Chế độ đánh giá phiên bản:"
                  selectedValue={radioVal}
                  onChange={setRadioVal}
                  options={[
                    { value: 'opt1', label: 'Đánh giá đa chiều (Tự chấm + Bạn chấm + GV chấm)', description: 'Áp dụng ma trận Rubric 4 mức độ.' },
                    { value: 'opt2', label: 'Chỉ giáo viên đánh giá chính thức' },
                  ]}
                />
              </div>
            </div>
          </section>

          {/* Badges, Alerts, Tooltips, Toasts, Avatars */}
          <section aria-labelledby="feedback-ui-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="feedback-ui-heading" className="text-h3 font-bold text-slate-900">
                Hệ Thống Phản Hồi, Huy Hiệu & Cảnh Báo (Alerts, Badges, Avatars)
              </h2>
            </header>

            <div className="space-y-4">
              {/* Badges & Avatars */}
              <div className="flex flex-wrap items-center gap-3">
                <Badge variant="slate">Slate Badge</Badge>
                <Badge variant="blue">Blue (Primary)</Badge>
                <Badge variant="emerald">Emerald (Success)</Badge>
                <Badge variant="amber">Amber (Warning)</Badge>
                <Badge variant="rose">Rose (Danger)</Badge>
                <Badge variant="purple">Purple (Research)</Badge>
                <Badge variant="outline">Outline</Badge>

                <div className="flex items-center gap-2 ml-4 pl-4 border-l border-slate-200">
                  <Avatar name="Nguyễn Văn An" size="sm" />
                  <Avatar name="Cô Nguyễn Thị Mai" size="md" />
                  <Avatar name="Trần Thị Bình" size="lg" />
                </div>

                <Tooltip content="Tooltip học thuật hiển thị giải thích chi tiết khi hover" position="top">
                  <span className="text-xs font-semibold text-primary-700 underline cursor-help ml-2">
                    [Hover xem Tooltip]
                  </span>
                </Tooltip>
              </div>

              {/* Alerts */}
              <div className="space-y-3 pt-2">
                <Alert type="info" title="Bản đã nộp">
                  Phiên bản <strong>v1.0</strong> đã được lưu và khóa chỉnh sửa. Học sinh có thể đọc lại nhận xét của giáo viên để chuẩn bị cho bản <strong>v2.0</strong>.
                </Alert>

                <Alert type="success" title="Đã lưu phiên bản">
                  Phiên bản mới đã được lưu để xem lại và so sánh.
                </Alert>

                <Alert type="warning" title="Yêu cầu tiếp thu phản hồi">
                  Còn 2 nhận xét neo về trục <em>Người kể chuyện</em> chưa được đánh dấu đã tiếp thu.
                </Alert>

                <Alert type="error" title="Cảnh báo hạn nộp">
                  Đã quá hạn nộp bản chỉnh sửa v2.0 cho nhiệm vụ đọc hiểu này.
                </Alert>
              </div>

              {/* Skeleton & Empty state demo */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                <div className="p-4 border border-slate-200 rounded-lg bg-slate-50/50 space-y-2">
                  <span className="text-caption font-bold text-slate-500 uppercase">Skeleton Loader State</span>
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <Skeleton className="h-8 w-full rounded-lg mt-2" />
                </div>

                <EmptyState
                  title="Chưa có dữ liệu phiên bản"
                  description="Viết bản nháp rồi lưu phiên bản đầu tiên."
                  className="border border-slate-200 rounded-lg bg-white p-4"
                />
              </div>

              {/* Toast Trigger */}
              <div className="pt-3 flex items-center gap-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addToast({
                      type: 'success',
                      title: 'Đã lưu phiên bản',
                      message: 'Đã lưu phiên bản v2.0. Bạn có thể xem lại trong lịch sử.'
                    });
                  }}
                >
                  Bật Toast Thông Báo (Success)
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    addToast({
                      type: 'error',
                      title: 'Chưa đủ điều kiện',
                      message: 'Ghi phần đã thay đổi trước khi lưu phiên bản.'
                    });
                  }}
                >
                  Bật Toast Lỗi (Error)
                </Button>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SECTION 3: DIFF TOKENS & RUBRIC */}
      {activeTab === 'diff-rubric' && (
        <div className="space-y-8">
          {/* Non-Color Diff Tokens */}
          <section aria-labelledby="diff-tokens-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="diff-tokens-heading" className="text-h3 font-bold text-slate-900">
                Quy Chuẩn So Sánh Sai Khác (Visual Diff Tokens Có Ký Hiệu Rõ Ràng)
              </h2>
              <p className="text-caption text-slate-500">
                Không truyền đạt sự thay đổi chỉ bằng màu sắc thuần túy mà có biểu tượng prefix (+, −, ✎) hỗ trợ người khiếm thị màu.
              </p>
            </header>

            <div className="space-y-4">
              <div className="p-5 rounded-lg bg-slate-50 border border-slate-200 space-y-3">
                <span className="text-caption font-bold text-slate-600 uppercase">Minh họa trực tiếp đoạn so sánh Diff:</span>
                <div className="lit-content text-slate-800 leading-relaxed text-sm bg-white p-4 rounded-lg border border-slate-200">
                  Tác giả Kim Lân đã xây dựng tình huống truyện{' '}
                  <span className="diff-tag-removed">rất hay và độc đáo</span>{' '}
                  <span className="diff-tag-added">vừa éo le, vừa cảm động, thể hiện sâu sắc khát vọng sống của con người bên bờ vực cái chết</span>.
                  Chi tiết nồi cháo cám{' '}
                  <span className="diff-tag-changed">thể hiện sự đắng chát nhưng thấm đượm tình người của bà cụ Tứ</span>.
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                    <span className="diff-tag-added text-xs">Từ ngữ thêm mới</span>
                  </div>
                  <p className="text-caption text-emerald-800 mt-2">
                    Ký hiệu dấu <code className="font-bold">+</code> và nền xanh lá nhạt. Thể hiện sự bổ sung lập luận và dẫn chứng.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-rose-50/70 border border-rose-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-rose-900">
                    <span className="diff-tag-removed text-xs">Từ ngữ cắt bỏ</span>
                  </div>
                  <p className="text-caption text-rose-800 mt-2">
                    Ký hiệu dấu <code className="font-bold">−</code> kèm gạch ngang chữ. Thể hiện việc lược bỏ câu từ chung chung.
                  </p>
                </div>

                <div className="p-4 rounded-lg bg-amber-50/70 border border-amber-200">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-900">
                    <span className="diff-tag-changed text-xs">Từ ngữ chỉnh sửa</span>
                  </div>
                  <p className="text-caption text-amber-800 mt-2">
                    Ký hiệu cây bút <code className="font-bold">✎</code> và nền vàng ấm. Thể hiện việc trau chuốt câu chữ.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Rubric 4-level scale */}
          <section aria-labelledby="rubric-scale-heading" className="bg-white rounded-lg border border-slate-200 p-5 space-y-6">
            <header className="border-b border-slate-100 pb-3">
              <h2 id="rubric-scale-heading" className="text-h3 font-bold text-slate-900">
                Thang Đo Rubric 4 Mức Độ Chuẩn Hóa
              </h2>
            </header>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="p-4 rounded-lg border border-rose-200 bg-rose-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-rose-900">
                  <span>Mức 1: Chưa Đạt</span>
                  <span>1.0 đ</span>
                </div>
                <p className="text-caption text-rose-800">
                  Chỉ tóm tắt nội dung cốt truyện bề mặt; chưa nhận diện được thủ pháp nghệ thuật.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-amber-900">
                  <span>Mức 2: Đạt</span>
                  <span>2.0 đ</span>
                </div>
                <p className="text-caption text-amber-800">
                  Nhận diện được trục thi pháp cơ bản nhưng phân tích còn sơ sài, ít dẫn chứng.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-sky-200 bg-sky-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-sky-900">
                  <span>Mức 3: Khá</span>
                  <span>3.0 đ</span>
                </div>
                <p className="text-caption text-sky-800">
                  Phân tích rõ ràng đặc trưng thi pháp kèm trích dẫn chứng cứ văn bản thuyết phục.
                </p>
              </div>

              <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50/50 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-emerald-900">
                  <span>Mức 4: Xuất Sắc</span>
                  <span>4.0 đ</span>
                </div>
                <p className="text-caption text-emerald-800">
                  Liên kết các nhận xét về chi tiết, hình thức và nội dung bằng dẫn chứng.
                </p>
              </div>
            </div>
          </section>
        </div>
      )}

      {/* SECTION 4: DATA VIEWS & ANALYTICS */}
      {activeTab === 'data-views' && (
        <div className="space-y-8">
          {/* Stat Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              label="Tổng số hồ sơ đang quản lý"
              value="42 hồ sơ"
              subValue="Thuộc 3 nhiệm vụ đọc hiểu"
              trend={{ value: "+12% so với học kỳ trước", isPositive: true }}
              icon={<BookOpenIcon className="w-5 h-5" />}
            />
            <StatCard
              label="Tỷ lệ tiến bộ trung bình (v1 -> v2)"
              value="+38.5%"
              subValue="Dựa trên 84 phiên bản đã lưu"
              trend={{ value: "P < 0.001 (Có ý nghĩa thực nghiệm)", isPositive: true }}
              icon={<SparklesIcon className="w-5 h-5" />}
              variant="accent"
            />
            <StatCard
              label="Nhận xét phản hồi neo đã xử lý"
              value="94.2%"
              subValue="128/136 góp ý đã tiếp thu"
              icon={<CheckCircleIcon className="w-5 h-5" />}
              variant="success"
            />
          </div>

          {/* Progress Demo */}
          <Card padding="md" className="space-y-3">
            <h3 className="text-xs font-bold text-slate-800">Tiến độ hoàn thành nhiệm vụ đọc hiểu</h3>
            <Progress value={75} max={100} label="Tỷ lệ nộp bản v2.0 của lớp 11A1" showValueLabel variant="primary" />
          </Card>

          {/* Chart Container & DataTable */}
          <ChartContainer
            title="Biểu Đồ Theo Dõi Phân Phối Điểm Năng Lực"
            subtitle="Phân bố kết quả đánh giá theo 6 trục thi pháp học"
            height={220}
          >
            <DataTable
              keyExtractor={(row) => row.id}
              data={sampleTableData}
              columns={[
                { key: 'name', header: 'Học sinh', render: (r) => <span className="font-semibold text-slate-900">{r.name}</span> },
                { key: 'version', header: 'Phiên bản mới nhất', render: (r) => <Badge variant="slate">{r.version}</Badge> },
                { key: 'status', header: 'Trạng thái', render: (r) => <Badge variant={r.status.includes('Đã chấm') ? 'emerald' : 'amber'}>{r.status}</Badge> },
                { key: 'score', header: 'Tổng điểm Rubric', render: (r) => <span className="font-bold text-primary-700">{r.score}</span> },
                {
                  key: 'action',
                  header: 'Thao tác',
                  align: 'right',
                  render: () => (
                    <Button size="sm" variant="ghost">Xem chi tiết</Button>
                  )
                }
              ]}
            />
          </ChartContainer>
        </div>
      )}

      {/* Interactive Modal Dialog Component */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Lưu phiên bản mới (Modal Preview)"
        description="Lưu giữ mốc phát triển năng lực đọc hiểu trong hồ sơ học tập."
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsModalOpen(false)}>Hủy bỏ</Button>
            <Button variant="primary" onClick={() => setIsModalOpen(false)}>Lưu phiên bản</Button>
          </>
        }
      >
        <div className="space-y-4">
          <Input
            label="Mã phiên bản (Tự động tăng)"
            defaultValue="v2.0"
            disabled
          />
          <Textarea
            label="Tóm tắt thay đổi & Những điểm đã tiếp thu từ phản hồi (Bắt buộc)"
            rows={3}
            placeholder="Ví dụ: Em đã bổ sung thêm dẫn chứng về chi tiết nồi cháo cám theo gợi ý của cô giáo..."
            defaultValue="Em đã bổ sung phân tích sự đối lập giữa ngọn đèn chị Tí và ánh sáng rực rỡ của đoàn tàu."
          />
        </div>
      </Modal>

      {/* Interactive Drawer Slide-over Component */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        title="Bảng Phản Hồi Neo Ngữ Cảnh (Drawer Preview)"
        footer={
          <Button variant="primary" onClick={() => setIsDrawerOpen(false)} className="w-full">
            Đóng bảng xem
          </Button>
        }
      >
        <div className="space-y-4">
          <Alert type="info">
            Các nhận xét này được neo chính xác vào đoạn trích dẫn của tác phẩm <em>Vợ nhặt</em>.
          </Alert>

          <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-800">Cô Nguyễn Thị Mai (Giáo viên)</span>
              <span className="text-caption text-slate-400">18/08/2026</span>
            </div>
            <div className="p-2 bg-white rounded border border-amber-200 text-xs italic text-slate-700">
              "Đoạn này em cần làm rõ hơn tâm trạng mừng tủi của người mẹ nghèo."
            </div>
          </div>
        </div>
      </Drawer>
    </div>
  );
};

