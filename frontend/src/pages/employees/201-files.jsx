import React, { useEffect, useMemo, useState } from 'react';
import Navbar from '../../components/navbar';
import DropDownFilter from '../../components/dropdownfilter';
import ReactPaginate from 'react-paginate';
import { del, get, post, postFormWithProgress } from '../../services/api.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { DOCUMENT_TYPES, ROLES } from '../../constants/config.js';
import ConfirmModal from '../../components/confirm-modal.jsx';
import { compareDate, compareText } from '../../utils/sort.js';
import { exportRowsToCsv } from '../../utils/csv.js';
import { exportRowsToXlsx } from '../../utils/excel.js';
import ReportModal from '../../components/report-modal.jsx';
import { filterRowsByDateRange } from '../../utils/reporting.js';
import { exportReportToPdf } from '../../utils/pdf.js';

const SECTION_BREAKS = new Set([DOCUMENT_TYPES.SSS, DOCUMENT_TYPES.PHILHEALTH, DOCUMENT_TYPES.PAG_IBIG]);

const isProjectBased = (personnelType) => normalizeDocName(personnelType) === normalizeDocName('Project-Based');

const isOthersItem = (itemName) => normalizeDocName(itemName) === normalizeDocName(DOCUMENT_TYPES.OTHERS);

const isVisibleChecklistItem = (item) => {
    const name = String(item?.item_name || '').trim();
    if (!name) return false;
    if (isOthersItem(name)) return false;
    // Hide common typo variant 'Sumpaang Salaysay' while keeping the correct 'Sinumpaang Salaysay'.
    if (normalizeDocName(name) === normalizeDocName('Sumpaang Salaysay')) return false;
    return true;
};

const dedupeChecklistItems = (items = []) => {
    const seen = new Set();
    const out = [];

    for (const it of items || []) {
        if (!it) continue;
        if (!isVisibleChecklistItem(it)) continue;
        const key = normalizeDocName(getDocumentNameForUpload(it.item_name));
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(it);
    }

    return out;
};

// Business rule: everything listed is required (except "Others").
const getRequiredChecklistItems = (items = []) => dedupeChecklistItems(items);

const computeRowProgress = ({ checklistItems = [] } = {}) => {
    const required = getRequiredChecklistItems(checklistItems);
    const total = required.length;
    const approved = required.filter((it) => String(it.status || '').toLowerCase() === 'approved').length;

    const missing = required
        .filter((it) => !it.document_id)
        .map((it) => String(it.item_name || '').trim())
        .filter(Boolean);

    const needsReupload = required
        .filter((it) => String(it.status || '').toLowerCase() === 'rejected')
        .map((it) => String(it.item_name || '').trim())
        .filter(Boolean);

    const uploaded = required
        .filter((it) => !!it.document_id && String(it.status || '').toLowerCase() !== 'rejected')
        .length;

    const completion = total > 0 && missing.length === 0 && needsReupload.length === 0 ? 'COMPLETE' : 'INCOMPLETE';
    return { uploaded, total, approved, missing, needsReupload, completion };
};

const normalizeDocName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

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

const allowedDocumentTypeByNormalized = new Map(
    Object.values(DOCUMENT_TYPES).map((value) => [normalizeDocName(value), value])
);

// Allow common wording variants coming from DB onboarding item names.
const ITEM_NAME_ALIASES = new Map([
    // Accept the common typo variant and map it to the canonical document type.
    [normalizeDocName('Sumpaang Salaysay'), DOCUMENT_TYPES.SINUMPAANG_SALAYSAY],
]);

const mapItemNameToDocumentName = (itemName) => {
    const normalized = normalizeDocName(itemName);
    const alias = ITEM_NAME_ALIASES.get(normalized);
    if (alias) return alias;
    return allowedDocumentTypeByNormalized.get(normalized) || DOCUMENT_TYPES.OTHERS;
};

const getDocumentNameForUpload = (itemName) => {
    const raw = String(itemName || '').trim();
    if (!raw) return '';
    const normalized = normalizeDocName(raw);
    const alias = ITEM_NAME_ALIASES.get(normalized);
    // Prefer canonical built-in document type when it matches, otherwise allow dynamic onboarding item names.
    return alias || allowedDocumentTypeByNormalized.get(normalized) || raw;
};

const mapStatusToUi = (status) => {
    const v = String(status || '').toLowerCase();
    if (v === 'rejected') return 'disapproved';
    return v || 'pending';
};

// Category mapping per product spec
const CATEGORY_MAP = new Map([
    // Personal Information
    [normalizeDocName(DOCUMENT_TYPES.RESUME_CV), 'Personal Information'],
    [normalizeDocName(DOCUMENT_TYPES.PERSONAL_DATA_SHEET), 'Personal Information'],
    [normalizeDocName(DOCUMENT_TYPES.APPLICATION_FOR_EMPLOYMENT), 'Personal Information'],
    [normalizeDocName(DOCUMENT_TYPES.EMPLOYEE_PHOTO), 'Personal Information'],

    // Legal & Contracts
    [normalizeDocName(DOCUMENT_TYPES.EMPLOYEE_CONTRACT), 'Legal & Contracts'],
    [normalizeDocName(DOCUMENT_TYPES.NDA), 'Legal & Contracts'],
    [normalizeDocName(DOCUMENT_TYPES.SINUMPAANG_SALAYSAY), 'Legal & Contracts'],
    [normalizeDocName(DOCUMENT_TYPES.WAIVER_OF_MEDICAL_EXAMINATION), 'Legal & Contracts'],

    // Identification
    [normalizeDocName(DOCUMENT_TYPES.DRIVERS_LICENSE), 'Identification'],
    [normalizeDocName(DOCUMENT_TYPES.PRC_ID), 'Identification'],

    // Education
    [normalizeDocName(DOCUMENT_TYPES.DIPLOMA), 'Education'],
    [normalizeDocName(DOCUMENT_TYPES.TOR), 'Education'],

    // Benefits handled by SECTION_BREAKS -> 'Benefits'
]);

    // Explicit ordering of items inside each category to match product spec
    const CATEGORY_ITEM_ORDER = {
        'Personal Information': [
            DOCUMENT_TYPES.EMPLOYEE_PHOTO,
            DOCUMENT_TYPES.PERSONAL_DATA_SHEET,
            DOCUMENT_TYPES.RESUME_CV,
            DOCUMENT_TYPES.APPLICATION_FOR_EMPLOYMENT,
        ],
        'Legal & Contracts': [
            DOCUMENT_TYPES.SINUMPAANG_SALAYSAY,
            DOCUMENT_TYPES.WAIVER_OF_MEDICAL_EXAMINATION,
            DOCUMENT_TYPES.NDA,
            DOCUMENT_TYPES.EMPLOYEE_CONTRACT,
        ],
        'Benefits': [
            DOCUMENT_TYPES.PHILHEALTH,
            DOCUMENT_TYPES.SSS,
            DOCUMENT_TYPES.PAG_IBIG,
        ],
        'Identification': [
            DOCUMENT_TYPES.PRC_ID,
            DOCUMENT_TYPES.DRIVERS_LICENSE,
        ],
        'Education': [
            DOCUMENT_TYPES.DIPLOMA,
            DOCUMENT_TYPES.TOR,
        ],
    };

const getCategoryForItem = (itemName) => {
    const docName = getDocumentNameForUpload(itemName);
    if (SECTION_BREAKS.has(docName)) return 'Benefits';
    const dn = normalizeDocName(docName);
    return CATEGORY_MAP.get(dn) || 'Other Documents';
};

const mapUiToApiStatus = (uiStatus) => {
    const v = String(uiStatus || '').toLowerCase();
    if (v === 'disapproved') return 'rejected';
    return v;
};

const isEmployeePhotoDocumentName = (documentName) => normalizeDocName(documentName) === normalizeDocName(DOCUMENT_TYPES.EMPLOYEE_PHOTO);

const acceptForChecklistItem = (itemName) => {
    const docName = getDocumentNameForUpload(itemName);
    if (isEmployeePhotoDocumentName(docName)) return 'image/jpeg';
    return 'application/pdf,image/*';
};

const validateSelectedFileForChecklistItem = ({ itemName, file, notify }) => {
    if (!file) return { ok: false, message: 'No file selected.' };
    const docName = getDocumentNameForUpload(itemName);

    if (isEmployeePhotoDocumentName(docName)) {
        const mime = String(file.type || '').toLowerCase();
        if (mime !== 'image/jpeg') {
            const msg = 'Employee Photo must be a JPEG image (.jpg/.jpeg) only.';
            notify?.({ title: 'Invalid file type', message: msg });
            return { ok: false, message: msg };
        }
    }

    return { ok: true };
};

