import assert from 'node:assert/strict';
import fs from 'node:fs';
import { normalizeLoginIdentifier } from '../../api/auth/login-identifier.js';

for (let student = 1; student <= 45; student++) {
  const number = String(student).padStart(2, '0');
  const expected = `12a9.${number}@htnv.io.vn`;
  for (const identifier of [expected, `12A9.${number}`, `12a9.${student}`, `12a9.${number}@htnv.oi.vn`, ` 12A9.${number}@HTNV.IO.VN `]) {
    assert.equal(normalizeLoginIdentifier(identifier), expected);
  }
}
for (const identifier of ['12a9.12@example.com', '12a9.12@htnv.io.vn.attacker.com', '12a9.12@htnv-io.vn', '12a9.00', '12a9.12x', 'teacher@htnv.oi.vn', 'hs12a9.012@htnv.io.vn', 'student@gmail.com']) {
  assert.equal(normalizeLoginIdentifier(identifier), identifier, `Must not redirect an unrelated account: ${identifier}`);
}
assert.equal(normalizeLoginIdentifier(null), '');
assert.equal(normalizeLoginIdentifier(' TEACHER@HTNV.IO.VN '), 'teacher@htnv.io.vn');

// Aliases must share the same rate-limit key and continue through ordinary password verification.
const source = fs.readFileSync('api/auth/login.ts', 'utf8');
assert(source.indexOf('normalizeLoginIdentifier(email)') < source.indexOf('checkRateLimit(key,8,900)'));
assert(source.includes('login(cleanEmail,cleanPassword)'));
const auth = fs.readFileSync('api/auth/auth.js', 'utf8');
assert(auth.includes('row.account_status !== "active" || !passwordVerify(password, row.password_hash)'));
console.log('PASS login identifiers: all 45 accounts, domain typo, short names, isolated aliases, shared throttling');
