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

const SECTION_BREAKS = new Set([DOCUMENT_TYPES.SSS, DOCUMENT_TYPES.PHILHEALTH, DOCUMENT_TYPES.PAG_IBIG]);

const EMPLOYEE_VISIBLE_DOCS = new Set([
    DOCUMENT_TYPES.OTHERS,
    DOCUMENT_TYPES.EMPLOYEE_CONTRACT,
    DOCUMENT_TYPES.APPLICATION_FOR_EMPLOYMENT,
    DOCUMENT_TYPES.PERSONAL_DATA_SHEET,
    DOCUMENT_TYPES.SSS,
    DOCUMENT_TYPES.PHILHEALTH,
    DOCUMENT_TYPES.PAG_IBIG,
    DOCUMENT_TYPES.RESUME_CV,
    DOCUMENT_TYPES.NDA,
    DOCUMENT_TYPES.DIPLOMA,
    DOCUMENT_TYPES.TOR,
    DOCUMENT_TYPES.DRIVERS_LICENSE,
    DOCUMENT_TYPES.PRC_ID,
]);

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

const mapItemNameToDocumentName = (itemName) => {
    const normalized = normalizeDocName(itemName);
    return allowedDocumentTypeByNormalized.get(normalized) || DOCUMENT_TYPES.OTHERS;
};

const mapStatusToUi = (status) => {
    const v = String(status || '').toLowerCase();
    if (v === 'rejected') return 'disapproved';
    return v || 'pending';
};

