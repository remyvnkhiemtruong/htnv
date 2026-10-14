export interface ImportedUserRow {
  name: string;
  email: string;
  role: string;
  classCode: string;
  phone: string;
  dateOfBirth: string;
  school: string;
  schoolYear: string;
  grade: string;
  studentCode: string;
  staffCode: string;
  department: string;
}

const emptyRow = (): ImportedUserRow => ({
  name: '',
  email: '',
  role: 'student',
  classCode: '',
  phone: '',
  dateOfBirth: '',
  school: '',
  schoolYear: '',
  grade: '',
  studentCode: '',
  staffCode: '',
  department: ''
});

const normalizeHeader = (value: string) => value
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, ' ')
  .trim();

const headerAliases: Record<keyof ImportedUserRow, string[]> = {
  name: ['ho va ten', 'ho ten', 'name', 'full name'],
  email: ['email', 'e mail', 'thu dien tu'],
  role: ['vai tro', 'role'],
  classCode: ['lop', 'ma lop', 'class', 'class code'],
  phone: ['so dien thoai', 'dien thoai', 'sdt', 'phone'],
  dateOfBirth: ['ngay sinh', 'ngay thang nam sinh', 'dob', 'date of birth'],
  school: ['truong', 'don vi', 'school'],
  schoolYear: ['nam hoc', 'school year'],
  grade: ['khoi', 'grade'],
  studentCode: ['ma hoc sinh', 'ma hs', 'student code', 'student id'],
  staffCode: ['ma can bo', 'ma giao vien', 'ma gv', 'staff code', 'teacher code'],
  department: ['to bo mon', 'bo mon', 'to chuyen mon', 'department']
};

const aliasLookup = new Map<string, keyof ImportedUserRow>();
for (const [key, values] of Object.entries(headerAliases) as [keyof ImportedUserRow, string[]][]) {
  for (const value of values) aliasLookup.set(normalizeHeader(value), key);
}

function parseDelimited(text: string, delimiter: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    if (quoted) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i += 1;
      } else if (ch === '"') {
        quoted = false;
      } else {
        cell += ch;
      }
      continue;
    }
    if (ch === '"') {
      quoted = true;
    } else if (ch === delimiter) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n') {
      row.push(cell.replace(/\r$/, ''));
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell.length || row.length) {
    row.push(cell.replace(/\r$/, ''));
    rows.push(row);
  }
  return rows;
}

const decodeText = (bytes: Uint8Array) => new TextDecoder('utf-8').decode(bytes);

