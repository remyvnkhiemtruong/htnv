import React, { useState } from 'react';
import { Alert, Badge, Button, Modal } from '../../components/ui';
import { adminAction } from '../../app/queries/adminManagementQueries';
import {
  downloadUserImportTemplate,
  readUserImportFile,
  type ImportedUserRow
} from '../../utils/userImportFile';
import { ArrowDownTrayIcon, DocumentArrowUpIcon } from '@heroicons/react/24/outline';

interface PreviewRow extends ImportedUserRow {
  index: number;
  errors: string[];
  status: 'ready' | 'invalid';
}

interface ImportResponse {
  preview: PreviewRow[];
  summary: { total: number; ready: number; invalid: number };
  imported?: number;
  skipped?: number;
  credentials?: Array<{
    id: string;
    name: string;
    email: string;
    temporaryPassword: string;
    classCode: string;
  }>;
}

const errorLabels: Record<string, string> = {
  INVALID_NAME: 'Họ tên không hợp lệ',
  INVALID_EMAIL: 'Email không hợp lệ',
  INVALID_ROLE: 'Vai trò không hợp lệ',
  ROLE_MISMATCH: 'Vai trò không thể gán lớp',
  DUPLICATE_EMAIL_IN_FILE: 'Email trùng trong file',
  DUPLICATE_CODE_IN_FILE: 'Mã trùng trong file',
  EMAIL_EXISTS: 'Email đã tồn tại',
  CODE_EXISTS: 'Mã học sinh/cán bộ đã tồn tại',
  CLASS_NOT_FOUND: 'Không tìm thấy lớp'
};

export const AdminUserImportModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onImported: () => void;
}> = ({ isOpen, onClose, onImported }) => {
  const [rows, setRows] = useState<ImportedUserRow[]>([]);
  const [preview, setPreview] = useState<ImportResponse | null>(null);
  const [credentials, setCredentials] = useState<ImportResponse['credentials']>([]);
  const [fileName, setFileName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const reset = () => {
    setRows([]);
    setPreview(null);
    setCredentials([]);
    setFileName('');
    setError('');
  };

  const close = () => {
    if (busy) return;
    reset();
    onClose();
  };

  const chooseFile = async (file?: File) => {
    if (!file) return;
    setBusy(true);
    setError('');
    setCredentials([]);
    try {
      const parsed = await readUserImportFile(file);
      if (!parsed.length) throw new Error('File không có dòng dữ liệu nào.');
      if (parsed.length > 300) throw new Error('Mỗi lần chỉ nhập tối đa 300 tài khoản.');
      setRows(parsed);
      setFileName(file.name);
      const result = await adminAction<ImportResponse>({ action: 'import_users', rows: parsed, dryRun: true });
      setPreview(result);
    } catch (e) {
      setRows([]);
      setPreview(null);
      setError(e instanceof Error ? e.message : 'Không thể đọc file.');
    } finally {
      setBusy(false);
    }
  };

  const execute = async () => {
    if (!rows.length || !preview?.summary.ready) return;
    setBusy(true);
    setError('');
    try {
      const result = await adminAction<ImportResponse>({ action: 'import_users', rows, dryRun: false });
      setPreview(result);
      setCredentials(result.credentials || []);
      onImported();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Không thể nhập tài khoản.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Nhập tài khoản hàng loạt"
      description="Hỗ trợ CSV/TSV và XLSX. Hệ thống kiểm tra dữ liệu trước, chỉ tạo các dòng hợp lệ."
      maxWidth="3xl"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <Button size="sm" variant="ghost" onClick={downloadUserImportTemplate} leftIcon={<ArrowDownTrayIcon className="h-4 w-4" />}>
            Tải file mẫu
          </Button>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={close}>Đóng</Button>
            <Button
              size="sm"
              variant="primary"
              onClick={execute}
              disabled={!preview?.summary.ready || Boolean(credentials?.length)}
              isLoading={busy}
            >
              Nhập {preview?.summary.ready || 0} tài khoản
            </Button>
          </div>
        </div>
      }
    >
      <div className="space-y-4">
        {error && <Alert type="error" title="Không thể nhập file">{error}</Alert>}

        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-4 hover:border-slate-400">
          <div>
            <div className="text-sm font-semibold text-slate-900">Chọn file Excel/CSV</div>
            <div className="mt-0.5 text-xs text-slate-500">.xlsx, .csv hoặc .tsv · tối đa 300 dòng/lần</div>
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
            <DocumentArrowUpIcon className="h-5 w-5" />
            {fileName || 'Chọn file'}
          </div>
          <input
            type="file"
            accept=".xlsx,.csv,.tsv,text/csv,text/tab-separated-values"
            className="sr-only"
            disabled={busy}
            onChange={event => void chooseFile(event.target.files?.[0])}
          />
        </label>

        {preview && (
          <>
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-md border border-slate-200 p-3">
                <div className="text-xs text-slate-500">Tổng số dòng</div>
                <div className="mt-1 text-xl font-semibold text-slate-900">{preview.summary.total}</div>
              </div>
              <div className="rounded-md border border-emerald-200 bg-emerald-50/50 p-3">
                <div className="text-xs text-emerald-700">Sẵn sàng nhập</div>
                <div className="mt-1 text-xl font-semibold text-emerald-900">{preview.summary.ready}</div>
              </div>
              <div className="rounded-md border border-amber-200 bg-amber-50/50 p-3">
                <div className="text-xs text-amber-700">Cần sửa / bỏ qua</div>
                <div className="mt-1 text-xl font-semibold text-amber-900">{preview.summary.invalid}</div>
              </div>
            </div>

            <div className="max-h-72 overflow-auto rounded-md border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="sticky top-0 border-b border-slate-200 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">#</th>
                    <th className="px-3 py-2">Họ tên</th>
                    <th className="px-3 py-2">Email</th>
                    <th className="px-3 py-2">Vai trò / lớp</th>
                    <th className="px-3 py-2">Kết quả</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {preview.preview.map(row => (
                    <tr key={row.index}>
                      <td className="px-3 py-2 text-slate-400">{row.index + 2}</td>
                      <td className="px-3 py-2 font-medium text-slate-900">{row.name || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{row.email || '—'}</td>
                      <td className="px-3 py-2 text-slate-600">{row.role}{row.classCode ? ' · ' + row.classCode : ''}</td>
                      <td className="px-3 py-2">
                        {row.status === 'ready' ? (
                          <Badge variant="emerald" size="sm">Sẵn sàng</Badge>
                        ) : (
                          <div className="max-w-xs space-y-0.5 text-amber-800">
                            {row.errors.map(code => <div key={code}>• {errorLabels[code] || code}</div>)}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {credentials && credentials.length > 0 && (
          <Alert type="success" title={'Đã tạo ' + credentials.length + ' tài khoản'}>
            <div className="mt-2 max-h-52 overflow-auto rounded border border-emerald-200 bg-white">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr><th className="px-2 py-1.5">Họ tên</th><th className="px-2 py-1.5">Email</th><th className="px-2 py-1.5">Mật khẩu tạm</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {credentials.map(item => (
                    <tr key={item.id}>
                      <td className="px-2 py-1.5">{item.name}</td>
                      <td className="px-2 py-1.5">{item.email}</td>
                      <td className="select-all px-2 py-1.5 font-mono font-semibold">{item.temporaryPassword}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-2 text-xs">Danh sách mật khẩu tạm chỉ có trong phản hồi lần nhập này. Hãy lưu lại trước khi đóng cửa sổ.</div>
          </Alert>
        )}
      </div>
    </Modal>
  );
};