const previewDocument = async (documentId, fallbackName = 'document', notify, onPreview) => {
    try {
        const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const url = base.endsWith('/api')
            ? `${base}/documents/${documentId}/preview`
            : `${base}/api/documents/${documentId}/preview`;

        const token = localStorage.getItem('access_token');
        const res = await fetch(url, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        const json = await res.json();
        if (!res.ok) {
            throw new Error(json?.message || 'Preview failed');
        }

        const previewUrl = json?.data?.url;
        if (previewUrl) {
            let fileName = json?.data?.fileName || fallbackName;
            const mimeType = json?.data?.mimeType || '';
            fileName = ensureFileNameHasExtension(fileName, mimeType);

            const isAuthenticatedStream =
                typeof previewUrl === 'string' &&
                previewUrl.includes('/documents/') &&
                previewUrl.includes('/download') &&
                previewUrl.includes('disposition=inline');

            // Prefer opening an in-app modal. If no handler is provided, fall back to new tab.
            if (typeof onPreview === 'function') {
                if (isAuthenticatedStream) {
                    const token = localStorage.getItem('access_token');
                    const fileRes = await fetch(previewUrl, {
                        method: 'GET',
                        headers: token ? { Authorization: `Bearer ${token}` } : {}
                    });

                    if (!fileRes.ok) {
                        const msg = await fileRes.text();
                        throw new Error(msg || 'Preview failed');
                    }

                    const streamMime = fileRes.headers.get('content-type') || '';
                    const blob = await fileRes.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    const finalName = ensureFileNameHasExtension(fileName, streamMime || mimeType);
                    onPreview({ url: objectUrl, fileName: finalName, mimeType: streamMime || mimeType, revokeUrlOnClose: true });
                    return;
                }

                onPreview({
                    url: previewUrl,
                    fileName,
                    mimeType: mimeType,
                    revokeUrlOnClose: false
                });
                return;
            }

            window.open(previewUrl, '_blank', 'noreferrer');
            return;
        }

        throw new Error(`No preview URL returned for ${fallbackName}`);
    } catch (err) {
        console.error('Preview failed:', err);
        notify?.({
            title: 'Preview failed',
            message: err?.message || 'Preview failed',
        });
    }
};

const extractFileNameFromContentDisposition = (headerValue) => {
    const raw = String(headerValue || '');
    if (!raw) return '';

    const matchStar = raw.match(/filename\*=([^;]+)/i);
    if (matchStar?.[1]) {
        const v = matchStar[1].trim();
        const parts = v.split("''");
        const encoded = parts.length > 1 ? parts.slice(1).join("''") : v;
        try {
            return decodeURIComponent(encoded.replace(/^UTF-8''/i, '').replace(/^"|"$/g, ''));
        } catch {
            return encoded.replace(/^UTF-8''/i, '').replace(/^"|"$/g, '');
        }
    }

    const match = raw.match(/filename=([^;]+)/i);
    if (!match?.[1]) return '';
    return match[1].trim().replace(/^"|"$/g, '');
};

const ensureFileNameHasExtension = (fileName, mimeType) => {
    let name = String(fileName || '').trim();
    const mt = String(mimeType || '').toLowerCase();

    const hasExt = /\.[a-z0-9]{1,6}$/i.test(name);
    if (hasExt) return name;

    const map = {
        'application/pdf': 'pdf',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/jpg': 'jpg',
        'image/gif': 'gif',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
        'application/vnd.ms-excel': 'xls',
        'text/csv': 'csv',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
        'application/msword': 'doc',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
        // Google Drive native formats -> prefer PDF for preview
        'application/vnd.google-apps.document': 'pdf',
        'application/vnd.google-apps.spreadsheet': 'xlsx',
        'application/vnd.google-apps.presentation': 'pptx',
    };

    const ext = map[mt] || '';
    if (!ext) return name;
    // sanitize name (remove trailing dots/spaces)
    name = name.replace(/[\.\s]+$/g, '');
    return `${name}.${ext}`;
};

const triggerBlobDownload = (blob, fileName) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = String(fileName || 'document');
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 2500);
};

const downloadDocumentToDisk = async (documentId, fallbackName = 'document', notify) => {
    try {
        const base = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000').replace(/\/$/, '');
        const url = base.endsWith('/api')
            ? `${base}/documents/${documentId}/download?disposition=attachment`
            : `${base}/api/documents/${documentId}/download?disposition=attachment`;

        const token = localStorage.getItem('access_token');
        const res = await fetch(url, {
            method: 'GET',
            headers: token ? { Authorization: `Bearer ${token}` } : {}
        });

        if (!res.ok) {
            let msg = 'Failed to download document.';
            try {
                const j = await res.json();
                msg = j?.message || msg;
            } catch {
                // ignore
            }
            throw new Error(msg);
        }

        const ct = String(res.headers.get('content-type') || '').toLowerCase();
        const cd = res.headers.get('content-disposition') || '';
        const headerName = extractFileNameFromContentDisposition(cd);

        // Supabase provider returns JSON with signed URL.
        if (ct.includes('application/json')) {
            const json = await res.json();
            const signedUrl = json?.data?.url || '';
            const providerFileName = json?.data?.fileName || '';
            const providerMime = json?.data?.mimeType || '';
            if (!signedUrl) throw new Error('Download URL missing from server response.');

            const fileRes = await fetch(signedUrl);
            if (!fileRes.ok) throw new Error('Failed to fetch the download file.');
            const blob = await fileRes.blob();
            const finalName = ensureFileNameHasExtension(providerFileName || headerName || fallbackName, providerMime || ct);
            triggerBlobDownload(blob, finalName);
            return;
        }

        // Drive provider streams the file directly.
        const blob = await res.blob();
        const finalName = ensureFileNameHasExtension(headerName || fallbackName, ct);
        triggerBlobDownload(blob, finalName);
    } catch (e) {
        notify?.({ title: 'Download failed', message: e?.message || 'Failed to download document.' });
        throw e;
    }
};

const LocalFilePreview = ({ file }) => {
    const [url, setUrl] = useState(null);

    useEffect(() => {
        if (!file) {
            setUrl(null);
            return;
        }
        const objectUrl = URL.createObjectURL(file);
        setUrl(objectUrl);
        return () => URL.revokeObjectURL(objectUrl);
    }, [file]);

    if (!file) return null;

    const type = String(file.type || '').toLowerCase();
    const isPdf = type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
    const isImg = type.startsWith('image/');

    return (
        <div className="mt-2 border border-gray-200 rounded-md overflow-hidden bg-gray-50">
            {!url ? null : isImg ? (
                <img src={url} alt={file.name} className="w-full max-h-40 object-contain bg-white" />
            ) : isPdf ? (
                <iframe title={file.name} src={url} className="w-full h-40 bg-white" />
            ) : (
                <div className="p-2 text-[11px] text-gray-700">Preview not available for this file type.</div>
            )}
        </div>
    );
};

