import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as icons from '@heroicons/react/24/outline/index.js';
import { assessmentPercentage, teacherAssessmentsByVersion } from '../utils/assessmentAnalytics.ts';
import { academicVersionsOf } from '../app/workflow/workflowState.ts';
import { learningVersionLabel } from '../utils/learningLabels.ts';

const grade = (id, versionNumber, submittedAt, totalScore = 1, extra = {}) => ({
  id, assignmentId: 'assignment', studentId: 'student', versionNumber,
  submittedAt, evaluatorRole: 'teacher', totalScore, maxScore: 4,
  criterionScores: { a: { score: totalScore, level: totalScore }, b: { score: 0, level: 1 } }, ...extra
});
const older = grade('older', 'V1', '2026-10-01', 1);
const newerTeacher = grade('newer', 'V1', '2026-10-03', 2);
const laterVersion = grade('revision', 'V2', '2026-10-02', 3);
assert.equal(assessmentPercentage(older), 25);
assert.equal(assessmentPercentage({ ...older, totalScore: 0 }), 0);
for (const invalid of [undefined, { ...older, maxScore: 0 }, { ...older, totalScore: null }, { ...older, totalScore: NaN }, { ...older, totalScore: 5 }]) {
  assert.equal(assessmentPercentage(invalid), null);
}
assert.deepEqual(teacherAssessmentsByVersion([older, newerTeacher]), [newerTeacher]);
assert.deepEqual(teacherAssessmentsByVersion([laterVersion, newerTeacher, older]), [newerTeacher, laterVersion], 'Version order must survive an older version being graded later');
assert.deepEqual(teacherAssessmentsByVersion([older, { ...older, id: 'peer', evaluatorRole: 'peer' }]), [older]);
const version = { id: 'v1-id', versionNumber: 'V1', sequenceNo: 1, stage: 'initial' };
assert.deepEqual(teacherAssessmentsByVersion([older, { ...newerTeacher, versionId: version.id }], [version]), [{ ...newerTeacher, versionId: version.id }]);
const input = [newerTeacher, older]; teacherAssessmentsByVersion(input); assert.equal(input[0], newerTeacher);

let data;
const basic = tag => ({ children, className }) => React.createElement(tag, { className }, children);
const deps = {
  React, useMemo: React.useMemo, useState: React.useState, ...icons,
  assessmentPercentage, teacherAssessmentsByVersion, academicVersionsOf, learningVersionLabel,
  usePortfolio: () => data, Badge: basic('span'), Button: basic('button'),
  useAuthStore: select => select({ currentUser: { id: 'student', role: 'student' } }),
  useStudentOverviewQuery: () => ({ data: undefined }),
  useStudentWorkspaceQuery: () => ({ data: { ...data, assignment: data.assignments[0], portfolio: Object.values(data.portfolios)[0], rubric: data.rubrics.rubric } }),
  useTeacherWorkspaceQuery: () => ({ data: undefined })
};
function component(path, name) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.React } }).outputText
    .replace(/^import \{[\s\S]*?\} from ['"][^'"]+['"];\s*/gm, '').replace(/^import .*;\s*$/gm, '').replace(`export const ${name}`, `const ${name}`);
  return new Function(...Object.keys(deps), compiled + `\nreturn ${name};`)(...Object.values(deps));
}
data = {
  assignments: [{ id: 'assignment', title: 'Bài kiểm tra', rubricId: 'rubric' }],
  rubrics: { rubric: { id: 'rubric', criteria: [
    { id: 'a', axisId: 'plot_situation', weight: 1, levels: [{ score: 1 }] },
    { id: 'b', axisId: 'character_detail', weight: 3, levels: [{ score: 1 }] }
  ] } },
  portfolios: { 'port-student-assignment': { id: 'port-student-assignment', studentId: 'student', assignmentId: 'assignment', className: '12A9', versions: [version], currentDraft: {} } },
  rubricSubmissions: [older], feedbacks: []
};
const ClassView = component('src/views/ClassAnalyticsView.tsx', 'ClassAnalyticsView');
const classHtml = renderToStaticMarkup(React.createElement(ClassView, { onNavigate() {} }));
assert.match(classHtml, /Điểm trung bình lớp<\/span>[\s\S]*?>25\.0%<\/div>/, 'Rendered class score must use the weighted official total, not a 50% axis mean');
data.rubricSubmissions = [older, newerTeacher];
const ResearchView = component('src/views/ResearcherJudgeView.tsx', 'ResearcherJudgeView');
const researchHtml = renderToStaticMarkup(React.createElement(ResearchView, { onNavigate() {} }));
assert.match(researchHtml, /<strong>0<\/strong> cặp đối chứng đủ điều kiện/);
const StudentView = component('src/views/StudentAnalyticsView.tsx', 'StudentAnalyticsView');
const studentHtml = renderToStaticMarkup(React.createElement(StudentView, { studentId: 'student', assignmentId: 'assignment', onNavigate() {} }));
assert(studentHtml.includes('1 lần chấm'));
assert(!studentHtml.includes('2 lần chấm'));
console.log('PASS analytics behavior and actual React rendering: weighted scores, one assessment per version, version order, missing scores, researcher pairs, student progress');
