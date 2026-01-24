import React, { useEffect, useMemo, useState } from 'react';

function ModalShell({ open, title, onClose, children }) {
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} aria-hidden="true" />
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl overflow-hidden max-h-[95vh] flex flex-col">
        <div className="bg-[#990100] text-white py-2 sm:py-3 px-3 sm:px-4 m-4 rounded-xl flex items-center justify-between flex-shrink-0">
          <h2 className="text-sm sm:text-base lg:text-lg font-medium">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-2xl leading-none hover:scale-110 transition"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
        <div className="px-4 sm:px-8 lg:px-10 pb-5 pt-2  overflow-y-auto" data-lenis-prevent>{children}</div>
      </div>
    </div>
  );
}

const toIsoDate = (d) => {
  const date = d instanceof Date ? d : new Date(d);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const startOfWeekIso = (now) => {
  const d = new Date(now);
  const day = d.getDay(); // 0 Sun .. 6 Sat
  const diffToMonday = (day + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  return toIsoDate(d);
};

const endOfWeekIso = (now) => {
  const d = new Date(`${startOfWeekIso(now)}T00:00:00`);
  d.setDate(d.getDate() + 6);
  return toIsoDate(d);
};

const startOfMonthIso = (now) => {
  const d = new Date(now);
  d.setDate(1);
  return toIsoDate(d);
};

const endOfMonthIso = (now) => {
  const d = new Date(now);
  d.setMonth(d.getMonth() + 1);
  d.setDate(0);
  return toIsoDate(d);
};

export default function ReportModal({
  open,
  title,
  onClose,
  onGenerate,
  enableDateRange = true,
  fileTypes = ['XLSX', 'CSV'],
  categoryOptions = null,
  defaultCategory = '',
}) {
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileType, setFileType] = useState('XLSX');
  const [category, setCategory] = useState('');

  const normalizedFileTypes = useMemo(() => {
    const incoming = Array.isArray(fileTypes) ? fileTypes : ['XLSX', 'CSV'];
    const unique = Array.from(new Set(incoming.map((t) => String(t || '').toUpperCase()).filter(Boolean)));
    return unique.length ? unique : ['XLSX', 'CSV'];
  }, [fileTypes]);

  const normalizedCategories = useMemo(() => {
    if (!Array.isArray(categoryOptions) || categoryOptions.length === 0) return [];
    return categoryOptions
      .map((c) => ({
        value: String(c?.value ?? ''),
        label: String(c?.label ?? c?.value ?? ''),
      }))
      .filter((c) => c.value && c.label);
  }, [categoryOptions]);

  const presets = useMemo(
    () => [
      { value: '', label: 'Select Range' },
      { value: 'all', label: 'All' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'custom', label: 'Custom Range' },
    ],
    []
  );

  useEffect(() => {
    if (!open) return;
    setFileType(normalizedFileTypes.includes('XLSX') ? 'XLSX' : normalizedFileTypes[0]);
    setPreset('');
    setStartDate('');
    setEndDate('');
    if (normalizedCategories.length) {
      const initial =
        normalizedCategories.find((c) => c.value === defaultCategory)?.value ||
        normalizedCategories[0].value;
      setCategory(initial);
    } else {
      setCategory('');
    }
  }, [open, normalizedFileTypes, normalizedCategories, defaultCategory]);

  useEffect(() => {
    if (!open) return;
    if (!enableDateRange) return;

    const now = new Date();

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'today') {
      const iso = toIsoDate(now);
      setStartDate(iso);
      setEndDate(iso);
    } else if (preset === 'week') {
      setStartDate(startOfWeekIso(now));
      setEndDate(endOfWeekIso(now));
    } else if (preset === 'month') {
      setStartDate(startOfMonthIso(now));
      setEndDate(endOfMonthIso(now));
    }
  }, [preset, open, enableDateRange]);

  const canGenerate = (!enableDateRange || preset === 'all' || (startDate && endDate));

  const fileTypeLabel = (t) => {
    const v = String(t || '').toUpperCase();
    if (v === 'XLSX') return 'Excel (.xlsx)';
    if (v === 'CSV') return 'CSV';
    if (v === 'PDF') return 'PDF';
    return v;
  };

  const downloadLabel = () => {
    const v = String(fileType || '').toUpperCase();
    if (v === 'XLSX') return 'Excel';
    if (v === 'CSV') return 'CSV';
    if (v === 'PDF') return 'PDF';
    return v;
  };

  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const maxDate = `${yyyy}-${mm}-${dd}`;

  return (
    <ModalShell open={open} title={title || 'Generate Report'} onClose={onClose}>
      <div className="space-y-5 flex justify-center">
        <div className="items-center gap-4 lg:text-sm text-xs">
          {normalizedCategories.length ? (
            <>
              <div className="font-semibold pb-1.5 ">Report Category:</div>
              <select
                className="modal-employees-field cursor-pointer"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
              >
                {normalizedCategories.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </>
          ) : null}

          <div className="font-semibold pt-2 pb-1.5">File Type:</div>
          <select
            className="modal-employees-field cursor-pointer"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          >
            {normalizedFileTypes.map((t) => (
              <option key={t} value={t}>
                {fileTypeLabel(t)}
              </option>
            ))}
          </select>

          <div className="pt-2 pb-1.5 font-semibold">Range:</div>
          <select
            className="modal-employees-field cursor-pointer"
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            disabled={!enableDateRange}
          >
            {presets.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>

          {enableDateRange && (
            <>
              <div className="pt-2 pb-1.5 font-semibold">Starting Date:</div>
              <input
                type="date"
                className="modal-employees-field cursor-pointer"
                value={startDate}
                max = {maxDate}
                onChange={(e) => {
                  setPreset('custom');
                  setStartDate(e.target.value);
                }}
              />

              <div className="pt-2 pb-1.5 font-semibold">End Date:</div>
              <input
                type="date"
                className="modal-employees-field cursor-pointer"
                value={endDate}
                max = {maxDate}
                onChange={(e) => {
                  setPreset('custom');
                  setEndDate(e.target.value);
                }}
                min={startDate || undefined}
              />
            </>
          )}
        </div>

        {!enableDateRange && (
          <div className="text-xs text-gray-600">
            Date modifiers are not available for this report.
          </div>
        )}
      </div>

      <div className="flex justify-end lg:pt-7 pt-5  gap-3">
          <button
            type="button"
            className="bg-[#C60000] lg:px-5 py-[7px] px-4 py lg:text-[15px] text-xs rounded-md text-white hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-[#198C19] lg:px-5 py-[7px] px-4 lg:text-[15px] text-xs rounded-md text-white hover:bg-[#46a346] hover:scale-105 transition duration-300 ease-in-out cursor-pointer"
            disabled={!canGenerate}
            onClick={() => onGenerate?.({ preset, startDate, endDate, fileType, category })}
          >
            Download {downloadLabel()}
          </button>
      </div>

    </ModalShell>
  );
}
