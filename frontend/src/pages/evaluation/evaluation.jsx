import React, { useEffect, useMemo, useRef, useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import { useNavigate } from 'react-router-dom';
import DropDownFilter from '../../components/dropdownfilter.jsx';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { ROLES } from '../../constants/config.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { get, post, put } from '../../services/api.js';
import '../leave/leave.css';

const toIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const hasScoreOrRemarks = (notes) => {
  const s = String(notes || '');
  return /\bScore\s*:\s*\S+/i.test(s) || /\bRemarks\s*:\s*\S+/i.test(s);
};

const docHasFiles = (value) => {
  if (!value) return false;
  const raw = typeof value === 'string' ? value : JSON.stringify(value);
  const trimmed = String(raw || '').trim();
  if (!trimmed) return false;

  try {
    const obj = typeof value === 'object' && value ? value : JSON.parse(trimmed);
    if (!obj || typeof obj !== 'object') return false;
    const candidates = [obj.file, obj.breakdown, obj.final].filter(Boolean);
    return candidates.some((c) => (c?.fileId || c?.path));
  } catch {
    // If it's not JSON but a non-empty string, treat as present.
    return trimmed.length > 0;
  }
};

const safeJsonParse = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return null;
  try {
    return JSON.parse(value);
  } catch {
    return null;
  }
};

const normalizeEvaluationDocs = (evaluation) => {
  const raw = evaluation?.evaluation_document_path;
  if (!raw) return null;

  if (typeof raw === 'object') return raw;

  const parsed = safeJsonParse(raw);
  if (parsed && typeof parsed === 'object') return parsed;

  return { file: { provider: 'unknown', fileName: 'Document', legacy: true, raw } };
};

const guessMimeType = (fileNameOrUrl) => {
  const raw = String(fileNameOrUrl || '').toLowerCase();
  const clean = raw.split('?')[0].split('#')[0];
  const ext = clean.includes('.') ? clean.split('.').pop() : '';
  if (ext === 'pdf') return 'application/pdf';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'webp') return 'image/webp';
  return '';
};

