/** Resolve only the school's issued 12A9 identifiers; other email addresses stay unchanged. */
export function normalizeLoginIdentifier(value) {
  const identifier = String(value || '').trim().toLowerCase().slice(0, 240);
  const student = /^12a9\.(\d{1,2})(?:@htnv\.(?:io|oi)\.vn)?$/.exec(identifier);
  if (!student || Number(student[1]) < 1) return identifier;
  return `12a9.${student[1].padStart(2, '0')}@htnv.io.vn`;
}