const mapUiToApiStatus = (uiStatus) => {
    const v = String(uiStatus || '').toLowerCase();
    if (v === 'disapproved') return 'rejected';
    return v;
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
            const fileName = json?.data?.fileName || fallbackName;

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

                    const mimeType = fileRes.headers.get('content-type') || '';
                    const blob = await fileRes.blob();
                    const objectUrl = URL.createObjectURL(blob);
                    onPreview({ url: objectUrl, fileName, mimeType, revokeUrlOnClose: true });
                    return;
                }

                onPreview({
                    url: previewUrl,
                    fileName,
                    mimeType: json?.data?.mimeType || '',
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

const PreviewModal = ({ open, title, url, mimeType, loading, onClose, allowImageActions, onReplaceImage, onDeleteFile }) => {
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

    return (
        <div
            className="fixed inset-0 z-[1100] flex items-center justify-center bg-black/40 px-4"
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
                        {canShowImageActions ? (
                            <>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
                                    onClick={() => onReplaceImage?.()}
                                >
                                    Change Image
                                </button>
                                <button
                                    type="button"
                                    className="px-4 py-2 rounded-full text-sm bg-gray-200 text-gray-900 hover:bg-gray-300 transition cursor-pointer"
                                    onClick={() => onDeleteFile?.()}
                                >
                                    Delete
                                </button>
                            </>
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
    });

    const [replacePickerKey, setReplacePickerKey] = useState(0);

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
            };
        });
    };

    const triggerReplaceFromPreview = () => {
        if (!previewState?.documentId || !previewState?.checklistItemId) return;
        setReplacePickerKey((k) => k + 1);
        const el = document.getElementById('preview-replace-file');
        el?.click?.();
    };

    const handleReplaceFromPreview = async (file) => {
        if (!file) return;

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

                if (!empDbId || !docName || !checklistItemId) {
                    throw new Error('Missing upload context for replace');
                }

                const fd = new FormData();
                fd.append('file', file);
                fd.append('employee_id', empDbId);
                fd.append('document_name', docName);
                fd.append('checklist_item_id', checklistItemId);
                await postFormWithProgress('/documents/upload', fd, () => {});
                await refresh();
                closePreview();
            },
        });
    };

    const handleDeleteFromPreview = () => {
        const documentId = previewState?.documentId;
        if (!documentId) return;

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

    const checklist = employeeFiles?.checklistItems || [];

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
            await refresh();
        } catch (err) {
            console.error('Save failed:', err);
            notify({ title: 'Save failed', message: err?.message || 'Save failed' });
        } finally {
            setSavingReviewId(null);
        }
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

    return (
        <div
            className={
                isInline
                    ? "mt-4"
                    : "fixed inset-0 flex items-center justify-center z-[1000] bg-[#EDEDED]/50 px-3 py-4"
            }
        >
            <div
                className={
                    isInline
                        ? "bg-white rounded-lg shadow-lg w-full border border-gray-300 overflow-hidden flex flex-col"
                        : "bg-white rounded-lg shadow-lg w-full max-w-6xl border border-gray-300 overflow-hidden flex flex-col max-h-[90vh]"
                }
                style={{ WebkitOverflowScrolling: 'touch' }}
            >
                <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4 m-4">
                    <h1 className="text-white text-lg font-medium lg:text-lg text-sm">201 Files of {employeeFiles.id}</h1>
                    <button className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className="flex-1 overflow-auto md:p-6 px-3 py-2" style={{ WebkitOverflowScrolling: 'touch' }}>
                    <div className="overflow-x-auto">
                    <table className="table-style text-center">
                        <thead>
                            <tr>
                                <th></th>
                                <th className="px-6 py-3 text-sm">File</th>
                                <th className="px-6 py-3 text-sm">Status</th>
                                <th className="px-6 py-3 text-sm">Comments</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentChecklist.map((it) => (
                                <React.Fragment key={it.id}>
                                    {SECTION_BREAKS.has(it.item_name) && renderSectionHeaderRow('BENEFITS')}
                                    <tr>
                                        <td className="text-left font-semibold pb-5 px-3 lg:text-sm text-xs whitespace-normal break-words">{it.item_name}</td>
                                        <td className="pb-5 px-3">
                                            {it.document_id ? (
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        type="button"
                                                        disabled={!isEmployee && !editData}
                                                        className={`border px-4 py-1 rounded-lg shadow-md w-full lg:text-sm text-xs overflow-hidden cursor-pointer ${
                                                            !isEmployee && !editData
                                                                ? 'opacity-60 cursor-not-allowed'
                                                                : 'cursor-pointer hover:border-gray-400 hover:text-[#990100] hover:underline'
                                                        }`}
                                                        onClick={() => {
                                                            if (!isEmployee && !editData) {
                                                                notify({
                                                                    title: 'Preview locked',
                                                                    message: 'Click “Update Record” first before previewing 201 files.'
                                                                });
                                                                return;
                                                            }

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
                                                                checklistItemId: it.id,
                                                                employeeDbId: employeeFiles.employee_id,
                                                                documentName: mapItemNameToDocumentName(it.item_name),
                                                            });

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
                                                                    checklistItemId: it.id,
                                                                    employeeDbId: employeeFiles.employee_id,
                                                                    documentName: mapItemNameToDocumentName(it.item_name),
                                                                }));
                                                            }).catch(() => {
                                                                setPreviewState((prev) => ({ ...prev, loading: false }));
                                                            });
                                                        }}
                                                    >
                                                        Preview
                                                    </button>

                                                    {isEmployee && mapStatusToUi(statusById[it.id] || it.status) === 'disapproved' ? (
                                                        <div className="pt-2 flex flex-col items-center gap-1">
                                                            <input
                                                                id={`file-${it.id}`}
                                                                type="file"
                                                                className="hidden"
                                                                disabled={uploadingId === it.id}
                                                                onChange={async (e) => {
                                                                    const f = e.target.files?.[0];
                                                                    if (!f) return;

                                                                    setSelectedFileNameById((p) => ({ ...p, [it.id]: f.name }));
                                                                    setSelectedFileById((p) => ({ ...p, [it.id]: f }));

                                                                    if (f.size > 10 * 1024 * 1024) {
                                                                        notify({ title: 'File too large', message: 'File is too large. Maximum size is 10MB.' });
                                                                        setSelectedFileNameById((p) => ({ ...p, [it.id]: '' }));
                                                                        setSelectedFileById((p) => ({ ...p, [it.id]: null }));
                                                                        e.target.value = '';
                                                                        return;
                                                                    }

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
                                                                                fd.append('document_name', mapItemNameToDocumentName(it.item_name));
                                                                                fd.append('checklist_item_id', it.id);
                                                                                await postFormWithProgress(
                                                                                    '/documents/upload',
                                                                                    fd,
                                                                                    () => {}
                                                                                );
                                                                                await refresh();
                                                                                setSelectedFileNameById((p) => ({ ...p, [it.id]: '' }));
                                                                                setSelectedFileById((p) => ({ ...p, [it.id]: null }));
                                                                                e.target.value = '';
                                                                            } catch (err) {
                                                                                console.error('Reupload failed:', err);
                                                                                notify({ title: 'Upload failed', message: err?.message || 'Reupload failed' });
                                                                            } finally {
                                                                                setUploadingId(null);
                                                                            }
                                                                        },
                                                                    });
                                                                }}
                                                            />

                                                            <div className="flex items-center gap-2 w-full justify-center">
                                                                <label
                                                                    htmlFor={`file-${it.id}`}
                                                                    className={`bg-[#990100] text-white lg:text-sm text-xs px-3 py-[6px] rounded-md hover:bg-[#ad3332] transition duration-300 ease-in-out cursor-pointer ${
                                                                        uploadingId === it.id ? 'opacity-60 pointer-events-none' : ''
                                                                    }`}
                                                                >
                                                                    {uploadingId === it.id ? 'Uploading…' : 'Reupload File'}
                                                                </label>
                                                                <span className="text-xs text-gray-600 truncate max-w-44">
                                                                    {selectedFileNameById[it.id] || 'No file selected'}
                                                                </span>
                                                            </div>

                                                            <div className="w-full max-w-xs">
                                                                <LocalFilePreview file={selectedFileById[it.id]} />
                                                            </div>
                                                        </div>
                                                    ) : null}
                                                </div>
                                            ) : isEmployee ? (
                                                <div className="flex flex-col items-center gap-1">
                                                    <input
                                                        id={`file-${it.id}`}
                                                        type="file"
                                                        className="hidden"
                                                        disabled={uploadingId === it.id}
                                                        onChange={async (e) => {
                                                            const f = e.target.files?.[0];
                                                            if (!f) return;

                                                            setSelectedFileNameById((p) => ({ ...p, [it.id]: f.name }));
                                                            setSelectedFileById((p) => ({ ...p, [it.id]: f }));

                                                            if (f.size > 10 * 1024 * 1024) {
                                                                notify({ title: 'File too large', message: 'File is too large. Maximum size is 10MB.' });
                                                                setSelectedFileNameById((p) => ({ ...p, [it.id]: '' }));
                                                                setSelectedFileById((p) => ({ ...p, [it.id]: null }));
                                                                e.target.value = '';
                                                                return;
                                                            }

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
                                                                        fd.append('document_name', mapItemNameToDocumentName(it.item_name));
                                                                        fd.append('checklist_item_id', it.id);
                                                                        await postFormWithProgress(
                                                                            '/documents/upload',
                                                                            fd,
                                                                            () => {}
                                                                        );
                                                                        await refresh();
                                                                        setSelectedFileNameById((p) => ({ ...p, [it.id]: '' }));
                                                                        setSelectedFileById((p) => ({ ...p, [it.id]: null }));
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

                                                    <div className="flex items-center gap-2 w-full justify-center">
                                                        <label
                                                            htmlFor={`file-${it.id}`}
                                                            className={`bg-[#990100] text-white lg:text-sm text-xs px-3 py-[6px] rounded-md hover:bg-[#ad3332] transition duration-300 ease-in-out cursor-pointer ${
                                                                uploadingId === it.id ? 'opacity-60 pointer-events-none' : ''
                                                            }`}
                                                        >
                                                            {uploadingId === it.id ? 'Uploading…' : 'Choose File'}
                                                        </label>
                                                        <span className="text-xs text-gray-600 truncate max-w-44">
                                                            {selectedFileNameById[it.id] || 'No file selected'}
                                                        </span>
                                                    </div>

                                                    <div className="w-full max-w-xs">
                                                        <LocalFilePreview file={selectedFileById[it.id]} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-gray-500 text-xs">No file</span>
                                            )}
                                        </td>
                                        <td className="pb-5 px-3">
                                            {(!editData || isEmployee) ? (
                                                <span className="inline-block text-xs px-2 py-1 rounded-full border border-gray-300 text-gray-700">
                                                    {(statusById[it.id] || 'pending').replace(/^./, (c) => c.toUpperCase())}
                                                </span>
                                            ) : (
                                                <select
                                                    className="input-field disabled:text-gray-600 lg:py-1.5 lg:px-2 p-1 lg:text-sm text-xs w-full max-w-36"
                                                    value={statusById[it.id] || 'pending'}
                                                    disabled={isEmployee || !editData}
                                                    onChange={(e) => setStatusById((p) => ({ ...p, [it.id]: e.target.value }))}
                                                    required
                                                >
                                                    <option value="pending">Pending</option>
                                                    <option value="submitted">Submitted</option>
                                                    <option value="approved">Approved</option>
                                                    <option value="disapproved">Disapproved</option>
                                                </select>
                                            )}
                                        </td>
                                        <td className="pb-5 px-3 whitespace-normal break-words">
                                            {mapStatusToUi(statusById[it.id]) === 'disapproved' && !isEmployee && editData ? (
                                                <textarea
                                                    value={remarksById[it.id] || ''}
                                                    onChange={(e) => setRemarksById((p) => ({ ...p, [it.id]: e.target.value }))}
                                                    placeholder="Reason"
                                                    className="input-field w-full lg:text-sm text-xs"
                                                    maxLength={200}
                                                />
                                            ) : (
                                                <p className="lg:text-sm text-xs text-gray-700 whitespace-normal break-words">{remarksById[it.id] || it.remarks || ''}</p>
                                            )}

                                            {!isEmployee && editData && (
                                                <div className="mt-2 flex justify-end">
                                                    <button
                                                        type="button"
                                                        className="bg-[#FFA500] px-4 py-1 rounded-md text-xs text-white hover:bg-[#ffb732] hover:scale-105 transition duration-300 ease-in-out disabled:opacity-60 disabled:pointer-events-none"
                                                        disabled={savingReviewId === it.id}
                                                        onClick={() =>
                                                            openConfirm({
                                                                message: 'Save this item?',
                                                                confirmText: 'OK',
                                                                cancelText: 'Cancel',
                                                                onConfirm: () => saveReviewForItem(it),
                                                            })
                                                        }
                                                    >
                                                        {savingReviewId === it.id ? 'Saving…' : 'Save'}
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                </React.Fragment>
                            ))}
                        </tbody>
                    </table>
                    </div>

                    <div className="mt-4 lg:flex items-center lg:justify-between">
                        <p className="lg:text-md text-sm">
                            Showing <b>{currentChecklist.length}</b> of <b>{checklist.length}</b> file{checklist.length !== 1 ? 's' : ''} {pageCount ? <> | Page <b>{currentPage}</b> of <b>{pageCount}</b></> : null}

                            Showing <b>{currentChecklist.length}</b> of <b>{checklist.length}</b> file{checklist.length !== 1 ? 's' : ''}
                            {pageCount ? <> | Page <b>{currentPage}</b> of <b>{pageCount}</b></> : null}
                        </p>

                        {checklistPageCount > 0 && (
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
                        allowImageActions
                        onReplaceImage={triggerReplaceFromPreview}
                        onDeleteFile={handleDeleteFromPreview}
                    />

                    <input
                        key={replacePickerKey}
                        id="preview-replace-file"
                        type="file"
                        className="hidden"
                        accept="image/*"
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

    const [reportOpen, setReportOpen] = useState(false);

    const [isModalOpen, setModalOpen] = useState(false);
    const [viewEmployeeFiles, setViewEmployeeFiles] = useState(null);

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
                const checklistItems = data.map((it) => ({
                    id: it.id,
                    employee_id: employeeDbId,
                    item_name: it.onboarding_items?.item_name || '',
                    status: it.status,
                    remarks: it.remarks,
                    document_id: it.documents?.id || it.document_id,
                    file_name: it.documents?.file_name || ''
                })).filter((it) => EMPLOYEE_VISIBLE_DOCS.has(mapItemNameToDocumentName(it.item_name)));

                nextRows = [
                    {
                        id: user?.employee_id || user?.email || 'Me',
                        employee_id: employeeDbId,
                        name: user?.email || 'Me',
                        personnelType: '',
                        hireDate: '',
                        checklistItems,
                        remarks: checklistItems.every((i) => String(i.status).toLowerCase() === 'approved') ? 'COMPLETE' : 'INCOMPLETE'
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
                const employeeId = emp?.employee_id || it.employee_id;
                if (!employeeId) continue;

                if (!byEmployee.has(employeeId)) {
                    byEmployee.set(employeeId, {
                        id: employeeId,
                        employee_id: employeeId,
                        name: `${emp?.first_name || ''} ${emp?.last_name || ''}`.trim(),
                        personnelType: emp?.personnel_type || '',
                        hireDate: emp?.hire_date || '',
                        checklistItems: []
                    });
                }

                byEmployee.get(employeeId).checklistItems.push({
                    id: it.id,
                    employee_id: employeeId,
                    item_name: it.onboarding_items?.item_name || '',
                    status: it.status,
                    remarks: it.remarks,
                    document_id: it.documents?.id || it.document_id,
                    file_name: it.documents?.file_name || ''
                });
            }

            const out = Array.from(byEmployee.values()).map((row) => {
                const complete = row.checklistItems.every((i) => String(i.status).toLowerCase() === 'approved');
                return { ...row, remarks: complete ? 'COMPLETE' : 'INCOMPLETE' };
            });

            nextRows = out;
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

    const visibleRows = useMemo(() => {
        const sorted = [...filteredRows].sort((a, b) => {
            switch (sortOrder) {
                case 'employee_id_asc':
                    return compareText(a?.id, b?.id);
                case 'employee_id_desc':
                    return compareText(b?.id, a?.id);
                case 'name_az':
                    return compareText(a?.name, b?.name);
                case 'name_za':
                    return compareText(b?.name, a?.name);
                case 'personnel_type_az':
                    return compareText(a?.personnelType, b?.personnelType);
                case 'personnel_type_za':
                    return compareText(b?.personnelType, a?.personnelType);
                case 'hire_date_newest':
                    return compareDate(b?.hireDate, a?.hireDate);
                case 'hire_date_oldest':
                    return compareDate(a?.hireDate, b?.hireDate);
                case 'remarks_az':
                    return compareText(a?.remarks, b?.remarks);
                case 'remarks_za':
                    return compareText(b?.remarks, a?.remarks);
                default:
                    return compareText(a?.name, b?.name);
            }
        });
        return sorted;
    }, [filteredRows, sortOrder]);

    const [itemOffset, setItemOffset] = useState(0);
    const itemsPerPage = 10;
    const endOffset = itemOffset + itemsPerPage;
    const currentRows = visibleRows.slice(itemOffset, endOffset);
    const pageCount = Math.ceil(visibleRows.length / itemsPerPage);
    const multiPages = pageCount > 1;

    useEffect(() => {
        setItemOffset(0);
    }, [searchTerm, sortOrder, rows.length]);

    const handlePageClick = (event) => {
        setItemOffset(event.selected * itemsPerPage);
    };

    const handleGenerateReport = ({ startDate, endDate, fileType } = {}) => {
        const rowsForExport = (startDate || endDate)
            ? filterRowsByDateRange(visibleRows, (r) => r?.hireDate, startDate, endDate)
            : visibleRows;

        const stamp = new Date().toISOString().slice(0, 10);
        const isCsv = fileType === 'CSV';
        const filename = `201-files-report-${stamp}.${isCsv ? 'csv' : 'xlsx'}`;

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
            { header: 'Remarks', value: (r) => r.remarks || 'INCOMPLETE' },
        ];

        if (isCsv) {
            exportRowsToCsv({ filename, columns, rows: rowsForExport });
        } else {
            exportRowsToXlsx({ filename, sheetName: '201 Files', columns, rows: rowsForExport });
        }

        setReportOpen(false);
    };

    return (
        <div>
            <Navbar />

            <div className="p-7 lg:mx-[4.5rem] md:mx-10">
                <div className="md:flex justify-between items-center w-full">
                    <div>
                        <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">201 Files</h1>
                    </div>

                    <div className="flex items-center justify-end md:gap-4 gap-3">
                        <DropDownFilter
                            value={sortOrder}
                            onChange={setSortOrder}
                            options={[
                                { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
                                { value: 'employee_id_desc', label: 'Employee ID: Descending' },
                                { value: 'name_az', label: 'Name: A - Z' },
                                { value: 'name_za', label: 'Name: Z - A' },
                                { value: 'personnel_type_az', label: 'Personnel Type: A - Z' },
                                { value: 'personnel_type_za', label: 'Personnel Type: Z - A' },
                                { value: 'hire_date_newest', label: 'Hire Date: Newest' },
                                { value: 'hire_date_oldest', label: 'Hire Date: Oldest' },
                                { value: 'remarks_az', label: 'Remarks: A - Z' },
                                { value: 'remarks_za', label: 'Remarks: Z - A' },
                            ]}
                        />

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
                        {/*<div className="flex justify-end mt-5">
                            <button className="generate-report-button" onClick={() => setReportOpen(true)}>Generate Report</button>
                        </div>*/}

                        <ReportModal
                            open={reportOpen}
                            title="Generate Report - 201 Files"
                            onClose={() => setReportOpen(false)}
                            onGenerate={handleGenerateReport}
                            enableDateRange={true}
                        />

                        <div className="div-table">
                            {/*{loading && <div className="text-sm text-gray-600 mb-3">Loading 201 Files…</div>}*/}
                            <table className="table-style">
                                <thead className="thead-style">
                                    <tr>
                                        <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                                        <th className="th-style">Name</th>
                                        <th className="th-style">Personnel Type</th>
                                        <th className="th-style">Hire Date</th>
                                        <th className="th-style">Remarks</th>
                                        <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="tbody-style">
                                    {filteredRows.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                No employees found
                                            </td>
                                        </tr>
                                    ) : (
                                        currentRows.map((row) => {
                                            const remarks = row.remarks || 'INCOMPLETE';

                                            return (
                                                <tr key={row.id} className="tr-style">
                                                    <td className="td-style font-medium">{row.id}</td>
                                                    <td className="td-style">{row.name}</td>
                                                    <td className="td-style">{row.personnelType}</td>
                                                    <td className="td-style">{row.hireDate}</td>
                                                    <td className="td-style">
                                                        <span
                                                            className={`inline-flex max-w-full items-center justify-center whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold ${
                                                                remarks === 'COMPLETE'
                                                                    ? 'text-[#198C19] bg-[#198C19]/25'
                                                                    : 'text-[#C60000] bg-[#C60000]/25'
                                                            }`}
                                                        >
                                                            <span className="truncate">{remarks}</span>
                                                        </span>
                                                    </td>
                                                    <td className="td-style">
                                                        <button
                                                            type="button"
                                                            className="bg-[#990100] text-white lg:text-sm text-xs px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
                                                            onClick={() => handleOpen(row)}
                                                        >
                                                            View Details
                                                        </button>
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
        </div>
    );
}