const sanitizeForFileName = (value) =>
  String(value || '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .trim();

const withEmployeePrefix = (employeeCode, fileName) => {
  const rawEmp = sanitizeForFileName(employeeCode);
  const rawName = String(fileName || 'document').trim() || 'document';
  if (!rawEmp) return rawName;
  if (rawName.toLowerCase().startsWith(`${rawEmp.toLowerCase()}_`)) return rawName;
  return `${rawEmp}_${rawName}`;
};

function PreviewModal({ open, title, fileName, url, mimeType, downloadUrl, loading, onClose }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const mt = String(mimeType || '').toLowerCase();
  const isPdf = mt.includes('pdf') || String(url || '').toLowerCase().split('?')[0].endsWith('.pdf');
  const isImg = mt.startsWith('image/');
  const effectiveDownloadUrl = downloadUrl || url;
  const effectiveFileName = String(fileName || 'document');

  const handleDownload = async () => {
    if (!effectiveDownloadUrl || loading) return;

    const clickDownload = (href) => {
      const a = document.createElement('a');
      a.href = href;
      a.download = effectiveFileName;
      a.rel = 'noopener noreferrer';
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    };

    // For blob/data URLs, we can download directly with the correct filename.
    if (String(effectiveDownloadUrl).startsWith('blob:') || String(effectiveDownloadUrl).startsWith('data:')) {
      clickDownload(effectiveDownloadUrl);
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(effectiveDownloadUrl, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Download failed');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      clickDownload(objectUrl);
      setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
    } catch {
      // Fallback: open in new tab (filename may be browser-determined).
      window.open(effectiveDownloadUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Preview'}
    >
      <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-[#990100] flex items-center justify-between gap-3">
          <h2 className="text-white text-sm font-semibold tracking-wide truncate">{title || 'Preview'}</h2>
          <button type="button" onClick={onClose} className="text-white/90 hover:text-white text-sm font-medium">
            Close
          </button>
        </div>

        <div className="px-5 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <p className="text-gray-600">Loading…</p>
            </div>
          ) : isPdf ? (
            <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
              <iframe title="Document preview" src={url} className="w-full h-[70vh]" />
            </div>
          ) : isImg ? (
            <div className="border border-gray-200 rounded-md overflow-hidden bg-white flex items-center justify-center">
              <img src={url} alt="Preview" className="max-h-[70vh] w-full object-contain" />
            </div>
          ) : (
            <div className="text-sm text-gray-700">Preview isn’t available for this file type. Use Open/Download.</div>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            {!loading && effectiveDownloadUrl ? (
              <>
                <a
                  href={effectiveDownloadUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                >
                  Download
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="bg-[#990100] text-white rounded-md px-4 py-2 text-sm hover:bg-[#ad3332]"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatPrettyDate(iso) {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString(undefined, {
    weekday: 'long',
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function EventPopover({ open, anchor, data, onClose, onReschedule, onUploadResult, onOpenDoc, canManage }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener('mousedown', onDocMouseDown);
    const onKey = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDocMouseDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open || !data) return null;
  const CARD_W = 430;
  const CARD_H = canManage ? 340 : 340;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(16, Math.min(anchor.x - 60, vw - CARD_W - 16));
  const maxH = Math.max(240, Math.min(CARD_H, vh - 32));
  const top = Math.max(16, Math.min(anchor.y - 80, vh - maxH - 16));

  const docs = normalizeEvaluationDocs(data);
  const breakdown = docs?.breakdown || null;
  const finalDoc = docs?.final || null;
  const legacyFile = docs?.file || null;
  const breakdownLabel = breakdown?.fileName || legacyFile?.fileName || 'Breakdown';
  const finalLabel = finalDoc?.fileName || 'Final';

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/10" />

      <div
        ref={ref}
        className="gc-popover absolute bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col"
        style={{ width: CARD_W, maxHeight: maxH, left, top }}
      >
        <div className="relative p-3 flex justify-end gap-2 border-b">
          <button className="gc-icon-btn" title="Close" onClick={onClose}>
            ✕
          </button>
        </div>
        <div className="p-5 overflow-y-auto flex-1">
          <div className="flex items-start gap-3">
            <span className="gc-dot" style={{ background: data.dotColor || '#F59E0B' }} />
            <div>
              <h3 className="text-2xl font-medium text-gray-900 leading-tight">{data.title}</h3>
              <p className="text-sm text-gray-600 mt-1">{data.dateLabel || formatPrettyDate(data.date)}</p>
            </div>
          </div>

          <div className="mt-6 space-y-3 text-sm text-gray-800">
            <div className="gc-row">
              <span className="gc-row-icon">≡</span>
              <span>Evaluation</span>
            </div>
            <div className="gc-row">
              <span className="gc-row-icon">📅</span>
              <span>{data.evaluationType || 'Evaluation'}</span>
            </div>
            {data.employeeName ? (
              <div className="gc-row">
                <span className="gc-row-icon">👤</span>
                <span>{data.employeeName}</span>
              </div>
            ) : null}
          </div>

          {canManage ? (
            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                type="button"
                className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                onClick={() => onReschedule?.(data)}
              >
                Update Schedule
              </button>
              <button
                type="button"
                className="bg-[#990100] text-white rounded-md px-4 py-2 text-sm hover:bg-[#ad3332]"
                onClick={() => onUploadResult?.(data)}
              >
                {data?.hasResult ? 'Update Result' : 'Upload Result'}
              </button>
            </div>
          ) : (
            <div className="mt-6 flex items-center justify-end gap-3">
              {breakdown || legacyFile ? (
                <button
                  type="button"
                  className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onOpenDoc?.(data, breakdown ? 'breakdown' : 'file', breakdownLabel)}
                >
                  {breakdownLabel}
                </button>
              ) : null}
              {finalDoc ? (
                <button
                  type="button"
                  className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                  onClick={() => onOpenDoc?.(data, 'final', finalLabel)}
                >
                  {finalLabel}
                </button>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ModalShell({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden">
        <div className="bg-[#990100] text-white px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-2xl leading-none hover:opacity-80"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-10 py-8">{children}</div>
      </div>
    </div>
  );
}

function ScheduleModal({ open, mode, employees, initial, onClose, onSaved, onNotify }) {
  const isUpdate = mode === 'update';

  const [employeeId, setEmployeeId] = useState('');
  const [evaluationType, setEvaluationType] = useState(`ANNUAL (${new Date().getFullYear()})`);
  const [evaluationDate, setEvaluationDate] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSaving(false);

    if (isUpdate) {
      setEmployeeId(String(initial?.employee_id || ''));
      setEvaluationType(String(initial?.evaluation_type || ''));
      setEvaluationDate(toIsoDate(initial?.evaluation_date) || '');
      setNotes(String(initial?.evaluation_notes || ''));
      return;
    }

    setEmployeeId(employees?.[0]?.id ? String(employees[0].id) : '');
    setEvaluationType(`ANNUAL (${new Date().getFullYear()})`);
    setEvaluationDate(toIsoDate(initial?.evaluation_date) || toIsoDate(new Date().toISOString()) || '');
    setNotes('');
  }, [open, isUpdate, initial, employees]);

  const canSubmit = Boolean(employeeId && evaluationType && evaluationDate);

  const handleSubmit = async () => {
    if (!canSubmit || saving) return;

    try {
      setSaving(true);
      if (isUpdate) {
        await put(`/evaluations/${encodeURIComponent(String(initial?.evaluation_id))}/schedule`, {
          evaluation_date: evaluationDate,
          evaluation_type: evaluationType,
        });

        onSaved?.();
        onNotify?.({ type: 'success', title: 'Success', message: 'Evaluation schedule updated successfully.' });
        onClose?.();
        return;
      }

      await post('/evaluations/schedule', {
        employee_id: employeeId,
        evaluation_type: evaluationType,
        evaluation_date: evaluationDate,
        evaluation_notes: notes || null,
      });

      onSaved?.();
      onNotify?.({ type: 'success', title: 'Success', message: 'Evaluation scheduled successfully.' });
      onClose?.();
    } catch (e) {
      console.error('Failed to save evaluation schedule:', e);
      onNotify?.({ type: 'error', title: 'Error', message: e?.message || 'Failed to save evaluation schedule.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell open={open} title={isUpdate ? 'Update Evaluation Schedule' : 'Schedule Evaluation'} onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Employee</label>
            <select
              className="input-select"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              disabled={isUpdate}
            >
              {(employees || []).map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {isUpdate ? <p className="text-xs text-gray-500 mt-2">Employee is fixed for an existing schedule.</p> : null}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Evaluation Type</label>
            <select className="input-select" value={evaluationType} onChange={(e) => setEvaluationType(e.target.value)}>
              <option value={`ANNUAL (${new Date().getFullYear()})`}>{`ANNUAL (${new Date().getFullYear()})`}</option>
              <option value="Probationary">Probationary</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">Schedule Date</label>
          <input
            type="date"
            className="input-select"
            value={evaluationDate}
            onChange={(e) => setEvaluationDate(e.target.value)}
          />
        </div>

        {!isUpdate ? (
          <div>
            <label className="block text-sm font-semibold text-gray-800 mb-2">Notes (optional)</label>
            <textarea
              className="border border-gray-300 rounded-md p-3 text-sm h-28 resize-none w-full"
              placeholder="Notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        ) : null}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            className="bg-white border border-gray-300 rounded-md px-5 py-2 text-sm hover:bg-gray-50"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-[#990100] text-white rounded-md px-6 py-2 text-sm hover:bg-[#ad3332] disabled:opacity-60"
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function Evaluation() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const role = user?.role;
  const isEmployee = role === ROLES.EMPLOYEE;
  const canManage = role === ROLES.ADMIN || role === ROLES.HR;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [rawEvents, setRawEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [anchor, setAnchor] = useState({ x: 200, y: 200 });

  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [scheduleMode, setScheduleMode] = useState('create');
  const [scheduleInitial, setScheduleInitial] = useState(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Info',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
  });

  const [previewState, setPreviewState] = useState({
    open: false,
    title: 'Preview',
    fileName: '',
    url: '',
    mimeType: '',
    isObjectUrl: false,
    downloadUrl: '',
    loading: false,
  });

  const notify = ({ type, title, message }) => {
    const t = type === 'error' ? (title || 'Error') : title || 'Info';
    setConfirmState({
      open: true,
      title: t,
      message: message || '',
      confirmText: 'OK',
      cancelText: null,
      onConfirm: null,
    });
  };

  const closeConfirm = () => setConfirmState((p) => ({ ...p, open: false, onConfirm: null }));

  const closePreview = () => {
    setPreviewState((p) => {
      if (p?.isObjectUrl && p?.url) {
        try {
          URL.revokeObjectURL(p.url);
        } catch {
          // ignore
        }
      }
      return {
        open: false,
        title: 'Preview',
        fileName: '',
        url: '',
        mimeType: '',
        isObjectUrl: false,
        downloadUrl: '',
        loading: false,
      };
    });
  };

  const openEvaluationDoc = async ({ evaluationId, doc, fileName, employeeCode }) => {
    try {
      const safeFileName = String(fileName || '').trim();
      const effectiveFileName = withEmployeePrefix(employeeCode, safeFileName || 'document');
      const title = safeFileName ? `Preview: ${safeFileName}` : 'Preview';

      setPreviewState({
        open: true,
        title,
        fileName: effectiveFileName,
        url: '',
        mimeType: '',
        isObjectUrl: false,
        downloadUrl: '',
        loading: true,
      });

      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
      const safeId = encodeURIComponent(String(evaluationId));
      const safeDoc = encodeURIComponent(String(doc || 'file'));
      const url = base.endsWith('/api')
        ? `${base}/evaluations/${safeId}/document/preview?doc=${safeDoc}`
        : `${base}/api/evaluations/${safeId}/document/preview?doc=${safeDoc}`;

      const token = localStorage.getItem('access_token');
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const provider = String(json?.data?.provider || '').toLowerCase();
        const previewUrl =
          json?.data?.url ||
          json?.data?.signedUrl ||
          json?.data?.signedURL ||
          json?.data?.signed_url ||
          null;

        if (!previewUrl) {
          notify({ type: 'error', title: 'Error', message: json?.message || 'Preview link is not available.' });
          return;
        }

        const looksLikeInlineStream = String(previewUrl).includes('/document/download');
        if (provider === 'google_drive' || looksLikeInlineStream) {
          const dlRes = await fetch(previewUrl, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          if (!dlRes.ok) {
            const msg = await dlRes.text();
            throw new Error(msg || 'Download failed');
          }
          const blob = await dlRes.blob();
          const objectUrl = URL.createObjectURL(blob);
          setPreviewState({
            open: true,
            title,
            fileName: effectiveFileName,
            url: objectUrl,
            mimeType: String(blob?.type || '') || guessMimeType(effectiveFileName),
            isObjectUrl: true,
            downloadUrl: objectUrl,
            loading: false,
          });
          return;
        }

        setPreviewState({
          open: true,
          title,
          fileName: effectiveFileName,
          url: previewUrl,
          mimeType: guessMimeType(effectiveFileName || previewUrl),
          isObjectUrl: false,
          downloadUrl: previewUrl,
          loading: false,
        });
        return;
      }

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Download failed');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewState({
        open: true,
        title,
        fileName: effectiveFileName,
        url: objectUrl,
        mimeType: String(blob?.type || '') || guessMimeType(effectiveFileName),
        isObjectUrl: true,
        downloadUrl: objectUrl,
        loading: false,
      });
    } catch (e) {
      console.error('Failed to open evaluation document:', e);
      notify({ type: 'error', title: 'Error', message: e?.message || 'Failed to open document' });

      setPreviewState((p) => ({
        ...p,
        loading: false,
      }));
    }
  };

  const fetchInit = async () => {
    try {
      setLoading(true);
      setError('');

      if (canManage) {
        const empRes = await get('/employees');
        const list = Array.isArray(empRes?.data) ? empRes.data : [];
        setEmployees(
          list
            .map((e) => ({
              id: String(e?.id || ''),
              name: `${e?.employee_id || ''} - ${(e?.first_name || '') + ' ' + (e?.last_name || '')}`.trim(),
            }))
            .filter((e) => e.id)
        );
      } else {
        setEmployees([]);
      }

      const endpoint = isEmployee ? '/evaluations/me' : '/evaluations';
      const res = await get(endpoint);
      const rows = Array.isArray(res?.data) ? res.data : [];

      const mapped = rows
        .filter((r) => r?.evaluation_date)
        .map((r) => {
          const employeeName = String(r?.employee_name || '').trim();
          const type = String(r?.evaluation_type || 'Evaluation').trim();
          const date = toIsoDate(r?.evaluation_date);
          const title = isEmployee ? type : `${employeeName} - ${type}`.trim();

          const hasResult = docHasFiles(r?.evaluation_document_path) || hasScoreOrRemarks(r?.evaluation_notes);

          return {
            id: String(r?.evaluation_id || `${title}-${date}`),
            title,
            start: date,
            dotColor: '#F59E0B',
            pillBg: '#FFE1A3',
            pillText: '#FF8A00',
            employeeName: employeeName || null,
            employeeId: r?.employee_id,
            employeeCode: r?.employee_code || null,
            evaluationType: type,
            date,
            evaluation_id: r?.evaluation_id,
            evaluation_type: r?.evaluation_type,
            evaluation_date: r?.evaluation_date,
            evaluation_notes: r?.evaluation_notes,
            evaluation_document_path: r?.evaluation_document_path,
            hasResult,
          };
        });

      setRawEvents(mapped);
    } catch (e) {
      console.error('Failed to load evaluation calendar:', e);
      setError(e?.message || 'Failed to load evaluation calendar');
      setRawEvents([]);
      setEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee, canManage]);

  const typeOptions = useMemo(() => {
    const types = Array.from(
      new Set(
        rawEvents
          .map((e) => String(e.evaluationType || '').trim())
          .filter((v) => v.length)
      )
    ).sort((a, b) => a.localeCompare(b));

    return [{ value: 'all', label: 'All' }, ...types.map((t) => ({ value: t, label: t }))];
  }, [rawEvents]);

  const filteredEvents = useMemo(() => {
    let list = rawEvents;

    if (typeFilter !== 'all') {
      list = list.filter((e) => String(e.evaluationType || '') === typeFilter);
    }

    const q = String(searchTerm || '').trim().toLowerCase();
    if (!q) return list;
    return list.filter((e) => String(e.title || '').toLowerCase().includes(q));
  }, [rawEvents, typeFilter, searchTerm]);

  const calendarEvents = useMemo(
    () =>
      [...filteredEvents]
        .sort((a, b) => {
          const aTime = a?.start ? new Date(String(a.start) + 'T00:00:00').getTime() : 0;
          const bTime = b?.start ? new Date(String(b.start) + 'T00:00:00').getTime() : 0;
          if (aTime !== bTime) return aTime - bTime;
          return String(a?.title || '').localeCompare(String(b?.title || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        })
        .map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          backgroundColor: 'transparent',
          borderColor: 'transparent',
          textColor: 'inherit',
          extendedProps: {
            ...e,
            dateLabel: formatPrettyDate(e.start),
          },
        })),
    [filteredEvents]
  );

  const handleOpenCreate = (dateIso) => {
    setScheduleMode('create');
    setScheduleInitial({ evaluation_date: dateIso });
    setScheduleOpen(true);
  };

  const handleOpenUpdate = (ev) => {
    setScheduleMode('update');
    setScheduleInitial({
      evaluation_id: ev?.evaluation_id,
      employee_id: ev?.employeeId,
      evaluation_type: ev?.evaluationType,
      evaluation_date: ev?.date,
      evaluation_notes: ev?.evaluation_notes,
    });
    setScheduleOpen(true);
  };

  return (
    <div>
      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-[#990100]">Evaluation</h1>

          <div className="flex gap-3">
            <DropDownFilter label="Type" value={typeFilter} onChange={setTypeFilter} options={typeOptions} />
            <input
              type="search"
              placeholder="Search"
              className="border border-[#990100] rounded-lg px-3 h-9 text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <hr className="border-[#990100] mb-6" />

        {loading ? (
          <div className="py-16 text-center text-gray-600">Loading evaluation calendar…</div>
        ) : error ? (
          <div className="bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            <div className="lg:col-span-3 bg-white rounded-xl border border-gray-300 shadow-sm px-6 py-5">
              <FullCalendar
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                height="auto"
                fixedWeekCount={false}
                expandRows={true}
                showNonCurrentDates={true}
                dayMaxEvents={true}
                eventOrder="title"
                eventOrderStrict={true}
                eventDisplay="block"
                headerToolbar={{
                  left: 'prev,next today',
                  center: 'title',
                  right: '',
                }}
                events={calendarEvents}
                eventContent={(arg) => {
                  const bg = arg.event.extendedProps?.pillBg || '#FFE1A3';
                  const color = arg.event.extendedProps?.pillText || '#FF8A00';
                  return (
                    <div className="gc-event-pill" style={{ background: bg, color }} title={arg.event.title}>
                      {arg.event.title}
                    </div>
                  );
                }}
                dateClick={(info) => {
                  if (!canManage) return;
                  handleOpenCreate(info?.dateStr);
                }}
                eventClick={(info) => {
                  const x = info.jsEvent?.clientX ?? 200;
                  const y = info.jsEvent?.clientY ?? 200;
                  setAnchor({ x, y });
                  setSelected(info.event.extendedProps);
                  setPopoverOpen(true);
                }}
              />
            </div>

            <div className="gc-legend">
              <div className="gc-legend-title">Calendars</div>
              <div className="gc-legend-line" />
              <div className="gc-legend-item">
                <span className="gc-legend-color" style={{ background: '#F59E0B' }} />
                <span>Evaluation</span>
              </div>
              {canManage ? (
                <div className="mt-4 text-xs text-gray-600">
                  Tip: Click a date to schedule.
                </div>
              ) : null}
            </div>
          </div>
        )}
      </div>

      <EventPopover
        open={popoverOpen}
        anchor={anchor}
        data={selected}
        canManage={canManage}
        onClose={() => setPopoverOpen(false)}
        onReschedule={(ev) => {
          setPopoverOpen(false);
          handleOpenUpdate(ev);
        }}
        onUploadResult={(ev) => {
          setPopoverOpen(false);
          const evalId = ev?.evaluation_id;
          if (!evalId) return;
          navigate(`/evaluation/upload?evaluationId=${encodeURIComponent(String(evalId))}`);
        }}
        onOpenDoc={(ev, doc, fileName) => {
          const evalId = ev?.evaluation_id;
          if (!evalId) return;
          openEvaluationDoc({ evaluationId: evalId, doc, fileName, employeeCode: ev?.employeeCode });
        }}
      />

      <ScheduleModal
        open={scheduleOpen}
        mode={scheduleMode}
        employees={employees}
        initial={scheduleInitial}
        onClose={() => setScheduleOpen(false)}
        onSaved={fetchInit}
        onNotify={notify}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={closeConfirm}
        onCancel={closeConfirm}
      />

      <PreviewModal
        open={previewState.open}
        title={previewState.title}
        fileName={previewState.fileName}
        url={previewState.url}
        mimeType={previewState.mimeType}
        downloadUrl={previewState.downloadUrl}
        loading={previewState.loading}
        onClose={closePreview}
      />
    </div>
  );
}
