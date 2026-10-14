import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import * as icons from '@heroicons/react/24/outline/index.js';
import { POETIC_AXES } from '../data/seedData.ts';
import { learningVersionLabel } from '../utils/learningLabels.ts';

// Run the actual component's state, memo and effect callbacks with deterministic
// hook scheduling. No network calls, students, or grades are written.
let slots = [], cursor = 0, pending = [], changed = false;
const same = (a, b) => a && b && a.length === b.length && a.every((value, i) => Object.is(value, b[i]));
const hooks = {
  useState(initial) {
    const index = cursor++;
    const slot = slots[index] ||= { kind: 'state', value: typeof initial === 'function' ? initial() : initial };
    slot.set = next => { const value = typeof next === 'function' ? next(slot.value) : next; if (!Object.is(value, slot.value)) { slot.value = value; changed = true; } };
    return [slot.value, slot.set];
  },
  useMemo(fn, deps) {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) slots[index] = { kind: 'memo', deps, value: fn() };
    return slots[index].value;
  },
  useRef(initial) { const index = cursor++; slots[index] ||= { kind: 'ref', value: { current: initial } }; return slots[index].value; },
  useEffect(fn, deps) {
    const index = cursor++;
    if (!same(slots[index]?.deps, deps)) { slots[index] = { kind: 'effect', deps }; pending.push(fn); }
  }
};
const criteria = [{ id: 'criterion-a', axisId: 'plot_situation', title: 'Tình huống', levels: [1, 2, 3, 4].map(level => ({ level, score: level, label: 'Mức ' + level })) }];
const rubric = { id: 'rubric', criteria };
const assignment = { id: 'assignment', title: 'Bài kiểm tra', rubricId: rubric.id, textId: 'text' };
const portfolio = { id: 'port-student-assignment', studentId: 'student', studentName: 'Kiểm tra', assignmentId: assignment.id, status: 'waiting_official_rubric', versions: [{ id: 'version', versionNumber: 'V2', stage: 'revision', responses: Object.fromEntries(POETIC_AXES.map(a => [a.id, { analysisText: '', evidenceQuotes: [] }])) }] };
const grades = ['teacher-2', 'teacher-1'].map((id, index) => ({ id, studentId: 'student', assignmentId: 'assignment', versionNumber: 'V2', evaluatorId: id, evaluatorRole: 'teacher', criterionScores: { 'criterion-a': { level: index ? 2 : 4 } }, overallFeedback: index ? 'Nhận xét giáo viên một' : 'Nhận xét giáo viên hai' }));
let currentUser = { id: 'teacher-1', role: 'teacher' };
let workspace = { portfolio, assignment, rubric, feedbacks: [], aiReviews: [], reflections: [], rubricSubmissions: grades };
const compatibility = { assignments: [assignment], literatureTexts: [], portfolios: { [portfolio.id]: portfolio }, rubric, rubrics: { [rubric.id]: rubric }, feedbacks: [], rubricSubmissions: grades, aiReviews: [], reflections: [], isLoading: false, dataError: null };
const deps = {
  React, ...hooks, ...icons, POETIC_AXES, learningVersionLabel,
  useAuthStore: selector => selector({ currentUser }), usePortfolio: () => compatibility,
  useNotificationStore: () => ({ addToast() {} }), useTeacherWorkspaceQuery: () => ({ data: workspace, isLoading: !workspace }),
  Badge: () => null, Button: () => null
};
const source = ts.transpileModule(fs.readFileSync('src/views/TeacherReviewView.tsx', 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText
  .replace(/^import \{[\s\S]*?\} from ['"][^'"]+['"];\s*/gm, '').replace(/^import .*;\s*$/gm, '').replace('export const TeacherReviewView', 'const TeacherReviewView');
const View = new Function(...Object.keys(deps), source + '\nreturn TeacherReviewView;')(...Object.values(deps));
const originalWindow = globalThis.window;
globalThis.window = { addEventListener() {}, removeEventListener() {} };
function settle() {
  for (let pass = 0; pass < 20; pass++) {
    cursor = 0; pending = []; changed = false;
    View({ assignmentId: 'assignment', studentId: 'student', onNavigate() {} });
    for (const fn of pending) fn();
    if (!changed) return;
  }
  throw new Error('Actual grading component did not settle; effects are repeatedly resetting state');
}
try {
  settle();
  const scores = slots.find(s => s?.kind === 'state' && s.value?.['criterion-a'] !== undefined);
  const notes = slots.find(s => s?.kind === 'state' && s.value === 'Nhận xét giáo viên một');
  assert(scores); assert(notes); assert.equal(scores.value['criterion-a'], 2, 'Form must load the current teacher assessment, not another teacher assessment');
  scores.set({ 'criterion-a': 3 }); notes.set('Nhận xét đang soạn');
  workspace = { ...workspace, assignment: { ...assignment }, portfolio: { ...portfolio, status: 'completed', versions: portfolio.versions.map(v => ({ ...v })) } };
  settle();
  assert.equal(scores.value['criterion-a'], 3, 'Unrelated workspace refresh must preserve an unsaved rubric selection');
  assert.equal(notes.value, 'Nhận xét đang soạn');
  currentUser = { id: 'teacher-2', role: 'teacher' }; settle();
  assert.equal(scores.value['criterion-a'], 4); assert.equal(notes.value, 'Nhận xét giáo viên hai');
  slots = []; workspace = undefined; settle();
  console.log('PASS actual teacher component effects: own grades, unsaved selections survive refresh, teacher switching, bounded loading renders');
} finally { globalThis.window = originalWindow; }
