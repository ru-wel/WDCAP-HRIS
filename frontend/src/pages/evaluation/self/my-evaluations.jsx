import React, { useEffect, useMemo, useState } from 'react';
import ViewARISEFormModal from '../../../components/ViewARISEFormModal.jsx';
import { get } from '../../../services/api.js';
import { compareDate } from '../../../utils/sort.js';

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4" role="dialog" aria-modal="true" aria-label={title || 'Preview'}>
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
            <div className="text-sm text-gray-700">Preview isn't available for this file type. Use Open/Download.</div>
          )}

          <div className="mt-5 flex items-center justify-end gap-3">
            {!loading && effectiveDownloadUrl ? (
              <>
                <a href={effectiveDownloadUrl} target="_blank" rel="noopener noreferrer" className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition">
                  Open
                </a>
                <button type="button" onClick={handleDownload} className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition">
                  Download
                </button>
              </>
            ) : null}
            <button type="button" onClick={onClose} className="px-5 py-2 rounded-full text-sm text-white bg-[#990100] hover:bg-[#ad3332] transition">
              OK
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function MyEvaluations() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [employee, setEmployee] = useState(null);
  const [evaluations, setEvaluations] = useState([]);

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

  const [ariseFormModalOpen, setAriseFormModalOpen] = useState(false);
  const [ariseFormData, setAriseFormData] = useState(null);
  const [ariseFormMeta, setAriseFormMeta] = useState({ employeeName: '', evaluationType: '', evaluationDate: '' });

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
          setError(json?.message || 'Preview link is not available.');
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
      console.error('Download failed:', e);
      setError(e?.message || 'Failed to open document');

      setPreviewState((p) => ({
        ...p,
        loading: false,
      }));
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError('');

        // fetch employee info
        const meRes = await get('/employees/me');
        const me = meRes?.data;
        if (me) {
          setEmployee({
            id: me?.id,
            employeeCode: me?.employee_id,
            name: `${me?.first_name || ''} ${me?.last_name || ''}`.trim(),
            position: me?.positions?.position_title || 'N/A',
            hireDate: formatShortDate(me?.hire_date),
            type: me?.personnel_type || 'N/A',
          });

          // Fetch evaluations
          const evalsRes = await get(`/evaluations/employee/${encodeURIComponent(String(me.id))}`);
          setEvaluations(Array.isArray(evalsRes?.data) ? evalsRes.data : []);
        }
      } catch (e) {
        console.error('Failed to load evaluations:', e);
        setError(e?.message || 'Failed to load evaluation data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading My Evaluations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-7 lg:mx-[4.5rem] md:mx-10">
      <div className="flex flex-col lg:flex-row justify-between gap-4 mb-4">
        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">My Evaluations</h1>
      </div>

      <hr className="text-[#990100] mt-6" />

      {error ? (
        <div className="mt-6 bg-red-100 text-red-700 px-4 py-3 rounded">{error}</div>
      ) : (
        <>
          {/* Evaluations Table */}
          <div className="mt-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Evaluation History</h2>
            <div className="div-table overflow-x-auto -mx-4 sm:mx-0">
              <table className="table-style">
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
                      const formData = docs?.form_data || null;
                      const hasARISEForm = Boolean(formData);
                      const breakdownLabel = breakdown?.fileName || legacyFile?.fileName || 'Breakdown';
                      const finalLabel = finalDoc?.fileName || 'Final';
                      const formLabel = formDoc?.fileName || 'Evaluation Form';

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
                              {hasARISEForm ? (
                                <button type="button" className="bg-[#990100] text-white px-4 py-1 rounded-md text-xs hover:bg-[#ad3332] transition"
                                  onClick={() => {
                                    setAriseFormData(formData);
                                    setAriseFormMeta({
                                      employeeName: employee?.name || 'Employee',
                                      evaluationType: ev?.evaluation_type || 'Evaluation',
                                      evaluationDate: ev?.evaluation_date || '',
                                    });
                                    setAriseFormModalOpen(true);
                                  }}
                                >
                                  View Form
                                </button>
                              ) : formDoc ? (
                                <button type="button" className="bg-[#990100] text-white px-4 py-1 rounded-md text-xs hover:bg-[#ad3332] transition"
                                  onClick={() =>
                                    openEvaluationDoc({
                                      evaluationId: ev?.evaluation_id,
                                      doc: 'form',
                                      fileName: formLabel,
                                      employeeCode: employee?.employeeCode,
                                    })
                                  }
                                >
                                  {formLabel}
                                </button>
                              ) : breakdown || legacyFile ? (
                                <button type="button" className="bg-white border border-gray-300 rounded-md px-3 py-1 text-xs hover:bg-gray-50"
                                  onClick={() =>
                                    openEvaluationDoc({
                                      evaluationId: ev?.evaluation_id,
                                      doc: breakdown ? 'breakdown' : 'file',
                                      fileName: breakdownLabel,
                                      employeeCode: employee?.employeeCode,
                                    })
                                  }
                                >
                                  {breakdownLabel}
                                </button>
                              ) : isSubmitted ? (
                                <span className="text-gray-500 text-xs">Submitted</span>
                              ) : (
                                <span className="text-gray-500 text-xs">Pending</span>
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

            {/* Last Updated */}
            <div className="mt-4 text-xs text-gray-700">
              <span className="font-semibold">Last Updated:</span> {lastUpdated || '—'}
            </div>
          </div>
        </>
      )}

      {/* Modals */}
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

      <ViewARISEFormModal
        open={ariseFormModalOpen}
        onClose={() => {
          setAriseFormModalOpen(false);
          setAriseFormData(null);
          setAriseFormMeta({ employeeName: '', evaluationType: '', evaluationDate: '' });
        }}
        formData={ariseFormData}
        employeeName={ariseFormMeta.employeeName}
        evaluationType={ariseFormMeta.evaluationType}
        evaluationDate={ariseFormMeta.evaluationDate}
      />
    </div>
  );
}
