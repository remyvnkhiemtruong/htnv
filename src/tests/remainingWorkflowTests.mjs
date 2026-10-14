import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from '@heroicons/react/24/outline/index.js';
import { POETIC_AXES } from '../data/seedData.ts';
import { deriveStudentWorkflow, academicVersionsOf } from '../app/workflow/workflowState.ts';
import { learningVersionLabel } from '../utils/learningLabels.ts';
import { teacherAssessmentsByVersion } from '../utils/assessmentAnalytics.ts';

const content = Object.fromEntries(POETIC_AXES.map(a => [a.id, { axisId: a.id, analysisText: '', evidenceQuotes: [] }]));
const criteria = POETIC_AXES.map(a => ({ id: 'criterion-' + a.id, axisId: a.id, title: a.title, weight: 1, levels: [1, 2, 3, 4].map(level => ({ level, score: level, label: ['Chưa đạt', 'Đạt', 'Khá', 'Tốt'][level - 1] })) }));
const rubric = { id: 'rubric', criteria };
const assignment = { id: 'assignment', title: 'Bài kiểm tra', rubricId: rubric.id, workflowConfig: { predictionEnabled: true, reflectionRequired: true } };
const version = { id: 'version', versionNumber: 'V1', stage: 'initial', sequenceNo: 1, responses: content };
const portfolio = { id: 'port-student-assignment', assignmentId: assignment.id, studentId: 'student', studentName: 'Học sinh thử', className: '12A9', status: 'completed', versions: [{ id: 'prediction', versionNumber: 'V0', stage: 'prediction' }, version], currentDraft: content };
const grade = { id: 'grade', assignmentId: assignment.id, studentId: 'student', versionId: version.id, versionNumber: version.versionNumber, evaluatorId: 'teacher', evaluatorName: 'Giáo viên thử', evaluatorRole: 'teacher', submittedAt: '2026-10-15T00:00:00Z', totalScore: 12, maxScore: 24, overallFeedback: 'Nhận xét tổng kết để học sinh đối chiếu.', criterionScores: Object.fromEntries(criteria.map(c => [c.id, { level: 2, score: 2, note: 'Lý do chấm được giữ lại: ' + c.title }])) };
const closed = deriveStudentWorkflow({ assignment, portfolio, rubricSubmissions: [grade] });
assert(closed.isComplete && !closed.canEdit && closed.progress === 100);
assert(closed.steps.every(s => s.done && !s.active), 'A closed record must not ask for a revision or invent an unsubmitted step');
assert(!closed.steps.some(s => ['revision', 'reflection'].includes(s.id)));
const open = deriveStudentWorkflow({ assignment, portfolio: { ...portfolio, status: 'feedback_received' }, feedbacks: [{ assignmentId: assignment.id, studentId: portfolio.studentId }] });
assert(open.canEdit && !open.isComplete && open.steps.find(s => s.id === 'revision').active);

function compile(path, name, deps) {
 const source = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText
  .replace(/^import \{[\s\S]*?\} from ['"][^'"]+['"];\s*/gm, '').replace(/^import .*;\s*$/gm, '').replace(`export const ${name}`, `const ${name}`);
 return new Function(...Object.keys(deps), source + `\nreturn ${name};`)(...Object.values(deps));
}
const basic = tag => ({ children, className }) => React.createElement(tag, { className }, children);
const compatibility = { assignments: [assignment], literatureTexts: [], portfolios: { [portfolio.id]: portfolio }, rubric, rubrics: { [rubric.id]: rubric }, rubricSubmissions: [grade], feedbacks: [], aiReviews: [], reflections: [], isLoading: false, dataError: null };
const Analytics = compile('src/views/StudentAnalyticsView.tsx', 'StudentAnalyticsView', {
 React, useMemo: React.useMemo, ...icons, learningVersionLabel, teacherAssessmentsByVersion, academicVersionsOf,
 usePortfolio: () => compatibility, useAuthStore: fn => fn({ currentUser: { id: 'student', role: 'student' } }),
 useStudentOverviewQuery: () => ({}), useTeacherWorkspaceQuery: () => ({}),
 useStudentWorkspaceQuery: () => ({ data: { assignment, portfolio, rubric, feedbacks: [], rubricSubmissions: [grade] } }),
 Badge: basic('span'), Button: basic('button')
});
const html = renderToStaticMarkup(React.createElement(Analytics, { studentId: 'student', assignmentId: assignment.id, onNavigate() {} }));
assert(html.includes(grade.overallFeedback) && html.includes(grade.evaluatorName));
for (const c of criteria) assert(html.includes(grade.criterionScores[c.id].note), 'Students must see the actual reason for every score');

