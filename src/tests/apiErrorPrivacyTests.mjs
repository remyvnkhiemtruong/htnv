import assert from 'node:assert/strict';
import fs from 'node:fs';
import ts from 'typescript';
import { randomUUID } from 'node:crypto';

const coreSource = fs.readFileSync('api/_lib/academic-core.js', 'utf8').replace(/^import .*;\s*$/gm, '').replace(/export /g, '');
const anonymize = new Function(coreSource + '\nreturn anonymousCriterionScores;')();
assert.deepEqual(anonymize({ a: { score: 0, level: 1, note: 'Tên thật và đoạn bài riêng', extra: 'private' }, b: { score: 3, level: 4, note: 'private' }, invalid: { note: 'private' } }), { a: { score: 0, level: 1, note: '' }, b: { score: 3, level: 4, note: '' } });
assert.deepEqual(anonymize(null), {});
assert(coreSource.includes('criterionScores: researcher ? anonymousCriterionScores(row.criterion_scores)'));

const privateError = 'database connection failed for role private_db_user at private_host';
let failure = privateError;
const fail = async () => { throw new Error(failure); };
const deps = {
  randomUUID, authenticate: async () => ({ id: 'test', role: 'teacher' }),
  body: req => req.body, send: (res, status, json) => ({ status, json }),
  assertSameOrigin() {}, academicAction: fail, normalizeAcademicActionInput: value => value,
  saveLiteratureRevision: fail, createRubricVersion: fail, updateProfile: fail
};
function handler(path) {
  const compiled = ts.transpileModule(fs.readFileSync(path, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext } }).outputText
    .replace(/^import .*;\s*$/gm, '').replace('export default async function handler', 'async function handler');
  return new Function(...Object.keys(deps), compiled + '\nreturn handler;')(...Object.values(deps));
}
const log = console.error, warn = console.warn;
console.error = console.warn = () => {};
try {
  for (const [path, method, body, code] of [
    ['api/academic/action.ts', 'POST', { action: 'create_version' }, 'ACADEMIC_ACTION_ERROR'],
    ['api/academic/catalog.ts', 'POST', { action: 'save_literature' }, 'CATALOG_ERROR'],
    ['api/auth/me.ts', 'PATCH', {}, 'PROFILE_UPDATE_ERROR']
  ]) {
    const result = await handler(path)({ method, headers: {}, body }, { setHeader() {} });
    assert.equal(result.status, 500); assert.equal(result.json.code, code);
    assert(!JSON.stringify(result.json).includes(privateError));
  }
  failure = 'PREDICTION_REQUIRED_FIRST';
  const expected = await handler('api/academic/action.ts')({ method: 'POST', headers: {}, body: { action: 'create_version' } }, { setHeader() {} });
  assert.equal(expected.status, 400); assert.equal(expected.json.code, failure);
  assert(expected.json.message.includes('nộp phần dự đoán'));
} finally { console.error = log; console.warn = warn; }
console.log('PASS actual API handlers: unexpected server failures stay private, expected workflow errors stay actionable');