async function inflateRaw(bytes: Uint8Array) {
  if (typeof DecompressionStream === 'undefined') {
    throw new Error('Trình duyệt này chưa hỗ trợ giải nén XLSX. Hãy dùng Chrome/Edge mới hoặc lưu file thành CSV.');
  }
  const ownedBuffer = bytes.slice().buffer as ArrayBuffer;
  const stream = new Blob([ownedBuffer]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

interface ZipEntry {
  name: string;
  method: number;
  compressedSize: number;
  localOffset: number;
}

function zipEntries(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  const view = new DataView(buffer);
  let eocd = -1;
  const min = Math.max(0, bytes.length - 65557);
  for (let i = bytes.length - 22; i >= min; i -= 1) {
    if (view.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('File XLSX không hợp lệ: không tìm thấy ZIP directory.');
  const entriesCount = view.getUint16(eocd + 10, true);
  let offset = view.getUint32(eocd + 16, true);
  const entries: ZipEntry[] = [];
  for (let i = 0; i < entriesCount; i += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) throw new Error('File XLSX bị lỗi cấu trúc ZIP.');
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const name = decodeText(bytes.slice(offset + 46, offset + 46 + nameLength));
    entries.push({ name, method, compressedSize, localOffset });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}

async function readZipEntry(buffer: ArrayBuffer, entry: ZipEntry) {
  const view = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  if (view.getUint32(entry.localOffset, true) !== 0x04034b50) throw new Error('XLSX có local ZIP header không hợp lệ.');
  const nameLength = view.getUint16(entry.localOffset + 26, true);
  const extraLength = view.getUint16(entry.localOffset + 28, true);
  const start = entry.localOffset + 30 + nameLength + extraLength;
  const compressed = bytes.slice(start, start + entry.compressedSize);
  if (entry.method === 0) return compressed;
  if (entry.method === 8) return inflateRaw(compressed);
  throw new Error(`XLSX dùng kiểu nén chưa được hỗ trợ: ${entry.method}`);
}

function xml(text: string) {
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.querySelector('parsererror')) throw new Error('Không thể đọc XML bên trong XLSX.');
  return doc;
}

function excelColumnIndex(reference: string) {
  const letters = reference.match(/[A-Z]+/i)?.[0]?.toUpperCase() || 'A';
  let result = 0;
  for (const char of letters) result = result * 26 + char.charCodeAt(0) - 64;
  return result - 1;
}

async function parseXlsx(buffer: ArrayBuffer) {
  const entries = zipEntries(buffer);
  const sharedEntry = entries.find(entry => entry.name === 'xl/sharedStrings.xml');
  const shared: string[] = [];
  if (sharedEntry) {
    const doc = xml(decodeText(await readZipEntry(buffer, sharedEntry)));
    for (const item of [...doc.getElementsByTagName('si')]) {
      shared.push([...item.getElementsByTagName('t')].map(node => node.textContent || '').join(''));
    }
  }

  const sheet = entries
    .filter(entry => /^xl\/worksheets\/sheet\d+\.xml$/i.test(entry.name))
    .sort((a, b) => a.name.localeCompare(b.name))[0];
  if (!sheet) throw new Error('Không tìm thấy worksheet trong file XLSX.');

  const doc = xml(decodeText(await readZipEntry(buffer, sheet)));
  const output: string[][] = [];
  for (const rowNode of [...doc.getElementsByTagName('row')]) {
    const row: string[] = [];
    for (const cell of [...rowNode.getElementsByTagName('c')]) {
      const index = excelColumnIndex(cell.getAttribute('r') || 'A1');
      const type = cell.getAttribute('t') || '';
      let value = '';
      if (type === 'inlineStr') {
        value = [...cell.getElementsByTagName('t')].map(node => node.textContent || '').join('');
      } else {
        const raw = cell.getElementsByTagName('v')[0]?.textContent || '';
        value = type === 's' ? (shared[Number(raw)] ?? '') : raw;
      }
      row[index] = value;
    }
    output.push(row.map(value => value ?? ''));
  }
  return output;
}

function excelDate(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const vn = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (vn) return `${vn[3]}-${vn[2].padStart(2, '0')}-${vn[1].padStart(2, '0')}`;
  const serial = Number(trimmed);
  if (Number.isFinite(serial) && serial > 20000 && serial < 80000) {
    const base = Date.UTC(1899, 11, 30);
    const date = new Date(base + Math.floor(serial) * 86400000);
    return date.toISOString().slice(0, 10);
  }
  return trimmed.slice(0, 10);
}

function mapRows(table: string[][]): ImportedUserRow[] {
  const headerIndex = table.findIndex(row => row.some(value => aliasLookup.has(normalizeHeader(String(value || '')))));
  if (headerIndex < 0) throw new Error('Không tìm thấy hàng tiêu đề. File cần có ít nhất cột Họ và tên và Email.');
  const header = table[headerIndex].map(value => aliasLookup.get(normalizeHeader(String(value || ''))) || null);
  if (!header.includes('name') || !header.includes('email')) throw new Error('File cần có cột Họ và tên và Email.');

  const rows: ImportedUserRow[] = [];
  for (const source of table.slice(headerIndex + 1)) {
    if (!source.some(value => String(value || '').trim())) continue;
    const row = emptyRow();
    header.forEach((key, index) => {
      if (!key) return;
      (row as any)[key] = String(source[index] ?? '').trim();
    });
    row.role = normalizeHeader(row.role) === 'giao vien' ? 'teacher'
      : normalizeHeader(row.role) === 'hoc sinh' ? 'student'
      : (row.role || 'student').toLowerCase();
    row.classCode = row.classCode.toUpperCase();
    row.dateOfBirth = excelDate(row.dateOfBirth);
    rows.push(row);
  }
  return rows;
}

export async function readUserImportFile(file: File): Promise<ImportedUserRow[]> {
  const lower = file.name.toLowerCase();
  if (lower.endsWith('.xlsx')) return mapRows(await parseXlsx(await file.arrayBuffer()));
  const text = await file.text();
  const delimiter = lower.endsWith('.tsv') ? '\t' : (text.split('\n')[0]?.split(';').length > text.split('\n')[0]?.split(',').length ? ';' : ',');
  return mapRows(parseDelimited(text, delimiter));
}

export const userImportTemplateHeaders = [
  'Họ và tên',
  'Email',
  'Vai trò',
  'Lớp',
  'Số điện thoại',
  'Ngày sinh',
  'Trường',
  'Năm học',
  'Khối',
  'Mã học sinh',
  'Mã cán bộ',
  'Tổ/Bộ môn'
];

export function downloadUserImportTemplate() {
  const example = [
    userImportTemplateHeaders,
    ['Nguyễn Văn A','hocsinh@example.edu.vn','student','12A1','0900000000','2009-01-15','THPT Example','2026-2027','12','HS001','',''],
    ['Trần Thị B','giaovien@example.edu.vn','teacher','12A1','','1990-05-20','THPT Example','2026-2027','','','GV001','Ngữ văn']
  ];
  const csv = '\ufeff' + example.map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\r\n');
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'mau_import_tai_khoan_htnv.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
