import React, { useEffect, useMemo, useState } from 'react';
import { usePortfolio } from '../contexts/PortfolioContext';
import type { AcademicClass, PoeticAxisId } from '../types';
import { Alert, Badge, Button } from '../components/ui';
import { POETIC_AXES } from '../data/seedData';
import {
  ArrowLeftIcon,
  CheckIcon
} from '@heroicons/react/24/outline';

interface Props {
  onNavigate: (view: string, params?: unknown) => void;
}

async function post(payload: unknown) {
  const r = await fetch('/api/academic/action', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify(payload)
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(d.message || d.code || 'Không thể tạo nhiệm vụ');
  return d;
}

const STEPS = [
  { id: 1, title: 'Lớp & Ngữ liệu', desc: 'Thông tin cơ bản' },
  { id: 2, title: 'Yêu cầu & Trục', desc: 'Đề bài và 6 trục' },
  { id: 3, title: 'Quy trình', desc: 'Quy trình làm bài' },
  { id: 4, title: 'Kiểm tra', desc: 'Xem lại và xuất bản' }
];

export const AssignmentBuilderView: React.FC<Props> = ({ onNavigate }) => {
  const { literatureTexts, rubric, rubrics, assignments, refreshAcademicData } = usePortfolio();
  const texts = useMemo(() => literatureTexts.filter(t => t.isLatest !== false), [literatureTexts]);
  const rubricOptions = useMemo(() => Object.values(rubrics || {}), [rubrics]);
  const [classes, setClasses] = useState<AcademicClass[]>([]);
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '',
    classId: '',
    textId: '',
    rubricId: '',
    deadline: '',
    prompt: '',
    difficulty: 'Nâng cao'
  });
  const [axes, setAxes] = useState<PoeticAxisId[]>(POETIC_AXES.map(a => a.id));
  const [predictionEnabled, setPredictionEnabled] = useState(true);
  const [predictionPrompt, setPredictionPrompt] = useState('Hoàn thành V0 trước khi đọc; nêu dự đoán, căn cứ và mức tự tin. V0 được khóa sau khi nộp.');
  const [predictionQuestionsText, setPredictionQuestionsText] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    void fetch('/api/academic/snapshot', { credentials: 'include', cache: 'no-store' })
      .then(r => r.json())
      .then(d => {
        const cs = d.snapshot?.classes || [];
        setClasses(cs);
        setForm(f => ({
          ...f,
          classId: cs.some((c: AcademicClass) => c.code === f.classId) ? f.classId : cs[0]?.code || '',
          textId: texts.some(t => t.id === f.textId) ? f.textId : texts[0]?.id || '',
          rubricId: rubricOptions.some(r => r.id === f.rubricId) ? f.rubricId : rubricOptions[0]?.id || ''
        }));
      });
  }, [texts, rubricOptions]);

  useEffect(() => {
    if (!form.textId) return;
    const source = assignments.find(item =>
      item.textId === form.textId && (item.predictionTemplate?.questions?.length || 0) > 0
    );
    setPredictionPrompt(source?.predictionTemplate?.prompt || 'Hoàn thành V0 trước khi đọc; nêu dự đoán, căn cứ và mức tự tin. V0 được khóa sau khi nộp.');
    setPredictionQuestionsText((source?.predictionTemplate?.questions || []).join('\n'));
  }, [form.textId, assignments]);

  const set = (key: string, value: string) => setForm(f => ({ ...f, [key]: value }));
  const toggleAxis = (id: PoeticAxisId) =>
    setAxes(prev => (prev.includes(id) ? (prev.length > 1 ? prev.filter(x => x !== id) : prev) : [...prev, id]));

  const selectedClass = classes.find(c => c.code === form.classId);
  const selectedText = texts.find(t => t.id === form.textId);
  const selectedRubric = rubricOptions.find(r => r.id === form.rubricId) || rubric;
  const predictionQuestions = predictionQuestionsText
    .split('\n')
    .map(question => question.trim())
    .filter(Boolean)
    .slice(0, 30);

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!form.title.trim()) {
        setMessage('Vui lòng nhập tên nhiệm vụ học tập.');
        return false;
      }
      if (!form.classId) {
        setMessage('Vui lòng chọn lớp học áp dụng.');
        return false;
      }
      if (!form.textId) {
        setMessage('Vui lòng chọn tác phẩm ngữ liệu.');
        return false;
      }
      if (!form.rubricId || !rubricOptions.some(option => option.id === form.rubricId)) {
        setMessage('Vui lòng chọn ma trận Rubric đang có trong hệ thống.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (axes.length === 0) {
        setMessage('Cần chọn ít nhất 1 trục thi pháp.');
        return false;
      }
    }
    if (currentStep === 3 && predictionEnabled && predictionQuestions.length === 0) {
      setMessage('Đã bật V0 nhưng chưa có câu hỏi dự đoán. Hãy nhập ít nhất 1 câu hỏi trước khi tiếp tục.');
      return false;
    }
    setMessage('');
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep(s => Math.min(s + 1, 4));
    }
  };

  const publish = async () => {
    if (!form.title.trim() || !form.classId || !form.textId || !form.rubricId) {
      setMessage('Thiếu tên nhiệm vụ, lớp, tác phẩm hoặc rubric.');
      return;
    }
    if (!rubricOptions.some(option => option.id === form.rubricId)) {
      setMessage('Rubric đã chọn không còn hợp lệ. Vui lòng chọn lại ma trận Rubric trước khi xuất bản.');
      return;
    }
    if (predictionEnabled && predictionQuestions.length === 0) {
      setMessage('Đã bật V0 nhưng chưa có câu hỏi dự đoán. Hãy nhập ít nhất 1 câu hỏi trước khi xuất bản.');
      return;
    }
    const textId = form.textId;
    const rubricId = form.rubricId;
    setSaving(true);
    setMessage('');
    try {
      await post({
        action: 'create_assignment',
        title: form.title.trim(),
        textVersionId: textId,
        classId: form.classId,
        rubricId,
        deadline: form.deadline || null,
        difficulty: form.difficulty,
        targetAxes: axes,
        prompt: form.prompt,
        workflowConfig: {
          predictionEnabled,
          aiReviewRequired: true,
          teacherApprovalRequired: true,
          reflectionRequired: true,
          officialRubricRequired: true
        },
        predictionTemplate: {
          enabled: predictionEnabled,
          requireConfidence: true,
          prompt: predictionEnabled ? predictionPrompt.trim() : '',
          questions: predictionEnabled ? predictionQuestions : []
        },
        guidingSteps: [
          ...(predictionEnabled ? ['Hoàn thành V0 trước đọc'] : []),
          'Nộp V1 để nhận góp ý AI/giáo viên',
          'Đọc góp ý và chỉnh sửa V2',
          'Hoàn thành REF1',
          'Chờ giáo viên chấm Rubric chính thức'
        ]
      });
      await refreshAcademicData();
      onNavigate('teacher-dashboard');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : 'Không thể tạo nhiệm vụ.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 pb-20">
      {/* Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-4">
        <div>
          <div className="mb-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onNavigate('teacher-dashboard')}
              leftIcon={<ArrowLeftIcon className="h-4 w-4" />}
            >
              Bàn giáo viên
            </Button>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Thiết kế nhiệm vụ học tập</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Tạo nhiệm vụ đọc hiểu theo 6 trục thi pháp.
          </p>
        </div>
      </div>

      {message && <Alert type="error" title="Cần lưu ý">{message}</Alert>}

      {/* Stepper Progress Navigation */}
      <nav aria-label="Các bước tạo nhiệm vụ" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {STEPS.map((s) => {
          const isCurrent = step === s.id;
          const isPassed = step > s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => {
                if (s.id < step || validateStep(step)) {
                  setStep(s.id);
                }
              }}
              className={`flex flex-col rounded-lg border p-3 text-left transition ${
                isCurrent
                  ? 'border-slate-900 bg-slate-900 text-white'
                  : isPassed
                  ? 'border-emerald-200 bg-emerald-50/70 text-slate-900'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-bold ${isCurrent ? 'text-slate-300' : isPassed ? 'text-emerald-700' : 'text-slate-400'}`}>
                  Bước {s.id}
                </span>
                {isPassed && <CheckIcon className="h-4 w-4 text-emerald-600" />}
              </div>
              <div className={`mt-1 text-sm font-semibold ${isCurrent ? 'text-white' : 'text-slate-900'}`}>
                {s.title}
              </div>
              <div className={`text-xs ${isCurrent ? 'text-slate-300' : 'text-slate-400'}`}>
                {s.desc}
              </div>
            </button>
          );
        })}
      </nav>

      {/* Step Contents */}
      <div className="rounded-lg border border-slate-200 bg-white p-5 sm:p-7">
        {/* Step 1: Class & Literature Text */}
        {step === 1 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">1. Thông tin cơ bản nhiệm vụ</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Đặt tên nhiệm vụ, chọn lớp, ngữ liệu và Rubric.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Field
                  label="Tên nhiệm vụ học tập"
                  placeholder="Ví dụ: Phân tích nghệ thuật xây dựng tình huống trong Vợ nhặt"
                  value={form.title}
                  onChange={v => set('title', v)}
                  required
                />
              </div>

              <Select
                label="Lớp học áp dụng"
                value={form.classId}
                onChange={v => set('classId', v)}
                options={classes.map(c => [c.code, `${c.code} (${c.name || 'Lớp học'})`])}
                required
              />

              <Select
                label="Tác phẩm ngữ liệu"
                value={form.textId}
                onChange={v => set('textId', v)}
                options={texts.map(t => [t.id, `${t.title} · ${t.author}`])}
                required
              />

              <div className="sm:col-span-2">
                <Select
                  label="Ma trận Rubric đánh giá"
                  value={form.rubricId}
                  onChange={v => set('rubricId', v)}
                  options={rubricOptions.map(r => [r.id, `${r.title} (${r.criteria?.length || 6} tiêu chí)`])}
                  required
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Prompt & Axes */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">2. Yêu cầu đề bài & Trục thi pháp</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Nhập đề bài và chọn các trục thi pháp cần dùng.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field
                label="Hạn nộp bài"
                type="datetime-local"
                value={form.deadline}
                onChange={v => set('deadline', v)}
              />

              <Select
                label="Mức độ yêu cầu"
                value={form.difficulty}
                onChange={v => set('difficulty', v)}
                options={[
                  ['Cơ bản', 'Cơ bản - Nhận biết và thông hiểu'],
                  ['Nâng cao', 'Nâng cao - Vận dụng và so sánh'],
                  ['Chuyên sâu', 'Chuyên sâu - Lí luận văn học']
                ]}
              />

              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Đề bài / Hướng dẫn
                </label>
                <textarea
                  rows={4}
                  value={form.prompt}
                  onChange={e => set('prompt', e.target.value)}
                  placeholder="Nhập yêu cầu, câu hỏi hoặc hướng dẫn cho học sinh..."
                  className="w-full rounded-lg border border-slate-300 p-3 text-xs leading-relaxed text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
                />
              </div>

              <div className="sm:col-span-2 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-semibold text-slate-700">
                    Chọn các trục thi pháp mục tiêu ({axes.length}/6 trục đã chọn)
                  </label>
                  <button
                    type="button"
                    onClick={() => setAxes(POETIC_AXES.map(a => a.id))}
                    className="text-xs text-primary-700 hover:underline"
                  >
                    Chọn toàn bộ 6 trục
                  </button>
                </div>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {POETIC_AXES.map(a => {
                    const isChecked = axes.includes(a.id);
                    return (
                      <label
                        key={a.id}
                        className={`flex items-start gap-3 rounded-lg border p-3 text-xs cursor-pointer transition ${
                          isChecked ? 'border-primary-300 bg-primary-50/50 text-primary-950 font-medium' : 'border-slate-200 bg-white text-slate-600'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleAxis(a.id)}
                          className="mt-0.5 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                        />
                        <div>
                          <div className="font-semibold text-slate-900">{a.title}</div>
                          <div className="text-slate-500 text-xs mt-0.5">{a.shortName}</div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Workflow Configuration */}
        {step === 3 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">3. Quy trình làm bài</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Chọn các bước học sinh phải hoàn thành trong nhiệm vụ này.
              </p>
            </div>

            <div className="grid gap-3.5 sm:grid-cols-2">
              {/* Optional V0 Prediction */}
              <label className="flex items-start justify-between rounded-lg border border-slate-200 bg-white p-4 text-xs cursor-pointer hover:border-slate-300">
                <div className="pr-3">
                  <div className="flex items-center gap-1.5 font-bold text-slate-900">
                    <span>V0 – Dự đoán trước khi đọc</span>
                    <Badge size="sm" variant="outline">Tùy chọn</Badge>
                  </div>
                  <p className="mt-1 leading-relaxed text-slate-500">
                    Cho học sinh trả lời câu hỏi V0 trước khi đọc toàn văn. Có thể tắt để bắt đầu từ V1.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={predictionEnabled}
                  onChange={() => setPredictionEnabled(value => !value)}
                  className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
              </label>

              {/* Required Steps (Invariants) */}
              <RequiredStep
                title="Góp ý AI"
                tag="Bắt buộc"
                description="Sau khi nộp V1, học sinh nhận góp ý AI để sửa bài."
              />
              <RequiredStep
                title="REF1 – Tự phản tư"
                tag="Bắt buộc"
                description="Học sinh hoàn thành REF1 sau bản chỉnh sửa và trước khi giáo viên chấm."
              />
              <RequiredStep
                title="Rubric giáo viên"
                tag="Bắt buộc"
                description="Giáo viên chấm theo Rubric của nhiệm vụ."
              />
            </div>

            {predictionEnabled && (
              <div className="space-y-4 rounded-lg border border-sky-200 bg-sky-50/60 p-4">
                <div>
                  <div className="text-sm font-bold text-sky-950">Câu hỏi V0</div>
                  <p className="mt-1 text-xs leading-5 text-sky-800">
                    Mỗi dòng là một câu hỏi. Nếu ngữ liệu đã có bộ V0, hệ thống sẽ tự nạp để giáo viên chỉnh sửa.
                  </p>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-slate-700">Lời dẫn V0</label>
                  <textarea
                    rows={2}
                    value={predictionPrompt}
                    onChange={event => setPredictionPrompt(event.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700">
                    <span>Câu hỏi dự đoán trước đọc</span>
                    <span className="font-normal text-slate-500">{predictionQuestions.length}/30 câu</span>
                  </label>
                  <textarea
                    rows={10}
                    value={predictionQuestionsText}
                    onChange={event => setPredictionQuestionsText(event.target.value)}
                    placeholder="Nhập mỗi câu hỏi trên một dòng..."
                    className="w-full rounded-lg border border-slate-300 bg-white p-3 text-xs leading-5 text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Step 4: Review & Publish */}
        {step === 4 && (
          <div className="space-y-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">4. Kiểm tra và xuất bản</h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Kiểm tra thông tin trước khi giao cho học sinh.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50/60 p-4 text-xs">
              <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3">
                <div>
                  <div className="text-xs font-bold text-slate-400">Tên nhiệm vụ</div>
                  <div className="mt-1 text-base font-bold text-slate-900">{form.title || 'Chưa đặt tên'}</div>
                </div>
                <Badge variant="primary">{form.difficulty}</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-4">
                <div>
                  <span className="font-semibold text-slate-500 block">Lớp áp dụng:</span>
                  <span className="text-slate-800 font-medium">{selectedClass ? `${selectedClass.code} (${selectedClass.name || 'Lớp'})` : form.classId || '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Ngữ liệu văn học:</span>
                  <span className="text-slate-800 font-medium">{selectedText ? `${selectedText.title} (${selectedText.author})` : '—'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Ma trận Rubric:</span>
                  <span className="text-slate-800 font-medium">{selectedRubric?.title || 'Rubric mặc định'}</span>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 block">Hạn nộp:</span>
                  <span className="text-slate-800 font-medium">{form.deadline ? new Date(form.deadline).toLocaleString('vi-VN') : 'Không giới hạn'}</span>
                </div>
              </div>

              <div className="border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-500 block mb-1">
                  Trục thi pháp áp dụng ({axes.length} trục):
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {axes.map(id => {
                    const ax = POETIC_AXES.find(a => a.id === id);
                    return <Badge key={id} size="sm" variant="outline">{ax?.shortName || id}</Badge>;
                  })}
                </div>
              </div>

              {predictionEnabled && (
                <div className="border-t border-slate-200 pt-3">
                  <span className="font-semibold text-slate-500 block mb-1">Câu hỏi V0:</span>
                  <span className="text-slate-800 font-medium">{predictionQuestions.length} câu hỏi sẽ hiển thị cho học sinh</span>
                </div>
              )}

              <div className="border-t border-slate-200 pt-3">
                <span className="font-semibold text-slate-500 block mb-1">Quy trình làm bài:</span>
                <div className="rounded border border-slate-200 bg-white p-2.5 font-mono text-xs text-slate-700">
                  {predictionEnabled ? 'V0 (Dự đoán) → ' : ''}V1 (Bản đầu) → AI/GV Góp ý → V2 (Chỉnh sửa) → REF1 (Tự phản tư) → Rubric Giáo viên
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Footer */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => (step > 1 ? setStep(step - 1) : onNavigate('teacher-dashboard'))}
        >
          {step > 1 ? 'Quay lại bước trước' : 'Hủy bỏ'}
        </Button>

        {step < 4 ? (
          <Button variant="primary" size="sm" onClick={nextStep}>
            Tiếp tục
          </Button>
        ) : (
          <Button variant="primary" size="sm" isLoading={saving} onClick={publish}>
            Xuất bản nhiệm vụ
          </Button>
        )}
      </div>
    </div>
  );
};

const RequiredStep = ({ title, description, tag }: { title: string; description: string; tag: string }) => (
  <div className="flex items-start justify-between rounded-lg border border-slate-200 bg-slate-50/70 p-4 text-xs">
    <div className="pr-3">
      <div className="flex items-center gap-1.5 font-bold text-slate-800">
        <span>{title}</span>
        <Badge size="sm" variant="primary">{tag}</Badge>
      </div>
      <p className="mt-1 leading-relaxed text-slate-500">{description}</p>
    </div>
    <input
      type="checkbox"
      checked
      readOnly
      aria-label={`${title} bắt buộc`}
      className="mt-1 rounded border-slate-300 text-slate-400 focus:ring-0 cursor-not-allowed"
    />
  </div>
);

const Field = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
    />
  </div>
);

const Select = ({
  label,
  value,
  onChange,
  options,
  required
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: Array<[string, string]>;
  required?: boolean;
}) => (
  <div>
    <label className="block text-xs font-semibold text-slate-700 mb-1">
      {label} {required && <span className="text-rose-500">*</span>}
    </label>
    <select
      value={value}
      onChange={e => onChange(e.target.value)}
      className="w-full rounded-lg border border-slate-300 bg-white p-2.5 text-xs text-slate-800 outline-none focus:border-primary-600 focus:ring-2 focus:ring-primary-600/10"
    >
      {options.map(([v, t]) => (
        <option key={v} value={v}>
          {t}
        </option>
      ))}
    </select>
  </div>
);

