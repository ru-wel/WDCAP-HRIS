import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import DropDownFilter from '../../components/dropdownfilter.jsx';
import ConfirmModal from '../../components/confirm-modal.jsx';
import ReportModal from '../../components/report-modal.jsx';
import ReactPaginate from 'react-paginate';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/config.js';
import { get, post } from '../../services/api.js';
import { compareDate, compareText } from '../../utils/sort.js';
import { filterRowsByDateRange } from '../../utils/reporting.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import { exportRowsToCsv } from '../../utils/csv.js';

const formatShortDate = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
};

const formatUpdated = (value) => {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  const date = d.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: '2-digit' });
  const time = d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return `${date} | ${time}`;
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

  // legacy string path/id
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
                  className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition"
                >
                  Download
                </button>
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
}

function EvaluationDetailsModal({ open, onClose, employee, evaluations, loading, onOpenDoc, onUpdateEvaluation, canUpdate }) {
  const employeeName = employee?.name || 'Employee';
  const position = employee?.position || 'N/A';
  const personnelType = employee?.type || 'N/A';
  const hireDate = employee?.hireDate || '';

  const sortedEvals = useMemo(() => {
    const list = Array.isArray(evaluations) ? evaluations : [];
    return [...list].sort((a, b) => compareDate(b?.evaluation_date, a?.evaluation_date));
  }, [evaluations]);

  const lastUpdated = useMemo(() => {
    const all = Array.isArray(evaluations) ? evaluations : [];
    const latest = all
      .map((e) => e?.updated_at || e?.created_at)
      .filter(Boolean)
      .map((v) => new Date(v))
      .filter((d) => !Number.isNaN(d.getTime()))
      .sort((a, b) => b.getTime() - a.getTime())[0];

    return latest ? formatUpdated(latest.toISOString()) : '';
  }, [evaluations]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-5xl rounded-xl bg-white shadow-xl border border-gray-200 overflow-hidden max-h-[90vh] flex flex-col">
        <div className="px-5 py-3 bg-[#990100] flex items-center justify-between flex-shrink-0">
          <h2 className="text-white text-base font-semibold">Evaluation History of {employee?.employeeCode || employeeName}</h2>
          <button type="button" onClick={onClose} className="text-white text-2xl font-bold leading-none">×</button>
        </div>

        <div className="px-6 py-5 overflow-auto flex-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex gap-2"><span className="font-semibold">Employee Name:</span><span>{employeeName}</span></div>
            <div className="flex gap-2"><span className="font-semibold">Position:</span><span>{position}</span></div>
            <div className="flex gap-2"><span className="font-semibold">Personnel Type:</span><span>{personnelType}</span></div>
            <div className="flex gap-2"><span className="font-semibold">Hire Date:</span><span>{hireDate}</span></div>
          </div>

          <hr className="mt-4 border-[#990100]/40" />

          <div className="mt-4">
            {loading ? (
              <div className="text-sm text-gray-600">Loading evaluations…</div>
            ) : (
              <div className="div-table mt-0">
                <table className="table-style" style={{ minWidth: 'min(900px, 100%)' }}>
                  <thead className="thead-style">
                    <tr>
                      <th className="th-style rounded-tl-lg rounded-bl-lg">Evaluation Type</th>
                      <th className="th-style">Date</th>
                      <th className="th-style">Score/Remarks</th>
                      <th className="th-style">Breakdown</th>
                      <th className="th-style">Final</th>
                      <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="tbody-style">
                    {sortedEvals.length === 0 ? (
                      <tr className="tr-style">
                        <td className="td-style" colSpan={6}>
                          <span className="text-sm text-gray-600">No evaluation records found.</span>
                        </td>
                      </tr>
                    ) : (
                      sortedEvals.map((ev) => {
                        const docs = normalizeEvaluationDocs(ev);
                        const breakdown = docs?.breakdown || null;
                        const finalDoc = docs?.final || null;
                        const legacyFile = docs?.file || null;
                        const breakdownLabel = breakdown?.fileName || legacyFile?.fileName || 'Breakdown';
                        const finalLabel = finalDoc?.fileName || 'Final';

                        return (
                          <tr key={ev?.evaluation_id} className="tr-style">
                            <td className="td-style font-medium">{ev?.evaluation_type || '—'}</td>
                            <td className="td-style">{formatShortDate(ev?.evaluation_date) || '—'}</td>
                            <td className="td-style whitespace-pre-wrap">{ev?.evaluation_notes || '—'}</td>
                            <td className="td-style">
                              {breakdown || legacyFile ? (
                                <button
                                  type="button"
                                  className="bg-white border border-gray-300 rounded-md px-3 py-1 text-xs hover:bg-gray-50"
                                  onClick={() => onOpenDoc(ev?.evaluation_id, breakdown ? 'breakdown' : 'file', breakdownLabel)}
                                >
                                  {breakdownLabel}
                                </button>
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </td>
                            <td className="td-style">
                              {finalDoc ? (
                                <button
                                  type="button"
                                  className="bg-white border border-gray-300 rounded-md px-3 py-1 text-xs hover:bg-gray-50"
                                  onClick={() => onOpenDoc(ev?.evaluation_id, 'final', finalLabel)}
                                >
                                  {finalLabel}
                                </button>
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </td>
                            <td className="td-style">
                              {canUpdate ? (
                                <button
                                  type="button"
                                  className="bg-green-600 text-white px-3 py-1 rounded-md text-xs hover:bg-green-700 transition"
                                  onClick={() => onUpdateEvaluation(ev)}
                                >
                                  Upload/Update
                                </button>
                              ) : (
                                <span className="text-gray-500 text-xs">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between">
              <div className="text-xs text-gray-700">
                <span className="font-semibold">Last Updated:</span> {lastUpdated || '—'}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="bg-[#990100] text-white px-4 py-2 rounded-md text-sm hover:bg-[#ad3332] transition disabled:opacity-60"
                  disabled={loading || sortedEvals.length === 0}
                  onClick={() => employee && sortedEvals.length ? employee?.onGenerateReport?.() : null}
                >
                  Generate Report
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function EvaluationHistory() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const role = user?.role;
  const isEmployee = role === ROLES.EMPLOYEE;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('employee_id_asc');

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsEmployee, setDetailsEmployee] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [detailsEvals, setDetailsEvals] = useState([]);

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

  const [reportOpen, setReportOpen] = useState(false);
  const [reportMode, setReportMode] = useState('evaluations');

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: 'Info',
    message: '',
    confirmText: 'OK',
    cancelText: null,
    onConfirm: null,
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

  const fetchEmployees = async () => {
    try {
      setLoading(true);
      setError('');

      if (isEmployee) {
        const meRes = await get('/employees/me');
        const me = meRes?.data;
        const formatted = me
          ? [
              {
                id: me?.id,
                employeeCode: me?.employee_id,
                name: `${me?.first_name || ''} ${me?.last_name || ''}`.trim(),
                position: me?.positions?.position_title || 'N/A',
                hireDate: formatShortDate(me?.hire_date),
                hireDateRaw: me?.hire_date || '',
                type: me?.personnel_type || 'N/A',
              },
            ]
          : [];
        setRows(formatted);
        return;
      }

      const res = await get('/employees');
      const list = Array.isArray(res?.data) ? res.data : [];
      const formatted = list.map((e) => ({
        id: e?.id,
        employeeCode: e?.employee_id,
        name: `${e?.first_name || ''} ${e?.last_name || ''}`.trim(),
        position: e?.positions?.position_title || 'N/A',
        hireDate: formatShortDate(e?.hire_date),
        hireDateRaw: e?.hire_date || '',
        type: e?.personnel_type || 'N/A',
      }));
      setRows(formatted);
    } catch (e) {
      console.error('Failed to load evaluation employees:', e);
      setError(e?.message || 'Failed to load evaluation history');
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee]);

  useEffect(() => {
    const targetId = searchParams.get('employeeId');
    if (!targetId) return;

    const match = rows.find((r) => String(r?.id) === String(targetId));
    if (!match) return;

    // Best-effort auto-open details when coming from /evaluation cards.
    openDetails(match);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, rows]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const id = String(r.employeeCode || '').toLowerCase();
      const name = String(r.name || '').toLowerCase();
      const position = String(r.position || '').toLowerCase();
      const type = String(r.type || '').toLowerCase();
      return id.includes(q) || name.includes(q) || position.includes(q) || type.includes(q);
    });
  }, [rows, searchTerm]);

  const visible = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => {
      switch (sortOrder) {
        case 'employee_id_desc':
          return compareText(b.employeeCode, a.employeeCode);
        case 'name_az':
          return compareText(a.name, b.name);
        case 'name_za':
          return compareText(b.name, a.name);
        case 'position_az':
          return compareText(a.position, b.position);
        case 'position_za':
          return compareText(b.position, a.position);
        case 'hire_newest':
          return compareDate(b.hireDateRaw, a.hireDateRaw);
        case 'hire_oldest':
          return compareDate(a.hireDateRaw, b.hireDateRaw);
        case 'employee_id_asc':
        default:
          return compareText(a.employeeCode, b.employeeCode);
      }
    });

    return sorted;
  }, [filtered, sortOrder]);

  // Pagination
  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentRows = visible.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visible.length / itemsPerPage);

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, rows.length]);

  const handlePageClick = (event) => {
    setItemOffset(event.selected * itemsPerPage);
  };

  const openDetails = async (employee) => {
    setDetailsEmployee(employee);
    setDetailsOpen(true);
    setDetailsEvals([]);

    try {
      setDetailsLoading(true);
      const res = await get(`/evaluations/employee/${encodeURIComponent(String(employee.id))}`);
      setDetailsEvals(Array.isArray(res?.data) ? res.data : []);
    } catch (e) {
      console.error('Failed to load evaluation documents:', e);
      openInfo({ title: 'Error', message: e?.message || 'Failed to load evaluations' });
      setDetailsEvals([]);
    } finally {
      setDetailsLoading(false);
    }
  };

  const closeDetails = () => {
    setDetailsOpen(false);
    setDetailsEmployee(null);
    setDetailsEvals([]);
  };

  const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
    const stamp = new Date().toISOString().slice(0, 10);
    const isCsv = fileType === 'CSV';

    if (reportMode === 'employees') {
      const employeesRows = Array.isArray(visible) ? visible : [];
      const rowsForExport = (startDate || endDate)
        ? filterRowsByDateRange(employeesRows, (r) => r?.created_at || r?.updated_at, startDate, endDate)
        : employeesRows;

      const filename = `evaluation-employees-${stamp}.${isCsv ? 'csv' : 'xlsx'}`;

      post('/audit-logs/reports', {
        report_name: 'Evaluation Employees Table',
        filename,
        start_date: startDate || null,
        end_date: endDate || null,
        row_count: rowsForExport.length,
        source: 'employees',
      }).catch(() => {
        // best-effort only
      });

      const columns = [
        { header: 'Employee ID', value: (r) => r?.employeeCode || '' },
        { header: 'Name', value: (r) => r?.name || '' },
        { header: 'Position', value: (r) => r?.position || '' },
        { header: 'Hire Date', value: (r) => r?.hireDate || '' },
        { header: 'Personnel Type', value: (r) => r?.type || '' },
      ];

      if (isCsv) {
        exportRowsToCsv({ filename, columns, rows: rowsForExport });
      } else {
        exportRowsToXlsx({ filename, sheetName: 'Employees', columns, rows: rowsForExport });
      }

      setReportOpen(false);
      return;
    }

    // evaluations (details modal)
    const employee = detailsEmployee;
    const evaluations = Array.isArray(detailsEvals) ? detailsEvals : [];
    const rowsForExport = (startDate || endDate)
      ? filterRowsByDateRange(evaluations, (r) => r?.evaluation_date, startDate, endDate)
      : evaluations;

    const empCode = String(employee?.employeeCode || employee?.id || 'employee').replace(/\s+/g, '-');
    const filename = `evaluation-history-${empCode}-${stamp}.${isCsv ? 'csv' : 'xlsx'}`;

    post('/audit-logs/reports', {
      report_name: 'Evaluation History Report',
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: 'performance_evaluations',
    }).catch(() => {
      // best-effort only
    });

    const columns = [
      { header: 'Employee ID', value: () => employee?.employeeCode || '' },
      { header: 'Employee Name', value: () => employee?.name || '' },
      { header: 'Evaluation Type', value: (r) => r?.evaluation_type || '' },
      { header: 'Evaluation Date', value: (r) => formatShortDate(r?.evaluation_date) },
      { header: 'Notes', value: (r) => r?.evaluation_notes || '' },
    ];

    if (isCsv) {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    } else {
      exportRowsToXlsx({ filename, sheetName: 'Evaluation History', columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };

  const handleTopGenerateReportClick = () => {
    setReportMode('employees');
    setReportOpen(true);
  };

  const openEvaluationDoc = async ({ evaluationId, doc, fileName }) => {
    try {
      const safeFileName = String(fileName || '').trim();
      const title = safeFileName ? `Preview: ${safeFileName}` : 'Preview';

      setPreviewState({
        open: true,
        title,
        fileName: safeFileName,
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
        headers: token ? { Authorization: `Bearer ${token}` } : {}
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
          openInfo({ title: 'Error', message: json?.message || 'Download link is not available.' });
          return;
        }

        const looksLikeInlineStream = String(previewUrl).includes('/document/download');
        if (provider === 'google_drive' || looksLikeInlineStream) {
          const dlRes = await fetch(previewUrl, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
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
            fileName: safeFileName,
            url: objectUrl,
            mimeType: String(blob?.type || '') || guessMimeType(safeFileName),
            isObjectUrl: true,
            downloadUrl: objectUrl,
            loading: false,
          });
          return;
        }

        setPreviewState({
          open: true,
          title,
          fileName: safeFileName,
          url: previewUrl,
          mimeType: guessMimeType(safeFileName || previewUrl),
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
        fileName: safeFileName,
        url: objectUrl,
        mimeType: String(blob?.type || '') || guessMimeType(safeFileName),
        isObjectUrl: true,
        downloadUrl: objectUrl,
        loading: false,
      });
    } catch (e) {
      console.error('Download failed:', e);
      openInfo({ title: 'Error', message: e?.message || 'Failed to open document' });

      setPreviewState((p) => ({
        ...p,
        loading: false,
      }));
    }
  };

  return (
    <div className="p-7 lg:mx-18 md:mx-10">
      <div className="flex justify-between items-center w-full">
        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">Evaluation History</h1>

        <div className="flex items-center gap-3">
          <button
            type="button"
            className="generate-report-button"
            onClick={handleTopGenerateReportClick}
          >
            Generate Report
          </button>

          <DropDownFilter
            value={sortOrder}
            onChange={setSortOrder}
            options={[
              { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
              { value: 'employee_id_desc', label: 'Employee ID: Descending' },
              { value: 'name_az', label: 'Name: A - Z' },
              { value: 'name_za', label: 'Name: Z - A' },
              { value: 'position_az', label: 'Position: A - Z' },
              { value: 'position_za', label: 'Position: Z - A' },
              { value: 'hire_newest', label: 'Hire Date: Newest' },
              { value: 'hire_oldest', label: 'Hire Date: Oldest' },
            ]}
          />

          <div className="relative text-gray-600 border border-[#990100] rounded-lg">
            <input
              type="search"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-white lg:h-10 h-9 px-2 pr-10 rounded-lg text-sm focus:outline-none"
            />
            <img src="/icons/red-search.png" className="absolute right-2 top-2 w-5 h-5" alt="search" />
          </div>
        </div>
      </div>

      <hr className="text-[#990100] mt-6" />

      <div className="mt-6">
        {loading ? (
          <div className="text-sm text-gray-600">Loading…</div>
        ) : error ? (
          <div className="text-sm text-red-700">{error}</div>
        ) : (
          <div className="div-table">
            <table className="table-style">
              <thead className="thead-style">
                <tr>
                  <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                  <th className="th-style">Name</th>
                  <th className="th-style">Position</th>
                  <th className="th-style">Hire Date</th>
                  <th className="th-style">Personnel Type</th>
                  <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                </tr>
              </thead>
              <tbody className="tbody-style">
                {visible.length === 0 ? (
                  <tr className="tr-style">
                    <td className="td-style" colSpan={6}>
                      <span className="text-sm text-gray-600">No records found.</span>
                    </td>
                  </tr>
                ) : (
                  currentRows.map((r) => (
                    <tr key={r.id} className="tr-style">
                      <td className="td-style">{r.employeeCode || '—'}</td>
                      <td className="td-style">{r.name || '—'}</td>
                      <td className="td-style">{r.position || 'N/A'}</td>
                      <td className="td-style">{r.hireDate || '—'}</td>
                      <td className="td-style">{r.type || '—'}</td>
                      <td className="td-style">
                        <button
                          type="button"
                          className="bg-[#ad3332] text-white px-3 py-1 rounded-md text-xs hover:bg-[#990100] transition"
                          onClick={() => openDetails(r)}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="flex justify-end mt-6 text-[#990100]">
        {pageCount > 1 && (
          <ReactPaginate
            previousLabel="<"
            nextLabel=">"
            pageCount={pageCount}
            forcePage={Math.floor(itemOffset / itemsPerPage)}
            onPageChange={handlePageClick}
            containerClassName="flex gap-3"
            activeClassName="underline font-bold"
          />
        )}
      </div>

      <EvaluationDetailsModal
        open={detailsOpen}
        onClose={closeDetails}
        employee={detailsEmployee ? { ...detailsEmployee, onGenerateReport: () => { setReportMode('evaluations'); setReportOpen(true); } } : null}
        evaluations={detailsEvals}
        loading={detailsLoading}
        onOpenDoc={(evaluationId, doc, fileName) => openEvaluationDoc({ evaluationId, doc, fileName })}
        canUpdate={!isEmployee}
        onUpdateEvaluation={(ev) => {
          if (!ev?.evaluation_id) return;
          navigate(`/evaluation/upload?evaluationId=${encodeURIComponent(String(ev.evaluation_id))}`);
          closeDetails();
        }}
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

      <ReportModal
        open={reportOpen}
        title="Generate Report - Evaluation History"
        onClose={() => setReportOpen(false)}
        onGenerate={handleGenerateReport}
        enableDateRange={true}
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
    </div>
  );
}