const PreviewModal = ({ open, title, url, mimeType, loading, onClose, allowImageActions, onReplaceImage, onDeleteFile, onDownload }) => {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    const type = String(mimeType || '').toLowerCase();
    const isPdf = type.includes('pdf') || String(url || '').toLowerCase().split('?')[0].endsWith('.pdf');
    const isImg = type.startsWith('image/');
    const effectiveDownloadUrl = url;
    const canShowImageActions = !!allowImageActions && !loading && isImg;
    const canShowDelete = !loading && typeof onDeleteFile === 'function';
    const canShowDownload = !loading && typeof onDownload === 'function';

    return (
        <div
            className="fixed inset-0 z-[9000] flex items-center justify-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Preview'}
        >
            <div className="w-full max-w-4xl rounded-2xl bg-white shadow-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 bg-[#990100] flex items-center justify-between gap-3">
                    <h2 className="text-white text-sm font-semibold tracking-wide truncate">{`Preview: ${title || 'Document'}`}</h2>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-white/90 hover:text-white text-sm font-medium cursor-pointer"
                    >
                        Close
                    </button>
                </div>

                <div className="px-5 py-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-16">
                            <p className="text-gray-600">Loading…</p>
                        </div>
                    ) : isPdf ? (
                        <div className="border border-gray-200 rounded-md overflow-hidden bg-white relative z-0">
                            <iframe title="Document preview" src={url} className="w-full h-[70vh] relative z-0" />
                        </div>
                    ) : isImg ? (
                        <div className="border border-gray-200 rounded-md overflow-hidden bg-white flex items-center justify-center relative z-0">
                            <img src={url} alt="Preview" className="max-h-[70vh] w-full object-contain" />
                        </div>
                    ) : (
                        <div className="text-sm text-gray-700">
                            Preview isn’t available for this file type. Use Open/Download.
                        </div>
                    )}

                    <div className="mt-5 flex items-center justify-end gap-3 relative z-10">
                        {canShowImageActions ? (
                            <>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
                                    onClick={() => onReplaceImage?.()}
                                >
                                    Change Image
                                </button>
                            </>
                        ) : null}

                        {canShowDelete ? (
                            <button
                                type="button"
                                className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
                                onClick={() => onDeleteFile?.()}
                            >
                                Delete
                            </button>
                        ) : null}

                        {canShowDownload ? (
                            <button
                                type="button"
                                className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
                                onClick={() => onDownload?.()}
                            >
                                Download
                            </button>
                        ) : null}

                        {!loading && effectiveDownloadUrl ? (
                            <a
                                href={effectiveDownloadUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
                            >
                                Open
                            </a>
                        ) : null}
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-5 py-2 rounded-full text-sm text-white bg-[#990100] hover:bg-[#ad3332] transition cursor-pointer"
                        >
                            OK
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

function SendReminderModal({ open, title, message, onClose, onSend, sending }) {
    useEffect(() => {
        if (!open) return;
        const onKeyDown = (e) => {
            if (e.key === 'Escape') onClose?.();
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [open, onClose]);

    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[9500] flex items-center justify-center bg-black/40 px-4"
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Send Reminder'}
        >
            <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-gray-200">
                <div className="p-4 sm:p-6">
                    <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
                        <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
                            {title || 'Send Reminder'}
                        </h1>

                        <button
                            type="button"
                            onClick={onClose}
                            className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
                            aria-label="Close"
                            disabled={sending}
                        >
                            ✕
                        </button>
                    </div>

                    <div className="pt-4">
                        <p className="text-sm text-gray-700 whitespace-pre-line">
                            {message || ''}
                        </p>

                        <div className="mt-6 flex items-center justify-end gap-3">
                            <button
                                type="button"
                                className="px-5 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={onClose}
                                disabled={sending}
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="px-5 py-2 rounded-full text-sm text-white bg-[#990100] hover:bg-[#ad3332] transition cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                                onClick={onSend}
                                disabled={sending}
                            >
                                {sending ? 'Sending…' : 'Send'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ModalFiles({ isOpen, onClose, employeeFiles, isEmployee, refresh, variant = 'modal' }) {
    const [editData, setEditData] = useState(false);
    const [remarksById, setRemarksById] = useState({});
    const [statusById, setStatusById] = useState({});
    const [uploadingId, setUploadingId] = useState(null);
    const [selectedFileNameById, setSelectedFileNameById] = useState({});
    const [selectedFileById, setSelectedFileById] = useState({});
    const [savingReviewId, setSavingReviewId] = useState(null);
    const [confirmState, setConfirmState] = useState({
        open: false,
        title: 'Confirmation',
        message: '',
        confirmText: 'OK',
        cancelText: 'Cancel',
        onConfirm: null,
    });

    const [confirmBusy, setConfirmBusy] = useState(false);

    const [previewState, setPreviewState] = useState({
        open: false,
        title: '',
        fileName: '',
        url: '',
        downloadUrl: '',
        mimeType: '',
        revokeOnClose: false,
        loading: false,
        documentId: null,
        checklistItemId: null,
        employeeDbId: null,
        documentName: null,
        locked: false,
    });

    const [replacePickerKey, setReplacePickerKey] = useState(0);
    const [collapsedByCategory, setCollapsedByCategory] = useState({});

    useEffect(() => {
        if (!isOpen) return;
        // Always start in view mode when the modal opens.
        setEditData(false);
        setConfirmBusy(false);
        setConfirmState({
            open: false,
            title: 'Confirmation',
            message: '',
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: null,
        });
    }, [isOpen]);

    const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
        setConfirmState({
            open: true,
            title: title || 'Confirmation',
            message: message || '',
            confirmText: confirmText || 'OK',
            cancelText: cancelText || 'Cancel',
            onConfirm: onConfirm || null,
        });
    };

    const closeConfirm = () => {
        setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
    };

    const handleConfirm = async () => {
        const fn = confirmState.onConfirm;
        if (!fn) {
            closeConfirm();
            return;
        }

        try {
            // Close the current dialog first to prevent "sticky" modals and
            // avoid racing state updates when the action opens its own dialog.
            closeConfirm();
            setConfirmBusy(true);
            await fn?.();
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

    const notify = ({ title, message }) => {
        openConfirm({
            title: title || 'Notice',
            message: message || '',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: null,
        });
    };

    useEffect(() => {
        setEditData(false);
        const nextStatus = {};
        const nextRemarks = {};
        (employeeFiles?.checklistItems || []).forEach((it) => {
            nextStatus[it.id] = mapStatusToUi(it.status);
            nextRemarks[it.id] = it.remarks || '';
        });
        setStatusById(nextStatus);
        setRemarksById(nextRemarks);
        setSelectedFileNameById({});
    }, [employeeFiles]);

    useEffect(() => {
        return () => {
            if (previewState?.revokeOnClose && previewState?.url) {
                try {
                    URL.revokeObjectURL(previewState.url);
                } catch {
                    // ignore
                }
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const closePreview = () => {
        setPreviewState((prev) => {
            if (prev?.revokeOnClose && prev?.url) {
                try {
                    URL.revokeObjectURL(prev.url);
                } catch {
                    // ignore
                }
            }
            return {
                open: false,
                title: '',
                fileName: '',
                url: '',
                downloadUrl: '',
                mimeType: '',
                revokeOnClose: false,
                loading: false,
                documentId: null,
                checklistItemId: null,
                employeeDbId: null,
                documentName: null,
                locked: false,
            };
        });
    };

    const triggerReplaceFromPreview = () => {
        if (!previewState?.documentId) return;
        setReplacePickerKey((k) => k + 1);
        const el = document.getElementById('preview-replace-file');
        el?.click?.();
    };

    const handleReplaceFromPreview = async (file) => {
        if (!file) return;

        // Allow modification if employee OR HR editing a project-based employee
        const canModifyFromPreview = (isEmployee || (editData && isProjectBased(employeeFiles?.personnelType)));
        if (!canModifyFromPreview && previewState?.locked) {
            notify({ title: 'Not allowed', message: 'Approved files cannot be changed.' });
            return;
        }

        const v = validateSelectedFileForChecklistItem({ itemName: previewState?.documentName || '', file, notify });
        if (!v.ok) return;

        if (file.size > 10 * 1024 * 1024) {
            notify({ title: 'File too large', message: 'File is too large. Maximum size is 10MB.' });
            return;
        }

        openConfirm({
            title: 'Replace file',
            message: 'Replace the currently uploaded file with this one?',
            confirmText: 'Replace',
            cancelText: 'Cancel',
            onConfirm: async () => {
                const empDbId = previewState.employeeDbId || employeeFiles?.employee_id;
                const docName = previewState.documentName;
                const checklistItemId = previewState.checklistItemId;

                if (!empDbId || !docName) {
                    throw new Error('Missing upload context for replace');
                }

                const fd = new FormData();
                fd.append('file', file);
                fd.append('employee_id', empDbId);
                fd.append('document_name', docName);
                if (checklistItemId) fd.append('checklist_item_id', checklistItemId);
                await postFormWithProgress('/documents/upload', fd, () => {});
                await refresh();
                closePreview();
            },
        });
    };

    const handleDeleteFromPreview = () => {
        const documentId = previewState?.documentId;
        if (!documentId) return;

        const canModifyFromPreview = (isEmployee || (editData && isProjectBased(employeeFiles?.personnelType)));
        if (!canModifyFromPreview && previewState?.locked) {
            notify({ title: 'Not allowed', message: 'Approved files cannot be deleted.' });
            return;
        }

        openConfirm({
            title: 'Delete file',
            message: 'Delete this uploaded file?',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            onConfirm: async () => {
                await del(`/documents/${documentId}`);
                await refresh();
                closePreview();
            },
        });
    };

    const handleDownloadFromPreview = async () => {
        const documentId = previewState?.documentId;
        if (!documentId) return;
        const fileName = previewState?.fileName || previewState?.title || 'document';
        await downloadDocumentToDisk(documentId, fileName, notify);
    };

    const openPreviewForItem = (it, locked = false) => {
        if (!it) return;
        setPreviewState({
            open: true,
            title: it.file_name || 'document',
            fileName: withEmployeePrefix(employeeFiles?.id, it.file_name || 'document'),
            url: '',
            downloadUrl: '',
            mimeType: '',
            revokeOnClose: false,
            loading: true,
            documentId: it.document_id,
            checklistItemId: shouldAppendChecklistItemId(it) ? it.id : null,
            employeeDbId: employeeFiles.employee_id,
            documentName: getDocumentNameForUpload(it.item_name),
            locked,
        });

        if (it.document_id) {
            previewDocument(it.document_id, it.file_name || 'document', notify, ({ url, fileName, mimeType, revokeUrlOnClose }) => {
                setPreviewState((prev) => ({
                    ...prev,
                    open: true,
                    title: fileName || it.file_name || 'document',
                    fileName: withEmployeePrefix(employeeFiles?.id, fileName || it.file_name || 'document'),
                    url: url || '',
                    downloadUrl: url || '',
                    mimeType: mimeType || '',
                    revokeOnClose: !!revokeUrlOnClose,
                    loading: false,
                    documentId: it.document_id,
                    checklistItemId: shouldAppendChecklistItemId(it) ? it.id : null,
                    employeeDbId: employeeFiles.employee_id,
                    documentName: getDocumentNameForUpload(it.item_name),
                }));
            }).catch(() => setPreviewState((prev) => ({ ...prev, loading: false })));
        }
    };

    const checklist = dedupeChecklistItems(employeeFiles?.checklistItems || []);

    const groupedSections = useMemo(() => {
        const items = getRequiredChecklistItems(checklist || []);
        const groups = items.reduce((acc, it) => {
            const cat = getCategoryForItem(it.item_name);
            if (!acc[cat]) acc[cat] = [];
            acc[cat].push(it);
            return acc;
        }, {});

        const desiredOrder = [
            'Personal Information',
            'Legal & Contracts',
            'Benefits',
            'Identification',
            'Education',
            'Other Documents',
        ];

        const cats = Object.keys(groups || {});
        const ordered = [
            ...desiredOrder.filter((c) => cats.includes(c)),
            ...cats.filter((c) => !desiredOrder.includes(c)),
        ];

        return ordered.map((cat) => {
            const groupItems = (groups[cat] || []).slice();
            const ordering = CATEGORY_ITEM_ORDER[cat] || null;
            if (ordering && ordering.length) {
                const ordMap = new Map(ordering.map((v, i) => [normalizeDocName(v), i]));
                groupItems.sort((a, b) => {
                    const an = normalizeDocName(getDocumentNameForUpload(a.item_name));
                    const bn = normalizeDocName(getDocumentNameForUpload(b.item_name));
                    const ai = ordMap.has(an) ? ordMap.get(an) : Number.MAX_SAFE_INTEGER;
                    const bi = ordMap.has(bn) ? ordMap.get(bn) : Number.MAX_SAFE_INTEGER;
                    if (ai !== bi) return ai - bi;
                    return compareText(a.item_name, b.item_name);
                });
            } else {
                groupItems.sort((a, b) => compareText(a.item_name, b.item_name));
            }

            return { cat, items: groupItems };
        });
    }, [checklist]);

    const [checklistOffset, setChecklistOffset] = useState(0);
    const checklistItemsPerPage = 8;
    const checklistEndOffset = checklistOffset + checklistItemsPerPage;
    const checklistPageCount = Math.ceil(checklist.length / checklistItemsPerPage);
    const checklistMultiPages = checklistPageCount > 1;

    useEffect(() => {
        setChecklistOffset(0);
    }, [employeeFiles?.id || employeeFiles?.employee_id, isOpen]);

    const currentChecklist = checklist.slice(checklistOffset, checklistEndOffset);

    if (!isOpen || !employeeFiles) return null;

    const isInline = variant === 'inline';

    const canHrEdit = !isEmployee && editData;

    const shouldAppendChecklistItemId = (item) => {
        if (!item) return false;
        if (item.virtual) return false;
        return item.id !== undefined && item.id !== null && String(item.id).trim() !== '';
    };

    const renderSectionHeaderRow = (title) => (
        <tr key={`section-${title}`}>
            <td colSpan={4} className="px-3 pt-5 pb-2">
                <div className="flex items-center gap-4">
                    <span className="font-extrabold text-base tracking-wide">{title}</span>
                    <div className="flex-1 border-t border-[#990100]/40" />
                </div>
            </td>
        </tr>
    );

    const saveReviewForItem = async (it) => {
        try {
            if (!it?.id) return;
            if (it?.virtual) {
                notify({ title: 'Not editable', message: 'This requirement has no checklist item to review.' });
                return;
            }

            const nextStatus = statusById[it.id];
            const prevStatus = mapStatusToUi(it.status);
            const nextRemarks = (remarksById[it.id] || '').trim();
            const prevRemarks = (it.remarks || '').trim();

            if ((nextStatus || 'pending') === (prevStatus || 'pending') && nextRemarks === prevRemarks) {
                notify({ title: 'No changes', message: 'There are no changes to save for this item.' });
                return;
            }

            setSavingReviewId(it.id);
            await post(`/onboarding/checklist/${it.id}/review`, {
                status: mapUiToApiStatus(nextStatus),
                remarks: nextRemarks || null
            });

            // Update local UI state only so admin can continue editing without the modal
            // reloading. Parent `refresh()` can be invoked separately if a full refresh
            // is necessary.
            setStatusById((p) => ({ ...p, [it.id]: nextStatus }));
            setRemarksById((p) => ({ ...p, [it.id]: nextRemarks }));
        } catch (err) {
            console.error('Save failed:', err);
            notify({ title: 'Save failed', message: err?.message || 'Save failed' });
        } finally {
            setSavingReviewId(null);
        }
    };

    const openReviewConfirm = (it) => {
        openConfirm({
            title: 'Review',
            message: 'Open review panel for this item?',
            confirmText: 'OK',
            cancelText: 'Cancel',
            onConfirm: async () => {
                setEditData(true);
                setStatusById((p) => ({ ...p, [it.id]: mapStatusToUi(it.status) }));
            },
        });
    };

    const cancelEditing = () => {
        const nextStatus = {};
        const nextRemarks = {};
        (employeeFiles?.checklistItems || []).forEach((it) => {
            nextStatus[it.id] = mapStatusToUi(it.status);
            nextRemarks[it.id] = it.remarks || '';
        });
        setStatusById(nextStatus);
        setRemarksById(nextRemarks);
        setEditData(false);
    };

    const ChecklistItem = ({ it }) => {
        const statusUi = mapStatusToUi(statusById[it.id] || it.status);
        const hasFile = !!it.document_id;
        const isApproved = String(it.status || '').toLowerCase() === 'approved';
        const locked = !!isEmployee && isApproved;

        return (
            <div key={it.id} className="grid grid-cols-12 gap-4 items-center py-4 border-b border-gray-100">
                <div className="col-span-6 sm:col-span-6 text-left font-medium lg:text-sm text-xs">{it.item_name}</div>

                <div className="col-span-4 sm:col-span-4">
                    <div className="flex items-center gap-3">
                        <div className="flex-1">
                            <span className="sr-only">{hasFile ? it.file_name : 'No file attached'}</span>
                        </div>

                        <div>
                            <div className="inline-block">
                                {canHrEdit ? (
                                    <select
                                        value={statusById[it.id] || mapStatusToUi(it.status)}
                                        onChange={(e) => setStatusById((p) => ({ ...p, [it.id]: String(e.target.value || '').toLowerCase() }))}
                                        className="text-sm border rounded px-2 py-1"
                                    >
                                        <option value="pending">Pending</option>
                                        <option value="submitted">Submitted</option>
                                        <option value="approved">Approved</option>
                                        <option value="disapproved">Disapproved</option>
                                    </select>
                                ) : (
                                    <span className={`inline-block text-xs px-2 py-1 rounded-full border ${statusUi === 'disapproved' ? 'border-[#C60000] text-[#C60000]' : statusUi === 'approved' ? 'border-[#198C19] text-[#198C19]' : 'border-gray-300 text-gray-700'}`}>
                                        {statusUi.replace(/^./, (c) => c.toUpperCase())}
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>

                    {canHrEdit ? (
                        <div className="mt-2">
                            <textarea
                                value={remarksById[it.id] ?? it.remarks ?? ''}
                                onChange={(e) => setRemarksById((p) => ({ ...p, [it.id]: e.target.value }))}
                                placeholder="Remarks (optional)"
                                className="w-full border rounded px-2 py-1 text-sm"
                            />

                            <div className="pt-2 flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => saveReviewForItem(it)}
                                    disabled={savingReviewId === it.id}
                                    className="h-9 inline-flex items-center px-3 bg-[#198C19] text-white rounded-md text-sm disabled:opacity-60"
                                >
                                    {savingReviewId === it.id ? 'Saving…' : 'Save'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setStatusById((p) => ({ ...p, [it.id]: mapStatusToUi(it.status) }));
                                        setRemarksById((p) => ({ ...p, [it.id]: it.remarks || '' }));
                                    }}
                                    className="h-9 inline-flex items-center px-3 border rounded-md text-sm"
                                >
                                    Reset
                                </button>
                            </div>
                        </div>
                    ) : (
                        mapStatusToUi(statusById[it.id] || it.status) === 'disapproved' && it.remarks ? (
                            <div className="text-xs text-[#C60000] mt-2">{it.remarks}</div>
                        ) : null
                    )}
                </div>

                <div className="col-span-1 sm:col-span-1 text-sm text-gray-600">{it.updated_at ? new Date(it.updated_at).toLocaleDateString() : '—'}</div>

                <div className="col-span-1 sm:col-span-1 text-right">
                    <div className="flex items-center justify-end gap-2">
                        {(isEmployee || (!isEmployee && editData && isProjectBased(employeeFiles?.personnelType))) ? (
                            <>
                                {(!hasFile || statusUi === 'disapproved') ? (
                                    <>
                                        <input
                                            id={`file-${it.id}`}
                                            type="file"
                                            className="hidden"
                                            accept={acceptForChecklistItem(it.item_name)}
                                            onChange={async (e) => {
                                                const f = e.target.files?.[0];
                                                if (!f) return;
                                                const ok = validateSelectedFileForChecklistItem({ itemName: it.item_name, file: f, notify });
                                                if (!ok.ok) { e.target.value = ''; return; }

                                                openConfirm({
                                                    title: 'Confirm upload',
                                                    message: 'Upload this file?',
                                                    confirmText: 'OK',
                                                    cancelText: 'Cancel',
                                                    onConfirm: async () => {
                                                        try {
                                                            setUploadingId(it.id);
                                                            const fd = new FormData();
                                                            fd.append('file', f);
                                                            fd.append('employee_id', employeeFiles.employee_id);
                                                            fd.append('document_name', getDocumentNameForUpload(it.item_name));
                                                            if (shouldAppendChecklistItemId(it)) fd.append('checklist_item_id', it.id);
                                                            await postFormWithProgress('/documents/upload', fd, () => {});
                                                            await refresh();
                                                            e.target.value = '';
                                                        } catch (err) {
                                                            console.error('Upload failed:', err);
                                                            notify({ title: 'Upload failed', message: err?.message || 'Upload failed' });
                                                        } finally {
                                                            setUploadingId(null);
                                                        }
                                                    },
                                                });
                                            }}
                                        />
                                        <label htmlFor={`file-${it.id}`} className={`h-9 inline-flex items-center bg-[#990100] text-white px-3 rounded-md text-sm cursor-pointer ${uploadingId === it.id ? 'opacity-60 pointer-events-none' : ''}`}>{uploadingId === it.id ? 'Uploading…' : (hasFile ? 'Reupload' : 'Upload')}</label>
                                    </>
                                ) : (
                                    <button type="button" onClick={() => openPreviewForItem(it, locked)} className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition cursor-pointer">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="flex items-center gap-2">
                                    <button type="button" onClick={() => openPreviewForItem(it, false)} className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition cursor-pointer">
                                        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>
                                    </button>

                                    {(statusUi === 'submitted' || statusUi === 'pending') ? (
                                        <button type="button" onClick={() => openReviewConfirm(it)} className="h-9 inline-flex items-center px-3 border border-[#C60000] text-[#C60000] bg-white rounded-md text-sm hover:bg-[#fff2f2]">Review</button>
                                    ) : null}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-1000 bg-[#EDEDED]/50 px-3 py-4">
            <div className="bg-white rounded-lg shadow-lg w-full max-w-6xl border border-gray-300 overflow-hidden flex flex-col max-h-[90vh]" style={{ WebkitOverflowScrolling: 'touch' }}>
                <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 m-4">
                    <h1 className="text-white font-medium lg:text-lg text-sm">201 Files of {employeeFiles.id}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-auto md:p-6 px-3 py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="overflow-x-auto">
                        {/* Group checklist items by category and show all in a scrolling view (no pagination) */}
                        {groupedSections.map(({ cat, items }) => (
                            <div key={cat} className="mb-6">
                                <div className="mb-3 flex items-center justify-between">
                                    <h3 className="text-[#990100] text-sm font-semibold">{cat}</h3>
                                    <div className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? 's' : ''}</div>
                                </div>

                                <div className="w-full">
                                    {items.map((it) => (
                                        <ChecklistItem key={it.id} it={it} />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="mt-4 lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentChecklist.length}</b> of <b>{checklist.length}</b> file{checklist.length !== 1 ? 's' : ''}

                        </p>

                        {checklistPageCount > 1 && (
                            <ReactPaginate
                                breakLabel="..."
                                nextLabel=">"
                                onPageChange={(event) => setChecklistOffset(event.selected * checklistItemsPerPage)}
                                pageRangeDisplayed={2}
                                pageCount={checklistPageCount}
                                forcePage={Math.floor(checklistOffset / checklistItemsPerPage)}
                                previousLabel="<"
                                renderOnZeroPageCount={null}
                                marginPagesDisplayed={2}
                                pageClassName=""
                                pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                                previousClassName={checklistMultiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                                previousLinkClassName="page-link"
                                nextClassName={checklistMultiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                                nextLinkClassName="page-link"
                                breakClassName="page-item"
                                breakLinkClassName="page-link"
                                containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                                activeClassName="underline font-medium"
                            />
                        )}
                    </div>

                    {!isEmployee && (
                        <div className="pt-7 flex justify-end gap-4">
                            {!editData ? (
                                <>
                                    {/*<button
                                        type="button"
                                        className="bg-[#C60000] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                        onClick={onClose}
                                    >
                                        Close
                                    </button>*/}
                                    <button
                                        type="button"
                                        onClick={() => setEditData(true)}
                                        className="bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                    >
                                        Update Record
                                    </button>
                                </>
                            ) : (
                                <>
                                    <button
                                        type="button"
                                        className="bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                        onClick={() =>
                                            openConfirm({
                                                title: 'Cancel editing',
                                                message: 'Discard unsaved changes?',
                                                confirmText: 'OK',
                                                cancelText: 'Cancel',
                                                onConfirm: cancelEditing,
                                            })
                                        }
                                    >
                                        Cancel Changes
                                    </button>
                                    <button
                                        type="button"
                                        className="bg-[#FFA500] lg:px-5 md:py-[7px] px-4 py-[7px] lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-50 cursor-pointer"
                                        onClick={() => setEditData(false)}
                                    >
                                        Save Changes
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {isEmployee && (
                        <div className="pt-7 flex justify-center">
                            <button
                                type="button"
                                className="bg-[#990100] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                onClick={onClose}
                            >
                                Close
                            </button>
                        </div>
                    )}

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
                        url={previewState.url}
                        mimeType={previewState.mimeType}
                        loading={previewState.loading}
                        onClose={closePreview}
                        // Allow change/delete when not locked (approved). Employees may replace files; HR may when editing and project-based.
                        allowImageActions={!previewState.locked && (isEmployee || (editData && isProjectBased(employeeFiles?.personnelType)))}
                        onReplaceImage={!previewState.locked && (isEmployee || (editData && isProjectBased(employeeFiles?.personnelType))) ? triggerReplaceFromPreview : undefined}
                        onDeleteFile={!previewState.locked && (isEmployee || (editData && isProjectBased(employeeFiles?.personnelType))) ? handleDeleteFromPreview : undefined}
                        onDownload={handleDownloadFromPreview}
                    />

                    <input
                        key={replacePickerKey}
                        id="preview-replace-file"
                        type="file"
                        className="hidden"
                        accept={isEmployeePhotoDocumentName(previewState?.documentName) ? 'image/jpeg' : 'application/pdf,image/*'}
                        onChange={(e) => {
                            const f = e.target.files?.[0];
                            e.target.value = '';
                            handleReplaceFromPreview(f);
                        }}
                    />
                </div>
            </div>
        </div>
    );
}

export default function OnboardingFiles() {
    const { user } = useAuth();
    const isEmployee = String(user?.role || '').toLowerCase() === String(ROLES.EMPLOYEE || '').toLowerCase();

    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState('name_az');
    const [rows, setRows] = useState([]);
    const [statusFilter, setStatusFilter] = useState('all'); // all | incomplete | complete
    // Default to showing regular employees (hide Project-Based rows by default)
    const [personnelTypeFilter, setPersonnelTypeFilter] = useState('employees'); // all | employees | project_based

    const [reportOpen, setReportOpen] = useState(false);

    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployeeFiles, setViewEmployeeFiles] = useState(null);

    const [confirmState, setConfirmState] = useState({
        open: false,
        title: 'Confirmation',
        message: '',
        confirmText: 'OK',
        cancelText: 'Cancel',
        onConfirm: null,
    });
    const [confirmBusy, setConfirmBusy] = useState(false);
    const [reminderBusyByEmployeeId, setReminderBusyByEmployeeId] = useState({});

    
    const [sendReminderState, setSendReminderState] = useState({
        open: false,
        title: 'Send Reminder',
        message: '',
        row: null,
    });
const openConfirm = ({ title, message, confirmText, cancelText, onConfirm }) => {
        setConfirmState({
            open: true,
            title: title || 'Confirmation',
            message: message || '',
            confirmText: confirmText || 'OK',
            cancelText: cancelText ?? 'Cancel',
            onConfirm: onConfirm || null,
        });
    };

    const closeConfirm = () => {
        setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null }));
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

    const handleOpen = (row) => {
        setViewEmployeeFiles(row);
        setModalOpen(true);
    };

    const handleClose = () => setModalOpen(false);

    const fetchRows = async () => {
        try {
            setLoading(true);
            const endpoint = isEmployee ? `/onboarding/me/checklist` : '/onboarding/checklists';
            const res = await get(endpoint);
            const data = Array.isArray(res?.data) ? res.data : [];

            let nextRows = [];

            if (isEmployee) {
                const employeeDbId = data?.[0]?.employee_id || null;
                const checklistItems = dedupeChecklistItems(
                    data.map((it) => ({
                        id: it.id,
                        employee_id: employeeDbId,
                        is_required: it.is_required,
                        item_name: it.onboarding_items?.item_name || '',
                        status: it.status,
                        remarks: it.remarks,
                        document_id: it.documents?.id || it.document_id,
                        file_name: it.documents?.file_name || ''
                    }))
                );

                const progress = computeRowProgress({ checklistItems });

                nextRows = [
                    {
                        id: user?.employee_id || user?.email || 'Me',
                        employee_id: employeeDbId,
                        name: user?.email || 'Me',
                        personnelType: '',
                        hireDate: '',
                        checklistItems,
                        progress,
                        remarks: progress.completion
                    }

                ];

                setRows(nextRows);
                setViewEmployeeFiles(nextRows[0] || null);
                setModalOpen(true);
                setViewEmployeeFiles((prev) => {
                    if (!prev) return prev;
                    const updated = nextRows.find((r) => r.id === prev.id);
                    return updated || prev;
                });

                return;
            }

            const byEmployee = new Map();
            for (const it of data) {
                const emp = it.employees;
                const employeeCode = emp?.employee_id || it.employee_id;
                const employeeDbId = emp?.id || null;
                if (!employeeCode) continue;

                if (!byEmployee.has(employeeCode)) {
                    byEmployee.set(employeeCode, {
                        id: employeeCode,
                        employee_id: employeeDbId,
                        employee_code: employeeCode,
                        name: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim(),
                        personnelType: emp?.personnel_type || '',
                        hireDate: emp?.hire_date || '',
                        checklistItems: []
                    });
                }

                const candidate = {
                    id: it.id,
                    employee_id: employeeDbId,
                    is_required: it.is_required,
                    item_name: it.onboarding_items?.item_name || '',
                    status: it.status,
                    remarks: it.remarks,
                    document_id: it.documents?.id || it.document_id,
                    file_name: it.documents?.file_name || ''
                };

                if (!isVisibleChecklistItem(candidate)) continue;

                byEmployee.get(employeeCode).checklistItems.push(candidate);
            }

            nextRows = Array.from(byEmployee.values()).map((row) => {
                const checklistItems = dedupeChecklistItems(row.checklistItems);
                const progress = computeRowProgress({ checklistItems });
                return { ...row, checklistItems, progress, remarks: progress.completion };
            });
            setRows(nextRows);
            setViewEmployeeFiles((prev) => {
                if (!prev) return prev;
                const updated = nextRows.find((r) => r.id === prev.id);
                return updated || prev;
            });
        } catch (err) {
            console.error('Failed to load 201 files:', err);
            setRows([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRows();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isEmployee]);

    const filteredRows = useMemo(() => {
        if (!searchTerm) return rows;
        const q = searchTerm.toLowerCase();
        return rows.filter((r) => `${r.id} ${r.name}`.toLowerCase().includes(q));
    }, [rows, searchTerm]);

    const filteredRowsWithStatus = useMemo(() => {
        if (isEmployee) return filteredRows;
        const f = String(statusFilter || 'all');

        if (f === 'complete') {
            return filteredRows.filter((r) => String(r?.progress?.completion || r?.remarks || 'INCOMPLETE') === 'COMPLETE');
        }
        if (f === 'incomplete') {
            return filteredRows.filter((r) => String(r?.progress?.completion || r?.remarks || 'INCOMPLETE') !== 'COMPLETE');
        }
        return filteredRows;
    }, [filteredRows, isEmployee, statusFilter]);

    const filteredRowsWithPersonnelType = useMemo(() => {
        if (isEmployee) return filteredRowsWithStatus;
        const f = String(personnelTypeFilter || 'all');
        if (f === 'project_based') return filteredRowsWithStatus.filter((r) => isProjectBased(r?.personnelType));
        // Accept either the legacy 'standard' or the newer 'employees' value as "regular employees"
        if (f === 'employees' || f === 'standard') return filteredRowsWithStatus.filter((r) => !isProjectBased(r?.personnelType));
        return filteredRowsWithStatus;
    }, [filteredRowsWithStatus, isEmployee, personnelTypeFilter]);

    const visibleRows = useMemo(() => {
        const sorted = [...filteredRowsWithPersonnelType].sort((a, b) => {
            switch (sortOrder) {
                case 'employee_id_asc':
                    return compareText(a?.id, b?.id);
                case 'employee_id_desc':
                    return compareText(b?.id, a?.id);
                case 'name_az':
                    return compareText(a?.name, b?.name);
                case 'name_za':
                    return compareText(b?.name, a?.name);
                case 'personnel_type_employee_first': {
                    const aProject = isProjectBased(a?.personnelType);
                    const bProject = isProjectBased(b?.personnelType);
                    if (aProject === bProject) return compareText(a?.name, b?.name) || compareText(a?.id, b?.id);
                    return aProject ? 1 : -1;
                }
                case 'personnel_type_project_first': {
                    const aProject = isProjectBased(a?.personnelType);
                    const bProject = isProjectBased(b?.personnelType);
                    if (aProject === bProject) return compareText(a?.name, b?.name) || compareText(a?.id, b?.id);
                    return aProject ? -1 : 1;
                }
                case 'hire_date_newest':
                    return compareDate(b?.hireDate, a?.hireDate);
                case 'hire_date_oldest':
                    return compareDate(a?.hireDate, b?.hireDate);
                case 'completion_complete_first': {
                    const ac = String(a?.progress?.completion || a?.remarks || 'INCOMPLETE');
                    const bc = String(b?.progress?.completion || b?.remarks || 'INCOMPLETE');
                    if (ac === bc) return compareText(a?.name, b?.name) || compareText(a?.id, b?.id);
                    return ac === 'COMPLETE' ? -1 : 1;
                }
                case 'completion_incomplete_first': {
                    const ac = String(a?.progress?.completion || a?.remarks || 'INCOMPLETE');
                    const bc = String(b?.progress?.completion || b?.remarks || 'INCOMPLETE');
                    if (ac === bc) return compareText(a?.name, b?.name) || compareText(a?.id, b?.id);
                    return ac === 'COMPLETE' ? 1 : -1;
                }
                default:
                    return compareText(a?.name, b?.name);
            }
        });
        return sorted;
    }, [filteredRowsWithPersonnelType, sortOrder]);

    const toggleSort = (key) => {
        switch (key) {
            case 'employee_id':
                setSortOrder((s) => (s === 'employee_id_asc' ? 'employee_id_desc' : 'employee_id_asc'));
                break;
            case 'name':
                setSortOrder((s) => (s === 'name_az' ? 'name_za' : 'name_az'));
                break;
            case 'personnel_type':
                setSortOrder((s) => (s === 'personnel_type_employee_first' ? 'personnel_type_project_first' : 'personnel_type_employee_first'));
                break;
            case 'hire_date':
                setSortOrder((s) => (s === 'hire_date_newest' ? 'hire_date_oldest' : 'hire_date_newest'));
                break;
            case 'completion':
                setSortOrder((s) => (s === 'completion_complete_first' ? 'completion_incomplete_first' : 'completion_complete_first'));
                break;
            default:
                break;
        }
    };

    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 10;
    const endOffset = itemOffset + itemsPerPage;
    const currentRows = visibleRows.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(visibleRows.length / itemsPerPage);
    const multiPages = pageCount > 1;

    useEffect(() => {
        setItemOffset(0);
    }, [searchTerm, sortOrder, statusFilter, personnelTypeFilter, rows.length]);

    const handlePageClick = (event) => {
        const selected = Number.isFinite(event?.selected) ? event.selected : 0;
        const maxPage = Math.max(0, pageCount - 1);
        const clamped = Math.min(Math.max(0, selected), maxPage);
        setItemOffset(clamped * itemsPerPage);
    };

const handleSendReminder = (row) => {
    const employeeDbId = row?.employee_id;

    if (!employeeDbId) {
        openConfirm({
            title: 'Cannot send reminder',
            message: 'Missing employee record id.',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: null,
        });
        return;
    }

    const progress = row?.progress || computeRowProgress({ checklistItems: row?.checklistItems || [] });
    const missing = progress.missing || [];
    const needsReupload = progress.needsReupload || [];

    const lineParts = [];
    if (missing.length) lineParts.push(`Missing: ${missing.slice(0, 8).join(', ')}${missing.length > 8 ? '…' : ''}`);
    if (needsReupload.length) lineParts.push(`Needs re-upload: ${needsReupload.slice(0, 8).join(', ')}${needsReupload.length > 8 ? '…' : ''}`);

    setSendReminderState({
        open: true,
        title: 'Send Reminder',
        message: [
            `Send a reminder email to ${row?.id || row?.email || 'this employee'}?`,
            lineParts.length ? lineParts.join('') : 'No missing documents detected based on current checklist.',
        ].join(''),
        row,
    });
};

// openPreviewForItem moved into ModalFiles component for proper access to state

    const handleGenerateReport = ({ startDate, endDate, fileType, category } = {}) => {
        const base = (startDate || endDate)
            ? filterRowsByDateRange(visibleRows, (r) => r?.hireDate, startDate, endDate)
            : visibleRows;

        const cat = category || 'all';
        const rowsForExport = base.filter((r) => {
            const completion = String(r?.progress?.completion || r?.remarks || 'INCOMPLETE');
            const p = String(r?.personnelType || '');
            if (cat === 'complete') return completion === 'COMPLETE';
            if (cat === 'incomplete') return completion !== 'COMPLETE';
            if (cat === 'project_based') return isProjectBased(p);
            if (cat === 'standard') return !isProjectBased(p);
            return true;
        });

        const stamp = new Date().toISOString().slice(0, 10);
        const upperType = String(fileType || 'XLSX').toUpperCase();
        const isCsv = upperType === 'CSV';
        const isPdf = upperType === 'PDF';
        const ext = isPdf ? 'pdf' : isCsv ? 'csv' : 'xlsx';
        const filename = `201-files-report-${cat}-${stamp}.${ext}`;

        post('/audit-logs/reports', {
            report_name: '201 Files Report',
            filename,
            start_date: startDate || null,
            end_date: endDate || null,
            row_count: rowsForExport.length,
            source: '201-files',
        }).catch(() => {
            // best-effort only
        });

        const columns = [
            { header: 'Employee ID', value: (r) => r.id },
            { header: 'Name', value: (r) => r.name },
            { header: 'Personnel Type', value: (r) => r.personnelType },
            { header: 'Hire Date', value: (r) => r.hireDate },
            {
                header: 'Progress',
                value: (r) => {
                    const p = r?.progress || computeRowProgress({ checklistItems: r?.checklistItems || [] });
                    return `${p.uploaded}/${p.total}`;
                }
            },
            {
                header: 'Missing',
                value: (r) => {
                    const p = r?.progress || computeRowProgress({ checklistItems: r?.checklistItems || [] });
                    return (p.missing || []).join(', ');
                }
            },
        ];

        if (isPdf) {
            const completeCount = rowsForExport.filter((r) => String(r?.progress?.completion || r?.remarks || 'INCOMPLETE') === 'COMPLETE').length;
            const incompleteCount = rowsForExport.length - completeCount;
            const projectBasedCount = rowsForExport.filter((r) => isProjectBased(r?.personnelType)).length;
            const standardCount = rowsForExport.length - projectBasedCount;

            exportReportToPdf({
                filename,
                title: '201 Files Report',
                summaryLines: [
                    `Category: ${cat}`,
                    startDate || endDate ? `Range: ${startDate || '…'} to ${endDate || '…'}` : 'Range: All time',
                    `Complete: ${completeCount} | Incomplete: ${incompleteCount}`,
                    `Standard: ${standardCount} | Project-Based: ${projectBasedCount}`,
                ],
                columns,
                rows: rowsForExport,
            }).catch(() => {
                // best-effort only
            });
        } else if (isCsv) {
            exportRowsToCsv({ filename, columns, rows: rowsForExport });
        } else {
            exportRowsToXlsx({ filename, sheetName: '201 Files', columns, rows: rowsForExport });
        }

        setReportOpen(false);
    };

    return (
        <div>
            <Navbar />

            <div className="p-7 lg:mx-18 md:mx-10">
                <div className="md:flex justify-between items-center w-full">
                    <div>
                        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">201 Files</h1>
                    </div>

                    <div className="flex items-center justify-end md:gap-4 gap-3">
                        {!isEmployee ? (
                            <DropDownFilter
                                label="Status"
                                value={statusFilter}
                                onChange={setStatusFilter}
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'incomplete', label: 'Incomplete' },
                                    { value: 'complete', label: 'Complete' },
                                ]}
                            />
                        ) : null}

                        {/* Sort dropdown removed: headers are now clickable for sorting */}

                        {!isEmployee ? (
                            <DropDownFilter
                                label="Personnel Type"
                                value={personnelTypeFilter}
                                onChange={setPersonnelTypeFilter}
                                options={[
                                    { value: 'all', label: 'All' },
                                    { value: 'employees', label: 'Employees' },
                                    { value: 'project_based', label: 'Project-Based' },
                                ]}
                            />
                        ) : null}

                        <div className="relative text-gray-600 border border-[#990100] rounded-lg">
                            <input
                                type="search"
                                name="search"
                                placeholder="Search"
                                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            <button
                                type="button"
                                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
                            >
                                <img src="/icons/red-search.png" className="lg:w-5 lg:h-5 w-4 h-4 items-center" alt="search" />
                            </button>
                        </div>
                    </div>
                </div>

                <hr className="text-[#990100] mt-6" />

                {isEmployee ? (
                    <div className="div-table">
                        {loading && <div className="text-sm text-gray-600 mb-3">Loading your 201 Files…</div>}

                        {rows.length === 0 ? (
                            <div className="text-sm text-gray-600">No 201 files found.</div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between">
                                    <p className="text-sm text-gray-600">Upload and track your required documents.</p>
                                    <button
                                        type="button"
                                        className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[7px] rounded-md hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                        onClick={() => {
                                            setViewEmployeeFiles(rows[0]);
                                            setModalOpen((prev) => !prev);
                                        }}
                                    >
                                        {isModalOpen ? 'Hide Checklist' : 'Show Checklist'}
                                    </button>
                                </div>

                                <ModalFiles
                                    isOpen={isModalOpen}
                                    onClose={handleClose}
                                    employeeFiles={viewEmployeeFiles}
                                    isEmployee={isEmployee}
                                    refresh={fetchRows}
                                    variant="inline"
                                />
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="flex justify-end mt-5">
                            <button className="generate-report-button" onClick={() => setReportOpen(true)}>
                                Generate Report
                            </button>
                        </div>

                        <ReportModal
                            open={reportOpen}
                            title="Generate Report - 201 Files"
                            onClose={() => setReportOpen(false)}
                            onGenerate={handleGenerateReport}
                            enableDateRange={true}
                            fileTypes={['XLSX', 'CSV', 'PDF']}
                            categoryOptions={[
                                { value: 'all', label: 'All' },
                                { value: 'complete', label: 'Complete Only' },
                                { value: 'incomplete', label: 'Incomplete Only' },
                                { value: 'standard', label: 'Standard Only' },
                                { value: 'project_based', label: 'Project-Based Only' },
                            ]}
                            defaultCategory="all"
                        />

                        <div className="div-table">
                            <table className="table-style">
                                <thead className="thead-style">
                                    <tr>
                                            <th className="th-style rounded-tl-lg rounded-bl-lg cursor-pointer" onClick={() => toggleSort('employee_id')}>
                                                Employee ID {sortOrder.startsWith('employee_id_') ? (sortOrder === 'employee_id_asc' ? '▲' : '▼') : null}
                                            </th>
                                            <th className="th-style cursor-pointer" onClick={() => toggleSort('name')}>
                                                Name {sortOrder.startsWith('name_') ? (sortOrder === 'name_az' ? '▲' : '▼') : null}
                                            </th>
                                            <th className="th-style cursor-pointer" onClick={() => toggleSort('personnel_type')}>
                                                Personnel Type {sortOrder.startsWith('personnel_type_') ? (sortOrder === 'personnel_type_employee_first' ? '▲' : '▼') : null}
                                            </th>
                                            <th className="th-style cursor-pointer" onClick={() => toggleSort('hire_date')}>
                                                Hire Date {sortOrder.startsWith('hire_date_') ? (sortOrder === 'hire_date_oldest' ? '▲' : '▼') : null}
                                            </th>
                                            <th className="th-style cursor-pointer" onClick={() => toggleSort('completion')}>
                                                Progress {sortOrder.startsWith('completion_') ? (sortOrder === 'completion_complete_first' ? '▲' : '▼') : null}
                                            </th>
                                            <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                                        </tr>
                                </thead>
                                <tbody className="tbody-style">
                                    {visibleRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                No employees found
                                            </td>
                                        </tr>
                                    ) : (
                                        currentRows.map((row) => {
                                            const p = row?.progress || computeRowProgress({ checklistItems: row?.checklistItems || [] });
                                            const percent = p.total ? Math.round((p.uploaded / p.total) * 100) : 0;
                                            const isComplete = String(p.completion) === 'COMPLETE';
                                            const tooltipLines = [
                                                p.missing?.length ? `Missing: ${p.missing.join(', ')}` : null,
                                                p.needsReupload?.length ? `Needs re-upload: ${p.needsReupload.join(', ')}` : null,
                                            ].filter(Boolean);

                                            return (
                                                <tr key={row.id} className="tr-style">
                                                    <td className="td-style font-medium">{row.id}</td>
                                                    <td className="td-style">{row.name}</td>
                                                    <td className="td-style">{row.personnelType}</td>
                                                    <td className="td-style">{row.hireDate}</td>
                                                    <td className="td-style">
                                                        <div className="relative inline-flex flex-col gap-1 group">
                                                            <div className={`text-xs font-semibold ${isComplete ? 'text-[#198C19]' : 'text-[#990100]'}`}>
                                                                {p.uploaded}/{p.total} Files
                                                            </div>
                                                            <div className="w-28 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                                <div
                                                                    className={`h-full ${isComplete ? 'bg-[#198C19]' : 'bg-[#F59E0B]'}`}
                                                                    style={{ width: `${percent}%` }}
                                                                />
                                                            </div>

                                                            {tooltipLines.length ? (
                                                                <div className="absolute left-0 top-0 -translate-y-[110%] z-50 hidden group-hover:block">
                                                                    <div className="max-w-xs rounded-lg border border-gray-200 bg-white shadow-lg px-3 py-2 text-[11px] text-gray-800">
                                                                        {tooltipLines.map((line, idx) => (
                                                                            <div key={idx} className="whitespace-normal wrap-break-word">
                                                                                {line}
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            ) : null}
                                                        </div>
                                                    </td>
                                                    <td className="td-style">
                                                        <div className="flex items-center gap-2">
                                                            <button
                                                                type="button"
                                                                className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                                                onClick={() => handleOpen(row)}
                                                            >
                                                                View Details
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-[#990100] text-[#990100] hover:bg-[#990100] hover:text-white transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                                                                title="Send reminder email"
                                                                aria-label="Send reminder"
                                                                disabled={!!reminderBusyByEmployeeId[row?.employee_id]}
                                                                onClick={() => handleSendReminder(row)}
                                                            >
                                                                {reminderBusyByEmployeeId[row?.employee_id] ? (
                                                                    <span className="text-xs">…</span>
                                                                ) : (
                                                                    <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
                                                                        <path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22Zm7-6V11a7 7 0 0 0-5-6.7V3a2 2 0 1 0-4 0v1.3A7 7 0 0 0 5 11v5l-2 2v1h20v-1l-2-2Z" />
                                                                    </svg>
                                                                )}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>

                            <ModalFiles
                                isOpen={isModalOpen}
                                onClose={handleClose}
                                employeeFiles={viewEmployeeFiles}
                                isEmployee={false}
                                refresh={fetchRows}
                            />

                            <br />
                            <div className="lg:flex items-center lg:justify-between">
                                <p className="lg:text-md text-sm">
                                    Showing <b>{currentRows.length}</b> of <b>{visibleRows.length}</b> employee{visibleRows.length !== 1 ? 's' : ''}
                                </p>

                                {pageCount > 1 && (
                                    <ReactPaginate
                                        breakLabel="..."
                                        nextLabel=">"
                                        onPageChange={handlePageClick}
                                        pageRangeDisplayed={2}
                                        pageCount={pageCount}
                                        forcePage={Math.min(Math.max(0, Math.floor(itemOffset / itemsPerPage)), Math.max(0, pageCount - 1))}
                                        previousLabel="<"
                                        renderOnZeroPageCount={null}
                                        marginPagesDisplayed={2}
                                        pageClassName=""
                                        pageLinkClassName="cursor-pointer hover:text-gray-500 hover:underline"
                                        previousClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                                        previousLinkClassName="page-link"
                                        nextClassName={multiPages ? "cursor-pointer hover:text-gray-500 hover:underline" : "text-gray-400 cursor-not-allowed pointer-events-none"}
                                        nextLinkClassName="page-link"
                                        breakClassName="page-item"
                                        breakLinkClassName="page-link"
                                        containerClassName="flex items-center space-x-2 lg:pt-0 pt-4 text-[#990100]"
                                        activeClassName="underline font-medium"
                                    />
                                )}
                            </div>
                        </div>
                    </>
                )}
            </div>


<SendReminderModal
    open={sendReminderState.open}
    title={sendReminderState.title}
    message={sendReminderState.message}
    sending={!!reminderBusyByEmployeeId[sendReminderState?.row?.employee_id]}
    onClose={() => setSendReminderState((p) => ({ ...p, open: false, row: null }))}
    onSend={async () => {
        const row = sendReminderState.row;
        const employeeDbId = row?.employee_id;
        if (!employeeDbId) return;

        setReminderBusyByEmployeeId((p) => ({ ...p, [employeeDbId]: true }));
        try {
            const res = await post(`/onboarding/employee/${employeeDbId}/remind-missing`);

            const emailStatus = (() => {
                const e = res?.data?.email;
                if (!e) return null;
                if (e.skipped) return `Email: skipped (${e.reason || 'SMTP not configured'})`;
                if (e.error) return `Email: failed (${e.error})`;
                return 'Email: sent';
            })();

            setSendReminderState((p) => ({ ...p, open: false, row: null }));

                openConfirm({
                title: 'Reminder processed',
                message: [
                    `Employee: ${row?.id || row?.email || ''}`.trim(),
                    emailStatus,
                    res?.data?.missing?.length ? `Missing: ${res.data.missing.join(', ')}` : null,
                    res?.data?.needsReupload?.length ? `Needs re-upload: ${res.data.needsReupload.join(', ')}` : null,
                ].filter(Boolean).join('\n'),
                confirmText: 'OK',
                cancelText: null,
                onConfirm: null,
            });
        } finally {
            setReminderBusyByEmployeeId((p) => {
                const next = { ...p };
                delete next[employeeDbId];
                return next;
            });
        }
    }}
/>

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
        </div>
    );
}