let slots = [], cursor = 0, pending = [], changed = false, tree;
const same = (a, b) => a && b && a.length === b.length && a.every((x, i) => Object.is(x, b[i]));
const hooks = {
 useState(initial) { const i = cursor++; const s = slots[i] ||= { value: typeof initial === 'function' ? initial() : initial }; return [s.value, v => { const next = typeof v === 'function' ? v(s.value) : v; if (!Object.is(next, s.value)) { s.value = next; changed = true; } }]; },
 useMemo(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) slots[i] = { deps, value: fn() }; return slots[i].value; },
 useRef(initial) { const i = cursor++; slots[i] ||= { value: { current: initial } }; return slots[i].value; },
 useEffect(fn, deps) { const i = cursor++; if (!same(slots[i]?.deps, deps)) { slots[i] = { deps }; pending.push(fn); } }
};
let workspace = { assignment, portfolio, rubric, feedbacks: [], aiReviews: [], reflections: [], rubricSubmissions: [grade] };
const otherVersion = { ...version, id: 'version-other' };
const otherPortfolio = { ...portfolio, id: 'port-other-assignment', studentId: 'other', studentName: 'Học sinh thứ hai', versions: [otherVersion] };
const otherGrade = { ...grade, id: 'grade-other', studentId: 'other', versionId: otherVersion.id };
const predictionOnly = { ...portfolio, id: 'port-prediction', studentId: 'prediction-student', studentName: 'Chỉ dự đoán', status: 'drafting', versions: [{ id: 'prediction-only', stage: 'prediction', versionNumber: 'V0' }] };
let currentUser = { id: 'teacher', role: 'teacher' }, props = { assignmentId: assignment.id, studentId: 'student', onNavigate() {} };
const sent = [];
Object.assign(compatibility, { portfolios: { [portfolio.id]: portfolio, [otherPortfolio.id]: otherPortfolio, [predictionOnly.id]: predictionOnly }, rubricSubmissions: [grade, otherGrade], submitRubric: async input => { sent.push(input); return { totalScore: 12, maxScore: 24 }; } });
const Teacher = compile('src/views/TeacherReviewView.tsx', 'TeacherReviewView', {
 React, ...hooks, ...icons, POETIC_AXES, learningVersionLabel,
 usePortfolio: () => compatibility, useAuthStore: fn => fn({ currentUser }), useNotificationStore: () => ({ addToast() {} }),
 useTeacherWorkspaceQuery: () => ({ data: workspace, refetch: async () => ({ data: workspace }) }),
 Badge: basic('span'), Button: basic('button')
});
function settle() { for (let pass = 0; pass < 25; pass++) { cursor = 0; pending = []; changed = false; tree = Teacher(props); for (const fn of pending) fn(); if (!changed) return; } throw new Error('Teacher review did not settle'); }
function nodes(node = tree) { if (!node || typeof node !== 'object') return []; if (Array.isArray(node)) return node.flatMap(n => n === undefined ? [] : nodes(n)); return [node, ...(node.props?.children === undefined ? [] : nodes(node.props.children))]; }
function text(node) { if (typeof node === 'string' || typeof node === 'number') return String(node); if (Array.isArray(node)) return node.map(text).join(''); return node?.props ? text(node.props.children) : ''; }
function button(label) { const n = nodes().find(n => typeof n.props?.onClick === 'function' && text(n).startsWith(label)); assert(n, 'Button missing: ' + label); return n; }
const previousWindow = globalThis.window;
globalThis.window = { addEventListener() {}, removeEventListener() {} };
try {
 settle();
 assert(!nodes().some(n => n.type === 'button' && text(n).includes(predictionOnly.studentName)), 'Prediction-only students must not enter the grading queue');
 const otherButton = nodes().find(n => n.type === 'button' && text(n).includes(otherPortfolio.studentName)); assert(otherButton);
 assert(nodes(otherButton).some(n => n.props?.title === 'Đã chấm điểm'), 'Other student badges must use the whole overview, not the current workspace');
 otherButton.props.onClick(); settle();
 assert(nodes().some(n => n.type === 'button' && text(n).includes(otherPortfolio.studentName) && n.props['aria-current'] === 'true'), 'An initial student URL must not undo subsequent queue navigation');
 const originalButton = nodes().find(n => n.type === 'button' && text(n).includes(portfolio.studentName)); originalButton.props.onClick(); settle();
 button('Chấm điểm (').props.onClick(); settle();
 assert(!nodes().some(n => typeof n.props?.onClick === 'function' && text(n) === 'Lưu điểm'), 'A submission without reflection cannot offer a failing save');
 assert(nodes().some(n => n.type === 'textarea' && n.props.value === grade.criterionScores[criteria[0].id].note && n.props.disabled));
 currentUser = { id: 'other-teacher', role: 'teacher' }; settle();
 assert(nodes().some(n => n.type === 'textarea' && n.props.value === grade.overallFeedback), 'Read-only closed grades remain visible to another assigned teacher');
 currentUser = { id: 'teacher', role: 'teacher' };
 workspace = { ...workspace, reflections: [{ studentId: 'student', assignmentId: assignment.id, versionId: version.id }] }; settle();
 await button('Lưu điểm').props.onClick(); settle();
 assert.equal(sent.at(-1).criterionScores[criteria[0].id].note, grade.criterionScores[criteria[0].id].note, 'Saving grades must not erase criterion reasons');
 const note = nodes().find(n => n.type === 'textarea' && n.props.id === 'criterion-note-' + criteria[0].id);
 note.props.onChange({ target: { value: 'Lý do mới đang soạn' } }); settle();
 workspace = { ...workspace, portfolio: { ...portfolio } }; settle();
 assert(nodes().some(n => n.type === 'textarea' && n.props.value === 'Lý do mới đang soạn'));
 await button('Lưu điểm').props.onClick(); settle();
 assert.equal(sent.at(-1).criterionScores[criteria[0].id].note, 'Lý do mới đang soạn');
 button('Nhận xét').props.onClick(); settle();
 const comment = nodes().find(n => n.type === 'textarea' && n.props.placeholder === 'Nhập nhận xét cho học sinh...');
 comment.props.onChange({ target: { value: 'Nhận xét riêng cho học sinh trước' } }); settle();
 let finishFeedback;
 compatibility.addAnchoredFeedback = () => new Promise(resolve => { finishFeedback = resolve; });
 settle();
 const sendingFeedback = button('Gửi nhận xét').props.onClick();
 props = { ...props, studentId: 'other' }; workspace = { ...workspace, portfolio: otherPortfolio, rubricSubmissions: [otherGrade], reflections: [] }; settle();
 assert(nodes().some(n => n.type === 'textarea' && n.props.placeholder === 'Nhập nhận xét cho học sinh...' && n.props.value === ''), 'Changing students must not transfer a private comment');
 const nextComment = nodes().find(n => n.type === 'textarea' && n.props.placeholder === 'Nhập nhận xét cho học sinh...');
 nextComment.props.onChange({ target: { value: 'Nhận xét mới cho học sinh thứ hai' } }); settle();
 finishFeedback({ ok: true }); await sendingFeedback; settle();
 assert(nodes().some(n => n.type === 'textarea' && n.props.value === 'Nhận xét mới cho học sinh thứ hai'), 'An old feedback acknowledgement must not clear the next student comment');
} finally { globalThis.window = previousWindow; }

const serviceSource = fs.readFileSync('api/_lib/academic-service.js', 'utf8').replace(/^import[\s\S]*?from ['"][^'"]+['"];\s*/gm, '').replace(/export /g, '');
const action = new Function('getPool', 'assertSameOrigin', serviceSource + '\nreturn academicAction;')(() => { throw new Error('Database must not be contacted for malformed ids'); }, () => {});
const teacher = { id: 'teacher', role: 'teacher' };
await assert.rejects(action(teacher, { action: 'submit_rubric', versionId: 'not-a-version' }), /VERSION_REQUIRED/);
await assert.rejects(action(teacher, { action: 'submit_rubric', versionId: '00000000-0000-4000-8000-000000000001', studentId: 'not-a-student' }), /STUDENT_REQUIRED/);
console.log('PASS closed workflow, student grading reasons, teacher queue badges, prediction exclusion, grading prerequisites, reason preservation, comment isolation, malformed grading ids');
