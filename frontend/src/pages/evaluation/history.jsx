import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import ConfirmModal from '../../components/confirm-modal.jsx';
import RegularizationModal from '../../components/RegularizationModal.jsx';
import ViewDynamicFormModal from '../../components/ViewDynamicFormModal.jsx';
import ReportModal from '../../components/report-modal.jsx';
import ReactPaginate from 'react-paginate';
import { useAuth } from '../../context/AuthContext.jsx';
import { ROLES } from '../../constants/config.js';
import { get, post } from '../../services/api.js';
import { compareDate, compareText } from '../../utils/sort.js';
import { filterRowsByDateRange } from '../../utils/reporting.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportReportToPdf } from '../../utils/pdf.js';

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
      <div className="w-full max-w-4xl rounded-lg bg-white shadow-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 bg-[#990100] m-4 rounded-lg flex items-center justify-between gap-3">
          <h2 className="text-white text-sm font-semibold tracking-wide truncate">{title || 'Preview'}</h2>
          <button type="button" onClick={onClose} className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer">
            ✕
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
                  className="mustard-button px-4 py-2 rounded-lg text-sm"
                >
                  Open
                </a>
                <button
                  type="button"
                  onClick={handleDownload}
                  className="green-button px-4 py-2 rounded-lg text-sm"
                >
                  Download
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 rounded-lg text-sm text-white bg-[#990100] hover:bg-[#ad3332] transition"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function EvaluationDetailsModal({ open, onClose, employee, evaluations, loading, onOpenDoc, onUpdateEvaluation, canUpdate, onRegularize, onViewARISEForm }) {
  const formatNotesForCell = (raw) => {
    const text = String(raw || '').replace(/\r\n/g, '\n');
    if (!text.trim()) return '—';

    const pick = (re) => {
      const m = text.match(re);
      return m && m[1] ? String(m[1]).trim() : '';
    };

    const score = pick(/^\s*Score\s*:\s*(.+)\s*$/im) || pick(/^\s*Total\s*Score\s*:\s*(.+)\s*$/im);
    const remarks = pick(/^\s*Remarks\s*:\s*(.+)\s*$/im) || pick(/^\s*Comments\s*:\s*(.+)\s*$/im);

    if (score || remarks) {
      return [score ? `Score: ${score}` : null, remarks ? `Remarks: ${remarks}` : null].filter(Boolean).join('\n');
    }

    return text.trim();
  };

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

  // check if employee should show regularization prompt
  const shouldShowRegularization = useMemo(() => {
    if (!employee || !canUpdate) return false;

    const personnelTypeLower = String(personnelType || '').toLowerCase();
    const isProbationary = personnelTypeLower === 'probationary';
    const isProjectBased = personnelTypeLower === 'project-based' || personnelTypeLower === 'project based';

    if (!isProbationary && !isProjectBased) return false;

    // check if there's at least one completed evaluation matching their personnel type
    const hasCompletedEval = sortedEvals.some((ev) => {
      const evalType = String(ev?.evaluation_type || '').toLowerCase();
      const isCompleted = ev?.evaluation_notes || ev?.evaluation_document_path;

      if (isProbationary) {
        return evalType.includes('probationary') && isCompleted;
      } else if (isProjectBased) {
        return evalType.includes('project') && isCompleted;
      }
      return false;
    });

    return hasCompletedEval;
  }, [employee, canUpdate, personnelType, sortedEvals]);

  if (!open) return null;

  

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-5xl rounded-lg bg-white shadow-xl border border-gray-200 max-h-[90vh] flex flex-col">
        <div className="p-4 sm:p-6 flex flex-col flex-1 min-h-0">
          <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 flex-shrink-0">
            <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
              Evaluation History of {employee?.employeeCode || employeeName}
            </h1>

            <button
              type="button"
              onClick={onClose}
              className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="pt-6 overflow-auto flex-1 min-h-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 px-4 text-sm">
              <div className="flex gap-2"><span className="font-semibold text-[#483D3D] uppercase ">Employee Name:</span><span>{employeeName}</span></div>
              <div className="flex gap-2"><span className="font-semibold text-[#483D3D] uppercase">Position:</span><span>{position}</span></div>
              <div className="flex gap-2"><span className="font-semibold text-[#483D3D] uppercase">Personnel Type:</span><span>{personnelType}</span></div>
              <div className="flex gap-2"><span className="font-semibold text-[#483D3D] uppercase">Hire Date:</span><span>{hireDate}</span></div>
            </div>

            {shouldShowRegularization && (
              <div className="mt-4 mx-4 p-3 bg-yellow-50 border border-yellow-300 rounded-md">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-800 mb-1">
                      Regularization Pending
                    </p>
                    <p className="text-xs text-gray-700">
                      This employee has completed their {personnelType.toLowerCase()} evaluation but has not been converted to Regular yet.
                    </p>
                  </div>
                  <button type="button" className="flex-shrink-0 bg-[#990100] text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-[#ad3332] transition" onClick={() => onRegularize?.(employee)}>
                    Regularize
                  </button>
                </div>
              </div>
            )}

            <hr className="mt-4 border-[#990100]/40" />

            <div className="mt-4">
              {loading ? (
                <div className="text-sm text-gray-600">Loading evaluations…</div>
              ) : (
                <div className="div-table overflow-x-auto -mx-4 sm:mx-0 mt-0">
                  <table className="table-style" >
                    <thead className="thead-style">
                      <tr>
                        <th className="th-style rounded-tl-lg rounded-bl-lg">Evaluation Type</th>
                        <th className="th-style">Date</th>
                        <th className="th-style">Score/Remarks</th>
                        <th className="th-style rounded-tr-lg rounded-br-lg">Documents</th>
                      </tr>
                    </thead>
                    <tbody className="tbody-style">
                      {sortedEvals.length === 0 ? (
                        <tr className="tr-style">
                          <td className="td-style" colSpan={4}>
                            <span className="text-sm text-gray-600">No evaluation records found.</span>
                          </td>
                        </tr>
                      ) : (
                        sortedEvals.map((ev) => {
                          const docs = normalizeEvaluationDocs(ev);
                          const breakdown = docs?.breakdown || null;
                          const finalDoc = docs?.final || null;
                          const legacyFile = docs?.file || null;
                          const formDoc = docs?.form || null;
                          const formData = docs?.form_data || null; // ARISE form data
                          const hasARISEForm = Boolean(formData);
                          const breakdownLabel = breakdown?.fileName || legacyFile?.fileName || 'Breakdown';
                          const finalLabel = finalDoc?.fileName || 'Final';
                          const formLabel = formDoc?.fileName || 'Evaluation Form';

                          // Check if evaluation has been submitted (has notes or any documents)
                          const hasNotes = Boolean(ev?.evaluation_notes);
                          const hasAnyDocument = Boolean(breakdown || finalDoc || legacyFile || formDoc || formData);
                          const isSubmitted = hasNotes || hasAnyDocument;

                          return (
                            <tr key={ev?.evaluation_id} className="tr-style">
                              <td className="td-style font-medium">{ev?.evaluation_type || '—'}</td>
                              <td className="td-style">{formatShortDate(ev?.evaluation_date) || '—'}</td>
                              <td className="td-style whitespace-pre-wrap">{formatNotesForCell(ev?.evaluation_notes)}</td>
                              <td className="td-style">
                                <div className="flex flex-col gap-2">
                                  {/* ARISE Form - highest priority */}
                                  {hasARISEForm ? (
                                    <button
                                      type="button"
                                      className="bg-[#990100] text-white px-4 py-1 rounded-md text-xs hover:bg-[#ad3332] transition"
                                      onClick={() => onViewARISEForm?.({
                                        formData,
                                        employeeName: employee?.name || 'Employee',
                                        evaluationType: ev?.evaluation_type || 'Evaluation',
                                        evaluationDate: ev?.evaluation_date || '',
                                      })}
                                    >
                                      View Form
                                    </button>
                                  ) : formDoc ? (
                                    /* Uploaded Form Document */
                                    <button
                                      type="button"
                                      className="bg-[#990100] text-white px-4 py-1 rounded-md text-xs hover:bg-[#ad3332] transition"
                                      onClick={() => onOpenDoc(ev?.evaluation_id, 'form', formLabel)}
                                    >
                                      {formLabel}
                                    </button>
                                  ) : breakdown || legacyFile ? (
                                    /* Breakdown Document */
                                    <button
                                      type="button"
                                      className="bg-white border border-gray-300 rounded-md px-3 py-1 text-xs hover:bg-gray-50"
                                      onClick={() => onOpenDoc(ev?.evaluation_id, breakdown ? 'breakdown' : 'file', breakdownLabel)}
                                    >
                                      {breakdownLabel}
                                    </button>
                                  ) : isSubmitted ? (
                                    /* Submitted but no documents */
                                    <span className="text-gray-500 text-xs">Submitted</span>
                                  ) : canUpdate ? (
                                    /* Pending - allow upload */
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
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="mt-4 flex items-center justify-between px-3">
                <div className="text-xs text-[#483D3D]">
                  <span className="font-semibold text-[#483D3D] uppercase">Last Updated:</span> {lastUpdated || '—'}
                </div>

                {/*<div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="bg-[#990100] text-white px-4 py-2 rounded-md text-sm hover:bg-[#ad3332] transition disabled:opacity-60"
                    disabled={loading || sortedEvals.length === 0}
                    onClick={() => employee && sortedEvals.length ? employee?.onGenerateReport?.() : null}
                  >
                    Generate Report
                  </button>
                </div>*/}
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
  const [includeInactive, setIncludeInactive] = useState(false);

  const [filterHasEval, setFilterHasEval] = useState(false);
  const [filterEvalYear, setFilterEvalYear] = useState('');

  const [filtersOpen, setFiltersOpen] = useState(false);
  const defaultSort = 'employee_id_asc';
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);
  const [draftIncludeInactive, setDraftIncludeInactive] = useState(includeInactive);
  const [draftFilterHasEval, setDraftFilterHasEval] = useState(false);
  const [draftFilterEvalYear, setDraftFilterEvalYear] = useState('');

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    if (includeInactive) n += 1;
    if (filterHasEval) n += 1;
    if (filterEvalYear) n += 1;
    return n;
  }, [sortOrder, includeInactive, filterHasEval, filterEvalYear]);

  useEffect(() => {
    if (!filtersOpen) return;
    setDraftSortOrder(sortOrder);
    setDraftIncludeInactive(includeInactive);
    setDraftFilterHasEval(filterHasEval);
    setDraftFilterEvalYear(filterEvalYear);
  }, [filtersOpen, sortOrder, includeInactive, filterHasEval, filterEvalYear]);

  useEffect(() => {
    if (!filtersOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [filtersOpen]);

  const clearFilters = () => {
    setDraftSortOrder(defaultSort);
    setDraftIncludeInactive(false);
    setDraftFilterHasEval(false);
    setDraftFilterEvalYear('');
  };

  const applyDraftFilters = () => {
    setSortOrder(draftSortOrder);
    setIncludeInactive(draftIncludeInactive);
    setFilterHasEval(draftFilterHasEval);
    setFilterEvalYear(draftFilterEvalYear);
    setFiltersOpen(false);
  };

  const sortOptions = useMemo(
    () => [
      { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
      { value: 'employee_id_desc', label: 'Employee ID: Descending' },
      { value: 'name_az', label: 'Name: A - Z' },
      { value: 'name_za', label: 'Name: Z - A' },
      { value: 'position_az', label: 'Position: A - Z' },
      { value: 'position_za', label: 'Position: Z - A' },
      { value: 'hire_newest', label: 'Hire Date: Newest' },
      { value: 'hire_oldest', label: 'Hire Date: Oldest' },
    ],
    []
  );

  const ChipButton = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        'px-3 py-1.5 rounded-full text-xs font-semibold border transition',
        active
          ? 'bg-[#990100] text-white border-[#990100]'
          : 'bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10',
      ].join(' ')}
    >
      {children}
    </button>
  );

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
  const [reportLoading, setReportLoading] = useState(false);
  const [reportMode, setReportMode] = useState('evaluations');

  const [regularizationModalOpen, setRegularizationModalOpen] = useState(false);
  const [employeeForRegularization, setEmployeeForRegularization] = useState(null);

  const [formViewModalOpen, setFormViewModalOpen] = useState(false);
  const [formViewData, setFormViewData] = useState(null);
  const [formViewTemplate, setFormViewTemplate] = useState(null);
  const [formViewMeta, setFormViewMeta] = useState({ employeeName: '', evaluationType: '', evaluationDate: '' });

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
                name: [me?.first_name, me?.middle_name, me?.last_name].filter(Boolean).join(' '),
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

      const endpoint = `/evaluations/summary${includeInactive ? '?include_inactive=true' : ''}`;
      const res = await get(endpoint);
      const list = Array.isArray(res?.data) ? res.data : [];
      const formatted = list.map((e) => ({
        id: e?.id,
        employeeCode: e?.employee_code,
        name: e?.name || 'N/A',
        position: e?.position || 'N/A',
        hireDate: formatShortDate(e?.hire_date),
        hireDateRaw: e?.hire_date || '',
        type: e?.personnel_type || 'N/A',
        employmentStatus: e?.employment_status || 'N/A',
        latestEvalScore: e?.latest_eval_score || null,
        latestEvalType: e?.latest_eval_type || null,
        latestEvalDate: e?.latest_eval_date || null,
        nextEvalDate: e?.next_eval_date || null,
        nextEvalType: e?.next_eval_type || null,
        evalYears: Array.isArray(e?.eval_years) ? e.eval_years : [],
        hasEvaluations: Boolean(e?.has_evaluations),
      }));
      setRows(formatted);
      return formatted;
    } catch (e) {
      console.error('Failed to load evaluation employees:', e);
      setError(e?.message || 'Failed to load evaluation history');
      setRows([]);
      return [];
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEmployees();
  }, [isEmployee, includeInactive]);

  useEffect(() => {
    const targetId = searchParams.get('employeeId');
    if (!targetId) return;

    const match = rows.find((r) => String(r?.id) === String(targetId));
    if (!match) return;

    openDetails(match);
  }, [searchParams, rows]);

  const availableYears = useMemo(() => {
    const years = new Set();
    rows.forEach((r) => (r.evalYears || []).forEach((y) => years.add(y)));
    return [...years].sort((a, b) => b - a);
  }, [rows]);

  const filtered = useMemo(() => {
    let result = rows;

    const q = searchTerm.trim().toLowerCase();
    if (q) {
      result = result.filter((r) => {
        const id = String(r.employeeCode || '').toLowerCase();
        const name = String(r.name || '').toLowerCase();
        const position = String(r.position || '').toLowerCase();
        const type = String(r.type || '').toLowerCase();
        return id.includes(q) || name.includes(q) || position.includes(q) || type.includes(q);
      });
    }

    if (filterEvalYear) {
      // year filter implies "has evaluations in that year"
      result = result.filter((r) => (r.evalYears || []).includes(Number(filterEvalYear)));
    } else if (filterHasEval) {
      result = result.filter((r) => r.hasEvaluations);
    }

    return result;
  }, [rows, searchTerm, filterHasEval, filterEvalYear]);

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

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentRows = visible.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visible.length / itemsPerPage);
  const multiPages = pageCount > 1;
  const currentPage = Math.floor(itemOffset / itemsPerPage) + 1;
  

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

  const handleRegularizeFromHistory = (employee) => {
    setEmployeeForRegularization({
      id: employee?.id,
      name: employee?.name,
      employeeCode: employee?.employeeCode,
      position: employee?.position,
      personnelType: employee?.personnelType,
    });
    setRegularizationModalOpen(true);
  };

  const handleRegularize = async ({ employeeId, regularizationDate }) => {
    try {
      const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
      const url = base.endsWith('/api')
        ? `${base}/employees/${encodeURIComponent(employeeId)}/regularize`
        : `${base}/api/employees/${encodeURIComponent(employeeId)}/regularize`;

      const token = localStorage.getItem('access_token');
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: token ? `Bearer ${token}` : '',
        },
        body: JSON.stringify({
          regularization_date: regularizationDate,
        }),
      });

      if (!response.ok) {
        let errorMessage = 'Failed to regularize employee';
        try {
          const errorData = await response.json();
          errorMessage = errorData?.message || errorMessage;
        } catch {
          // response is not JSON, use default message
        }
        throw new Error(errorMessage);
      }

      setRegularizationModalOpen(false);
      setEmployeeForRegularization(null);

      closeDetails();

      openInfo({
        title: 'Success',
        message: 'Employee regularized successfully!',
      });

      await fetchEmployees();
    } catch (error) {
      throw error; 
    }
  };


  const needsEvalNextQuarter = (employee) => {
    if (!employee?.nextEvalDate) return false;
    const next = new Date(employee.nextEvalDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const cutoff = new Date(today);
    cutoff.setDate(cutoff.getDate() + 90);
    return next >= today && next <= cutoff;
  };

  const handleGenerateReport = async ({ startDate, endDate, fileType, category } = {}) => {
    setReportLoading(true);
    try {
      const freshData = await fetchEmployees();
      const stamp = new Date().toISOString().slice(0, 10);
      const ext = fileType === 'CSV' ? 'csv' : fileType === 'PDF' ? 'pdf' : 'xlsx';

      if (reportMode === 'employees') {
        let employeesRows = Array.isArray(freshData) ? freshData : [];

        if (startDate || endDate) {
          employeesRows = filterRowsByDateRange(employeesRows, (r) => r?.hireDateRaw, startDate, endDate);
        }

        if (category === 'next_quarter') {
          employeesRows = employeesRows.filter(needsEvalNextQuarter);
        } else if (category && category !== 'all') {
          employeesRows = employeesRows.filter(
            (r) => String(r?.type || '').toLowerCase() === category.toLowerCase()
          );
        }

        const filename = `evaluation-employees-${stamp}.${ext}`;

        post('/audit-logs/reports', {
          report_name: 'Evaluation Employees Table',
          filename,
          start_date: startDate || null,
          end_date: endDate || null,
          row_count: employeesRows.length,
          source: 'employees',
        }).catch((err) => console.debug('Audit log failed:', err));

        const columns = [
          { header: 'Employee ID', value: (r) => r?.employeeCode || '' },
          { header: 'Name', value: (r) => r?.name || '' },
          { header: 'Position', value: (r) => r?.position || '' },
          { header: 'Hire Date', value: (r) => r?.hireDate || '' },
          { header: 'Personnel Type', value: (r) => r?.type || '' },
          { header: 'Employment Status', value: (r) => r?.employmentStatus || '' },
          { header: 'Last Evaluation Type', value: (r) => r?.latestEvalType || '—' },
          { header: 'Last Evaluation Date', value: (r) => r?.latestEvalDate ? formatShortDate(r.latestEvalDate) : '—' },
          ...(category === 'next_quarter' ? [
            { header: 'Next Evaluation Type', value: (r) => r?.nextEvalType || '—' },
            { header: 'Next Evaluation Due', value: (r) => r?.nextEvalDate ? formatShortDate(r.nextEvalDate) : '—' },
          ] : []),
        ];

        if (fileType === 'CSV') {
          exportRowsToCsv({ filename, columns, rows: employeesRows });
        } else if (fileType === 'PDF') {
          const categoryLabel = category === 'next_quarter'
            ? 'Needs Evaluation – Next Quarter'
            : category && category !== 'all'
              ? category.charAt(0).toUpperCase() + category.slice(1).toLowerCase()
              : 'All';
          await exportReportToPdf({
            filename,
            title: 'Evaluation Employees Report',
            summaryLines: [
              `Total Records: ${employeesRows.length}`,
              `Category: ${categoryLabel}`,
              ...(startDate && endDate ? [`Hire Date Range: ${startDate} to ${endDate}`] : []),
            ],
            columns,
            rows: employeesRows,
          });
        } else {
          await exportRowsToXlsx({ filename, sheetName: 'Employees', columns, rows: employeesRows });
        }

        setReportOpen(false);
        return;
      }

      // evaluations mode — specific employee's evaluation history
      const employee = detailsEmployee;
      const evaluations = Array.isArray(detailsEvals) ? detailsEvals : [];
      const rowsForExport = (startDate || endDate)
        ? filterRowsByDateRange(evaluations, (r) => r?.evaluation_date, startDate, endDate)
        : evaluations;

      const empCode = String(employee?.employeeCode || employee?.id || 'employee').replace(/\s+/g, '-');
      const filename = `evaluation-history-${empCode}-${stamp}.${ext}`;

      post('/audit-logs/reports', {
        report_name: 'Evaluation History Report',
        filename,
        start_date: startDate || null,
        end_date: endDate || null,
        row_count: rowsForExport.length,
        source: 'performance_evaluations',
      }).catch((err) => console.debug('Audit log failed:', err));

      const columns = [
        { header: 'Employee ID', value: () => employee?.employeeCode || '' },
        { header: 'Employee Name', value: () => employee?.name || '' },
        { header: 'Evaluation Type', value: (r) => r?.evaluation_type || '' },
        { header: 'Evaluation Date', value: (r) => formatShortDate(r?.evaluation_date) },
        { header: 'Notes', value: (r) => r?.evaluation_notes || '' },
      ];

      if (fileType === 'CSV') {
        exportRowsToCsv({ filename, columns, rows: rowsForExport });
      } else if (fileType === 'PDF') {
        await exportReportToPdf({
          filename,
          title: `Evaluation History — ${employee?.name || empCode}`,
          summaryLines: [
            `Employee ID: ${employee?.employeeCode || '—'}`,
            `Total Records: ${rowsForExport.length}`,
            ...(startDate && endDate ? [`Date Range: ${startDate} to ${endDate}`] : []),
          ],
          columns,
          rows: rowsForExport,
        });
      } else {
        await exportRowsToXlsx({ filename, sheetName: 'Evaluation History', columns, rows: rowsForExport });
      }

      setReportOpen(false);
    } catch (err) {
      console.error('Report generation failed:', err);
    } finally {
      setReportLoading(false);
    }
  };

  const handleTopGenerateReportClick = () => {
    setReportMode('employees');
    setReportOpen(true);
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
      console.error('Download failed:', e);
      openInfo({ title: 'Error', message: e?.message || 'Failed to open document' });

      setPreviewState((p) => ({
        ...p,
        loading: false,
      }));
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Evaluation History...</p>
        </div>
      </div>
    );
  }

  
  return (
    <div className="p-7 lg:mx-[4.5rem] md:mx-10">
      <div className="flex flex-col lg:flex-row  justify-between gap-4 mb-4">
        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">Evaluation History</h1>

        <div className="flex items-center justify-end gap-3">
          <button type="button" className="generate-report-button" onClick={handleTopGenerateReportClick} >
            Generate Report
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              className="bg-white lg:h-10 md:h-9 h-8 px-3 rounded-lg text-sm border border-[#990100] text-[#990100] hover:bg-[#990100]/10 transition cursor-pointer inline-flex items-center gap-2"
              aria-haspopup="dialog"
              aria-expanded={filtersOpen}
            >
              <span className="font-medium">Filters</span>

                {activeFiltersCount ? (
                  <span className="ml-1 inline-flex items-center justify-center min-w-5 h-5 px-1.5 rounded-full bg-[#990100] text-white text-xs">
                    {activeFiltersCount}
                  </span>
                ) : null}

              <span className="text-xs">▾</span>
            </button>

              {filtersOpen ? (
                <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                  <div
                    className="absolute inset-0 bg-black/40"
                    onClick={() => setFiltersOpen(false)}
                  />

                  <div className="relative bg-white w-[92%] max-w-lg rounded-2xl shadow-xl border border-gray-200 overflow-hidden z-10">
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-bold text-[#990100]">Filters</p>
                      <button
                        type="button"
                        onClick={() => setFiltersOpen(false)}
                        className="text-[#990100] hover:opacity-70 text-lg leading-none"
                        aria-label="Close"
                      >
                        ×
                      </button>
                    </div>

                    <div className="px-4 py-4 max-h-[65vh] overflow-y-auto space-y-4">
                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Sort</p>
                        <div className="flex flex-wrap gap-2">
                          {sortOptions.map((opt) => (
                            <ChipButton
                              key={opt.value}
                              active={draftSortOrder === opt.value}
                              onClick={() => setDraftSortOrder(opt.value)}
                            >
                              {opt.label}
                            </ChipButton>
                          ))}
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Employment Status</p>
                        <div className="flex flex-wrap gap-2">
                          <ChipButton
                            active={!draftIncludeInactive}
                            onClick={() => setDraftIncludeInactive(false)}
                          >
                            Active Only
                          </ChipButton>
                          <ChipButton
                            active={draftIncludeInactive}
                            onClick={() => setDraftIncludeInactive(true)}
                          >
                            Include Inactive
                          </ChipButton>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-semibold text-gray-700 mb-2">Evaluations</p>
                        <div className="flex flex-wrap gap-2">
                          <ChipButton active={!draftFilterHasEval} onClick={() => { setDraftFilterHasEval(false); setDraftFilterEvalYear(''); }}>
                            All
                          </ChipButton>
                          <ChipButton active={draftFilterHasEval} onClick={() => setDraftFilterHasEval(true)}>
                            With Evaluations
                          </ChipButton>
                        </div>
                      </div>

                      {availableYears.length > 0 && (
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">Evaluation Year</p>
                          <div className="flex flex-wrap gap-2">
                            <ChipButton active={draftFilterEvalYear === ''} onClick={() => setDraftFilterEvalYear('')}>
                              All
                            </ChipButton>
                            {availableYears.map((yr) => (
                              <ChipButton key={yr} active={draftFilterEvalYear === String(yr)} onClick={() => setDraftFilterEvalYear(String(yr))}>
                                {yr}
                              </ChipButton>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-white">
                      <button
                        type="button"
                        onClick={clearFilters}
                        className="text-xs font-semibold text-[#990100] hover:underline cursor-pointer"
                      >
                        Clear all
                      </button>
                      <button
                        type="button"
                        onClick={applyDraftFilters}
                        className="bg-[#990100] text-white text-xs font-semibold px-3 py-2 rounded-lg hover:bg-[#ad3332] transition cursor-pointer"
                      >
                        Apply
                      </button>
                    </div>
                  </div>
                </div>
              ) : null}
          </div>

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
          <div className="div-table overflow-x-auto -mx-4 sm:mx-0">
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
                  currentRows.map((r) => {
                    const isInactive = r.employmentStatus === 'Inactive';
                    return (
                      <tr key={r.id} className={`tr-style ${isInactive ? 'opacity-60' : ''}`}>
                        <td className="td-style">{r.employeeCode || '—'}</td>
                        <td className="td-style">
                          <div className="flex items-center justify-center gap-2">
                            <span>{r.name || '—'}</span>
                            {isInactive && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                                Inactive
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="td-style">{r.position || 'N/A'}</td>
                        <td className="td-style">{r.hireDate || '—'}</td>
                        <td className="td-style">{r.type || '—'}</td>
                        <td className="td-style">
                          <button type="button" className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer" onClick={() => openDetails(r)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            <br />

            <div className="lg:flex items-center lg:justify-between">
              <p className="lg:text-md text-sm">
                Showing <b>{currentRows.length}</b> of <b>{visible.length}</b> log
                {visible.length !== 1 ? "s" : ""}
                {pageCount ? (
                <>
                  {" "}
                  | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                </>
              ) : null}
              </p>

              <div className="">
                {pageCount > 0 && (
                  <ReactPaginate
                    breakLabel="..."
                    nextLabel=">"
                    onPageChange={handlePageClick}
                    pageRangeDisplayed={2}
                    pageCount={pageCount}
                    forcePage={Math.floor(itemOffset / itemsPerPage)}
                    previousLabel="<"
                    renderOnZeroPageCount={null}
                    marginPagesDisplayed={2}
                    pageClassName=""
                    pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                    previousClassName={
                      multiPages
                        ? "cursor-pointer hover:text-gray-500 hover:underline"
                        : "text-gray-400 cursor-not-allowed pointer-events-none"
                    }
                    previousLinkClassName="page-link"
                    nextClassName={
                      multiPages
                        ? "cursor-pointer hover:text-gray-500 hover:underline"
                        : "text-gray-400 cursor-not-allowed pointer-events-none"
                    }
                    nextLinkClassName="page-link"
                    breakClassName="page-item"
                    breakLinkClassName="page-link"
                    containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                    activeClassName="underline font-medium"
                  />
                )}
              </div>
            </div>
          </div>
          

        )}
      </div>

      

      <EvaluationDetailsModal
        open={detailsOpen}
        onClose={closeDetails}
        employee={detailsEmployee ? { ...detailsEmployee, onGenerateReport: () => { setReportMode('evaluations'); setReportOpen(true); } } : null}
        evaluations={detailsEvals}
        loading={detailsLoading}
        onOpenDoc={(evaluationId, doc, fileName) =>
          openEvaluationDoc({ evaluationId, doc, fileName, employeeCode: detailsEmployee?.employeeCode })
        }
        canUpdate={!isEmployee}
        onUpdateEvaluation={(ev) => {
          if (!ev?.evaluation_id) return;
          navigate(`/evaluation/upload?evaluationId=${encodeURIComponent(String(ev.evaluation_id))}`);
          closeDetails();
        }}
        onRegularize={handleRegularizeFromHistory}
        onViewARISEForm={async ({ formData, employeeName, evaluationType, evaluationDate }) => {
          setFormViewData(formData);
          setFormViewMeta({ employeeName, evaluationType, evaluationDate });
          setFormViewTemplate(null);

          const tid = formData?.template_id;
          if (tid) {
            try {
              const res = await get(`/evaluation-templates/${encodeURIComponent(tid)}`);
              setFormViewTemplate(res?.data || null);
            } catch (err) {
              console.error('Failed to fetch template for viewing:', err);
            }
          }

          setFormViewModalOpen(true);
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
        title={reportMode === 'employees' ? 'Generate Report - Evaluation Employees' : 'Generate Report - Evaluation History'}
        onClose={() => setReportOpen(false)}
        onGenerate={handleGenerateReport}
        loading={reportLoading}
        enableDateRange={true}
        fileTypes={['XLSX', 'CSV', 'PDF']}
        dateRangeHint={reportMode === 'employees' ? 'filters by Hire Date' : 'filters by Evaluation Date'}
        categoryOptions={reportMode === 'employees' ? [
          { value: 'all', label: 'All Employees' },
          { value: 'regular', label: 'Regular' },
          { value: 'probationary', label: 'Probationary' },
          { value: 'project_based', label: 'Project-Based' },
          { value: 'next_quarter', label: 'Needs Evaluation – Next Quarter' },
        ] : null}
        defaultCategory="all"
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

      <RegularizationModal
        open={regularizationModalOpen}
        onClose={() => {
          setRegularizationModalOpen(false);
          setEmployeeForRegularization(null);
        }}
        employee={employeeForRegularization}
        onRegularize={handleRegularize}
        fromPersonnelType={employeeForRegularization?.personnelType || 'Probationary'}
      />

      <ViewDynamicFormModal
        open={formViewModalOpen}
        onClose={() => {
          setFormViewModalOpen(false);
          setFormViewData(null);
          setFormViewTemplate(null);
          setFormViewMeta({ employeeName: '', evaluationType: '', evaluationDate: '' });
        }}
        formData={formViewData}
        template={formViewTemplate}
        employeeName={formViewMeta.employeeName}
        evaluationType={formViewMeta.evaluationType}
        evaluationDate={formViewMeta.evaluationDate}
      />
    </div>
  );
}