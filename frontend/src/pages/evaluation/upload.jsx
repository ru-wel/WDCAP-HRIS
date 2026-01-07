import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/config.js';
import { get, postFormWithProgress } from '../../services/api.js';

const useQuery = () => {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
};

const formatShortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};

export default function EvaluationUpload() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const query = useQuery();

  const role = user?.role;
  const isEmployee = role === ROLES.EMPLOYEE;

  const preselectedEmployeeId = query.get('employeeId');
  const preselectedEvaluationId = query.get('evaluationId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [employees, setEmployees] = useState([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(preselectedEmployeeId || '');
  const [selectedEmployeeCode, setSelectedEmployeeCode] = useState('');

  const [evaluationId, setEvaluationId] = useState(preselectedEvaluationId || '');
  const [availableEvaluations, setAvailableEvaluations] = useState([]);
  const [loadingEvaluations, setLoadingEvaluations] = useState(false);

  const [evaluationType, setEvaluationType] = useState(`ANNUAL (${new Date().getFullYear()})`);
  const [score, setScore] = useState('');
  const [remarks, setRemarks] = useState('');
  const [breakdownFile, setBreakdownFile] = useState(null);
  const [finalFile, setFinalFile] = useState(null);
  const [breakdownPickerKey, setBreakdownPickerKey] = useState(0);
  const [finalPickerKey, setFinalPickerKey] = useState(0);
  const [existingDocs, setExistingDocs] = useState(null);
  const [saving, setSaving] = useState(false);

  const [breakdownProgress, setBreakdownProgress] = useState(null);
  const [finalProgress, setFinalProgress] = useState(null);

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Info',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
  });

  const [confirmBusy, setConfirmBusy] = useState(false);

  const [previewState, setPreviewState] = useState({
    open: false,
    title: 'Preview',
    fileName: '',
    url: '',
    mimeType: '',
    isObjectUrl: false,
    downloadUrl: ''
  });

  const openInfo = ({ title, message }) => {
    setConfirmState({
      open: true,
      title: title || 'Info',
      message: message || '',
      confirmText: 'OK',
      cancelText: null,
      onConfirm: null,
    });
  };

  const openConfirm = ({ title, message, confirmText = 'Confirm', cancelText = 'Cancel', onConfirm }) => {
    setConfirmState({
      open: true,
      title: title || 'Confirm',
      message: message || '',
      confirmText,
      cancelText,
      onConfirm: onConfirm || null,
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
      return { open: false, title: 'Preview', fileName: '', url: '', mimeType: '', isObjectUrl: false, downloadUrl: '' };
    });
  };

  const handleConfirm = async () => {
    const fn = confirmState.onConfirm;

    if (!fn) {
      closeConfirm();
      return;
    }

    const snapshot = {
      title: confirmState.title,
      message: confirmState.message,
      confirmText: confirmState.confirmText,
      cancelText: confirmState.cancelText,
      onConfirm: confirmState.onConfirm,
    };

    try {
      setConfirmBusy(true);
      await fn?.();

      setConfirmState((prev) => {
        const isSameDialog =
          prev.open &&
          prev.onConfirm === snapshot.onConfirm &&
          prev.title === snapshot.title &&
          prev.message === snapshot.message &&
          prev.confirmText === snapshot.confirmText &&
          prev.cancelText === snapshot.cancelText;

        if (!isSameDialog) return prev;

        const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== '';
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null };
        }

        return {
          open: true,
          title: 'Success',
          message: 'Action completed successfully.',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: null,
        };
      });
    } catch (e) {
      setConfirmState({
        open: true,
        title: 'Error',
        message: e?.message || 'Action failed.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: null,
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const fetchInit = async () => {
    try {
      setLoading(true);
      setError('');

      if (preselectedEvaluationId) {
        const evalRes = await get(`/evaluations/${encodeURIComponent(String(preselectedEvaluationId))}`);
        const ev = evalRes?.data;
        const empId = ev?.employee_id ? String(ev.employee_id) : '';
        const empName = String(ev?.employee_name || '').trim();
        const empCode = String(ev?.employee_code || '').trim();
        setEvaluationId(String(preselectedEvaluationId));
        setSelectedEmployeeId(empId);
        setSelectedEmployeeCode(empCode);
        setEvaluationType(String(ev?.evaluation_type || `ANNUAL (${new Date().getFullYear()})`));
        setExistingDocs(ev?.evaluation_document_path || null);
        // Score/remarks are stored in notes; leave blank for edits.
        setScore('');
        setRemarks('');

        setEmployees(
          empId
            ? [
                {
                  id: empId,
                  name: empName || empId,
                  employeeCode: empCode,
                },
              ]
            : []
        );
        return;
      }

      if (isEmployee) {
        const meRes = await get('/employees/me');
        const me = meRes?.data;
        const meId = me?.id ? String(me.id) : '';
        const meCode = String(me?.employee_id || '').trim();
        setSelectedEmployeeId(meId);
        setSelectedEmployeeCode(meCode);
        setEmployees(
          meId
            ? [
                {
                  id: meId,
                  name: `${me?.first_name || ''} ${me?.last_name || ''}`.trim() || meId,
                  employeeCode: meCode,
                },
              ]
            : []
        );
        return;
      }

      const res = await get('/employees');
      const list = Array.isArray(res?.data) ? res.data : [];
      const normalized = list.map((e) => ({
        id: String(e?.id || ''),
        name: `${e?.employee_id || ''} - ${(e?.first_name || '') + ' ' + (e?.last_name || '')}`.trim(),
        employeeCode: String(e?.employee_id || '').trim(),
      }));
      setEmployees(normalized);

      if (preselectedEmployeeId) {
        setSelectedEmployeeId(String(preselectedEmployeeId));
        const match = normalized.find((x) => String(x?.id) === String(preselectedEmployeeId));
        setSelectedEmployeeCode(String(match?.employeeCode || '').trim());
      } else if (normalized.length > 0) {
        setSelectedEmployeeId(String(normalized[0].id));
        setSelectedEmployeeCode(String(normalized[0]?.employeeCode || '').trim());
      }
    } catch (e) {
      console.error('Failed to init evaluation upload:', e);
      setError(e?.message || 'Failed to load upload form');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee]);

  useEffect(() => {
    const fetchEmployeeEvaluations = async () => {
      if (preselectedEvaluationId) return;

      if (!selectedEmployeeId) {
        setAvailableEvaluations([]);
        setEvaluationId('');
        return;
      }

      try {
        setLoadingEvaluations(true);
        const res = await get(`/evaluations/employee/${encodeURIComponent(String(selectedEmployeeId))}`);
        setAvailableEvaluations(Array.isArray(res?.data) ? res.data : []);
      } catch (e) {
        console.error('Failed to load employee evaluations:', e);
        setAvailableEvaluations([]);
      } finally {
        setLoadingEvaluations(false);
      }
    };

    fetchEmployeeEvaluations();
  }, [selectedEmployeeId, preselectedEvaluationId]);

  useEffect(() => {
    const run = async () => {
      if (preselectedEvaluationId) return;
      if (!evaluationId) {
        setExistingDocs(null);
        return;
      }

      try {
        const res = await get(`/evaluations/${encodeURIComponent(String(evaluationId))}`);
        const ev = res?.data;
        setExistingDocs(ev?.evaluation_document_path || null);
      } catch {
        setExistingDocs(null);
      }
    };

    run();
  }, [evaluationId, preselectedEvaluationId]);

  const resetForm = () => {
    setEvaluationType(`ANNUAL (${new Date().getFullYear()})`);
    setScore('');
    setRemarks('');
    setBreakdownFile(null);
    setFinalFile(null);
    setBreakdownPickerKey((k) => k + 1);
    setFinalPickerKey((k) => k + 1);
    setBreakdownProgress(null);
    setFinalProgress(null);
  };

  const safeJsonParse = (value) => {
    if (value === null || value === undefined) return null;
    if (typeof value === 'object') return value;
    if (typeof value !== 'string') return null;
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  };

  const currentDocs = useMemo(() => {
    const obj = safeJsonParse(existingDocs);
    if (obj && typeof obj === 'object') return obj;
    return null;
  }, [existingDocs]);

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

  const PreviewModal = ({ open, title, fileName, url, mimeType, downloadUrl, onClose, employeeCode }) => {
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
    const effectiveFileName = withEmployeePrefix(employeeCode, String(fileName || 'document'));

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
            <button
              type="button"
              onClick={onClose}
              className="text-white/90 hover:text-white text-sm font-medium"
            >
              Close
            </button>
          </div>

          <div className="px-5 py-4">
            {isPdf ? (
              <div className="border border-gray-200 rounded-md overflow-hidden bg-white">
                <iframe title="Document preview" src={url} className="w-full h-[70vh]" />
              </div>
            ) : isImg ? (
              <div className="border border-gray-200 rounded-md overflow-hidden bg-white flex items-center justify-center">
                <img src={url} alt="Preview" className="max-h-[70vh] w-full object-contain" />
              </div>
            ) : (
              <div className="text-sm text-gray-700">
                Preview isn’t available for this file type. Use Open/Download.
              </div>
            )}

            <div className="mt-5 flex items-center justify-end gap-3">
              {effectiveDownloadUrl ? (
                <>
                  <a
                    href={effectiveDownloadUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
                  >
                    Open
                  </a>
                  <a
                    href={effectiveDownloadUrl}
                    download={effectiveFileName}
                    className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
                  >
                    Download
                  </a>
                </>
              ) : null}
              <button
                type="button"
                onClick={onClose}
                className="px-5 py-2 rounded-full text-sm text-white bg-[#990100] hover:bg-[#ad3332] transition"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const openServerDoc = async (doc) => {
    if (!evaluationId) return;

    try {
      const docKey = String(doc || 'file');
      const fileName = currentDocs?.[docKey]?.fileName || '';
      const title = fileName
        ? `Preview: ${fileName}`
        : `Preview: ${docKey === 'breakdown' ? 'Breakdown of Evaluation' : docKey === 'final' ? 'Last Page of Evaluation' : 'Document'}`;

      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
      const safeId = encodeURIComponent(String(evaluationId));
      const safeDoc = encodeURIComponent(docKey);
      const url = base.endsWith('/api')
        ? `${base}/evaluations/${safeId}/document/preview?doc=${safeDoc}`
        : `${base}/api/evaluations/${safeId}/document/preview?doc=${safeDoc}`;

      const token = localStorage.getItem('access_token');
      const res = await fetch(url, {
        method: 'GET',
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });

      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const json = await res.json();
        const provider = String(json?.data?.provider || '').toLowerCase();
        const mimeType = String(json?.data?.mimeType || json?.data?.mimetype || '');
        const previewUrl =
          json?.data?.url ||
          json?.data?.signedUrl ||
          json?.data?.signedURL ||
          json?.data?.signed_url ||
          null;

        if (!previewUrl) {
          openInfo({ title: 'Error', message: 'Preview link is not available.' });
          return;
        }

        // Drive preview URLs point to our authenticated inline stream endpoint.
        // iframe/img cannot attach Authorization headers, so fetch as blob then preview via object URL.
        const looksLikeInlineStream = String(previewUrl).includes('/document/download');
        if (provider === 'google_drive' || looksLikeInlineStream) {
          const dlRes = await fetch(previewUrl, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
          });
          if (!dlRes.ok) {
            const msg = await dlRes.text();
            throw new Error(msg || 'Preview failed');
          }
          const blob = await dlRes.blob();
          const objectUrl = URL.createObjectURL(blob);
          setPreviewState({
            open: true,
            title,
            fileName: fileName || '',
            url: objectUrl,
            mimeType: String(blob?.type || '') || mimeType || guessMimeType(fileName),
            isObjectUrl: true,
            downloadUrl: objectUrl,
          });
          return;
        }

        setPreviewState({
          open: true,
          title,
          fileName: fileName || '',
          url: previewUrl,
          mimeType: mimeType || guessMimeType(fileName || previewUrl),
          isObjectUrl: false,
          downloadUrl: previewUrl,
        });
        return;
      }

      if (!res.ok) {
        const msg = await res.text();
        throw new Error(msg || 'Preview failed');
      }

      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      setPreviewState({
        open: true,
        title,
        fileName: fileName || '',
        url: objectUrl,
        mimeType: String(blob?.type || '') || guessMimeType(fileName),
        isObjectUrl: true,
        downloadUrl: objectUrl,
      });
    } catch (e) {
      openInfo({ title: 'Error', message: e?.message || 'Failed to preview document' });
    }
  };

  const useObjectUrl = (file) => {
    const [url, setUrl] = useState('');
    useEffect(() => {
      if (!file) {
        setUrl('');
        return;
      }
      const objectUrl = URL.createObjectURL(file);
      setUrl(objectUrl);
      return () => URL.revokeObjectURL(objectUrl);
    }, [file]);
    return url;
  };

  const LocalPreview = ({ file, onRemove }) => {
    const url = useObjectUrl(file);
    if (!file) return null;

    const type = String(file.type || '').toLowerCase();
    const isPdf = type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const isImg = type.startsWith('image/');

    return (
      <div className="mt-3 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
        <div className="flex items-center justify-between gap-2 px-3 py-2 bg-white border-b border-gray-200">
          <div className="text-xs text-gray-700 truncate">{file.name || 'Selected file'}</div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              type="button"
              className="text-xs font-medium text-[#990100] hover:underline"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                window.open(url, '_blank', 'noopener,noreferrer');
              }}
            >
              Preview
            </button>
            <button
              type="button"
              className="text-xs font-medium text-gray-600 hover:text-[#990100]"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onRemove?.();
              }}
            >
              Remove
            </button>
          </div>
        </div>
        {isImg ? (
          <img src={url} alt={file.name} className="w-full max-h-56 object-contain bg-white" />
        ) : isPdf ? (
          <iframe title={file.name} src={url} className="w-full h-56 bg-white" />
        ) : (
          <div className="p-3 text-xs text-gray-700">Preview not available for this file type (will download when opened).</div>
        )}
      </div>
    );
  };

  const ProgressBar = ({ value }) => {
    if (value === null || typeof value === 'undefined') return null;
    const pct = Math.max(0, Math.min(100, Number(value) || 0));
    return (
      <div className="mt-3">
        <div className="h-2 w-full rounded-full bg-gray-200 overflow-hidden">
          <div className="h-2 bg-[#990100]" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-gray-600">Uploading: {pct}%</div>
      </div>
    );
  };

  const FilePicker = ({ value, onChange, inputKey }) => {
    const file = value;
    const label = file?.name ? file.name : 'No file chosen';

    return (
      <div className="mt-3">
        <label className="input-select flex items-center justify-between gap-3 cursor-pointer">
          <span className="text-xs font-medium text-[#990100]">Choose file</span>
          <span className="text-xs text-gray-700 truncate">{label}</span>
          <input
            key={String(inputKey || 0)}
            type="file"
            accept=".pdf,.docx,.png,.jpg,.jpeg"
            className="hidden"
            onChange={(e) => onChange?.(e.target.files?.[0] || null)}
          />
        </label>
      </div>
    );
  };

  const handleSave = async () => {
    if (!evaluationId) {
      openInfo({
        title: 'Error',
        message: 'Please select a scheduled evaluation first.',
      });
      return;
    }

    if (!selectedEmployeeId) {
      openInfo({ title: 'Error', message: 'Please select an employee.' });
      return;
    }

    // Files are required (either already uploaded or newly selected)
    const hasExistingBreakdown = Boolean(currentDocs?.breakdown?.fileName);
    const hasExistingFinal = Boolean(currentDocs?.final?.fileName);
    if (!breakdownFile && !hasExistingBreakdown) {
      openInfo({ title: 'Error', message: 'Please upload the Breakdown of Evaluation file.' });
      return;
    }
    if (!finalFile && !hasExistingFinal) {
      openInfo({ title: 'Error', message: 'Please upload the Last Page of Evaluation file.' });
      return;
    }

    try {
      setSaving(true);
      const typeLabel = String(evaluationType || '').trim() || `ANNUAL (${new Date().getFullYear()})`;

      const form = new FormData();
      form.append('evaluation_type', typeLabel);

      const scoreValue = String(score || '').trim();
      const remarksValue = String(remarks || '').trim();
      if (scoreValue) form.append('score', scoreValue);
      if (remarksValue) form.append('remarks', remarksValue);

      if (breakdownFile) form.append('breakdown_file', breakdownFile);
      if (finalFile) form.append('final_file', finalFile);

      // One progress bar callback; we mirror it to both when present.
      if (breakdownFile) setBreakdownProgress(0);
      if (finalFile) setFinalProgress(0);

      await postFormWithProgress(`/evaluations/${encodeURIComponent(String(evaluationId))}/submit`, form, (pct) => {
        if (breakdownFile) setBreakdownProgress(pct);
        if (finalFile) setFinalProgress(pct);
      });

      if (breakdownFile) setBreakdownProgress(100);
      if (finalFile) setFinalProgress(100);

      setConfirmState({
        open: true,
        title: 'Success',
        message: 'Evaluation updated successfully.',
        confirmText: 'OK',
        cancelText: null,
        onConfirm: async () => {
          const employeeId = encodeURIComponent(String(selectedEmployeeId));
          navigate(`/evaluation/history?employeeId=${employeeId}&ts=${Date.now()}`);
        },
      });
      resetForm();
    } catch (e) {
      console.error('Failed to upload evaluation documents:', e);
      openInfo({ title: 'Error', message: e?.message || 'Failed to update evaluation' });
    } finally {
      setSaving(false);
    }
  };

  const handleResetClick = () => {
    if (saving) return;
    const hasFiles = Boolean(breakdownFile || finalFile);
    const hasText = Boolean(String(score || '').trim() || String(remarks || '').trim());
    if (!hasFiles && !hasText && !evaluationType) {
      resetForm();
      return;
    }

    openConfirm({
      title: 'Reset Form',
      message: 'This will clear the selected files and input fields. Continue?',
      confirmText: 'Yes, Reset',
      cancelText: 'Cancel',
      onConfirm: async () => {
        resetForm();
      },
    });
  };

  const scoreFilled = Boolean(String(score || '').trim());
  const remarksFilled = Boolean(String(remarks || '').trim());
  const breakdownFilled = Boolean(breakdownFile || currentDocs?.breakdown?.fileName);
  const finalFilled = Boolean(finalFile || currentDocs?.final?.fileName);

  return (
    <div className="p-7 lg:mx-18 md:mx-10">
      <div className="flex items-center justify-between">
        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">Evaluation - Upload Result</h1>

        <button
          type="button"
          onClick={() => navigate('/evaluation/history')}
          className="text-sm font-medium text-[#990100] hover:underline"
        >
          Back to Evaluation History
        </button>
      </div>

      <hr className="text-[#990100] mt-6" />

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : (
          <div className="bg-white border border-gray-300 rounded-lg shadow-lg p-6 max-w-4xl">
            <div className="bg-[#990100] text-white rounded-lg px-5 py-3">
              <h2 className="text-lg font-semibold">Upload Result</h2>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Name</label>
                <select
                  className="input-select"
                  value={selectedEmployeeId}
                  onChange={(e) => {
                    const nextId = e.target.value;
                    setSelectedEmployeeId(nextId);
                    const match = employees.find((x) => String(x?.id) === String(nextId));
                    setSelectedEmployeeCode(String(match?.employeeCode || '').trim());
                    if (!preselectedEvaluationId) setEvaluationId('');
                  }}
                  disabled={isEmployee}
                >
                  {employees.map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-2">
                  {preselectedEvaluationId
                    ? 'This upload is tied to a scheduled evaluation.'
                    : isEmployee
                      ? 'You can only upload evaluations for yourself.'
                      : 'Select an employee.'}
                </p>
              </div>

              <div>
                {preselectedEvaluationId ? (
                  <>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Evaluation Type</label>
                    <select
                      className="input-select"
                      value={evaluationType}
                      onChange={(e) => setEvaluationType(e.target.value)}
                    >
                      <option value={`ANNUAL (${new Date().getFullYear()})`}>{`ANNUAL (${new Date().getFullYear()})`}</option>
                      <option value="Probationary">Probationary</option>
                    </select>
                  </>
                ) : (
                  <>
                    <label className="block text-sm font-semibold text-gray-800 mb-2">Scheduled Evaluation</label>
                    <select
                      className="input-select"
                      value={evaluationId}
                      onChange={(e) => {
                        const nextId = e.target.value;
                        setEvaluationId(nextId);
                        const match = availableEvaluations.find((ev) => String(ev?.evaluation_id) === String(nextId));
                        if (match?.evaluation_type) setEvaluationType(String(match.evaluation_type));
                      }}
                      disabled={loadingEvaluations}
                    >
                      <option value="">{loadingEvaluations ? 'Loading…' : 'Select schedule'}</option>
                      {availableEvaluations.map((ev) => (
                        <option key={String(ev?.evaluation_id)} value={String(ev?.evaluation_id)}>
                          {formatShortDate(ev?.evaluation_date)} - {ev?.evaluation_type || 'Evaluation'}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-2">Choose which scheduled evaluation you’re uploading results for.</p>
                  </>
                )}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Score (optional)</label>
                <input
                  type="text"
                  className={`input-select ${scoreFilled ? 'border-[#198C19] focus:border-[#198C19]' : ''}`}
                  placeholder="e.g., 95"
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Remarks (optional)</label>
                <input
                  type="text"
                  className={`input-select ${remarksFilled ? 'border-[#198C19] focus:border-[#198C19]' : ''}`}
                  placeholder="Remarks"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                />
              </div>
            </div>

            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Breakdown of Evaluation</label>
                <div
                  className={`border rounded-lg p-5 text-center ${breakdownFilled ? 'border-[#198C19] bg-[#198C19]/5' : 'border-gray-300'}`}
                >
                  <div className="font-semibold">Upload Files</div>
                  <div className="text-xs text-gray-500 mt-1">Files Supported: PDF, DOCX, PNG, JPG</div>

                  <FilePicker value={breakdownFile} onChange={setBreakdownFile} inputKey={breakdownPickerKey} />

                  {currentDocs?.breakdown?.fileName ? (
                    <div className="mt-3 text-xs text-gray-700 flex items-center justify-center gap-2">
                      <span className="truncate max-w-[220px]">Current: {currentDocs.breakdown.fileName}</span>
                      <button
                        type="button"
                        className="text-[#990100] font-medium hover:underline"
                        disabled={saving}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openServerDoc('breakdown');
                        }}
                      >
                        Preview
                      </button>
                    </div>
                  ) : null}

                  <LocalPreview
                    file={breakdownFile}
                    onRemove={() => {
                      setBreakdownFile(null);
                      setBreakdownPickerKey((k) => k + 1);
                    }}
                  />

                  <ProgressBar value={breakdownProgress} />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-800 mb-2">Last Page of Evaluation</label>
                <div
                  className={`border rounded-lg p-5 text-center ${finalFilled ? 'border-[#198C19] bg-[#198C19]/5' : 'border-gray-300'}`}
                >
                  <div className="font-semibold">Upload Files</div>
                  <div className="text-xs text-gray-500 mt-1">Files Supported: PDF, DOCX, PNG, JPG</div>

                  <FilePicker value={finalFile} onChange={setFinalFile} inputKey={finalPickerKey} />

                  {currentDocs?.final?.fileName ? (
                    <div className="mt-3 text-xs text-gray-700 flex items-center justify-center gap-2">
                      <span className="truncate max-w-[220px]">Current: {currentDocs.final.fileName}</span>
                      <button
                        type="button"
                        className="text-[#990100] font-medium hover:underline"
                        disabled={saving}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          openServerDoc('final');
                        }}
                      >
                        Preview
                      </button>
                    </div>
                  ) : null}

                  <LocalPreview
                    file={finalFile}
                    onRemove={() => {
                      setFinalFile(null);
                      setFinalPickerKey((k) => k + 1);
                    }}
                  />

                  <ProgressBar value={finalProgress} />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-end gap-4">
              <button
                type="button"
                className="bg-[#ad3332] text-white px-6 py-2 rounded-md text-sm hover:bg-[#990100] transition"
                onClick={handleResetClick}
                disabled={saving}
              >
                Reset
              </button>
              <button
                type="button"
                className="bg-[#990100] text-white px-8 py-2 rounded-md text-sm hover:bg-[#ad3332] transition disabled:opacity-60"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        )}
      </div>

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? 'Processing…' : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={confirmBusy}
      />

      <PreviewModal
        open={previewState.open}
        title={previewState.title}
        fileName={previewState.fileName}
        url={previewState.url}
        mimeType={previewState.mimeType}
        downloadUrl={previewState.downloadUrl}
        employeeCode={selectedEmployeeCode}
        onClose={closePreview}
      />
    </div>
  );
}
