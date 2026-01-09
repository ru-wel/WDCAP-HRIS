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
      <div className="relative w-full max-w-2xl bg-white rounded-lg shadow-xl border border-gray-300 overflow-hidden max-h-[95vh] flex flex-col">
        <div className="bg-[#990100] text-white px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between flex-shrink-0">
          <h2 className="text-base sm:text-lg font-semibold">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-white text-2xl leading-none hover:opacity-80"
            aria-label="Close"
          >
            ×
          </button>
        </div>
        <div className="px-4 sm:px-8 lg:px-10 py-6 sm:py-8 overflow-y-auto">{children}</div>
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
}) {
  const [preset, setPreset] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [fileType, setFileType] = useState('XLSX');

  const presets = useMemo(
    () => [
      { value: 'all', label: 'All Time' },
      { value: 'today', label: 'Today' },
      { value: 'week', label: 'This Week' },
      { value: 'month', label: 'This Month' },
      { value: 'custom', label: 'Custom Range' },
    ],
    []
  );

  useEffect(() => {
    if (!open) return;
    setFileType('XLSX');
    setPreset('all');
    setStartDate('');
    setEndDate('');
  }, [open]);

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

  return (
    <ModalShell open={open} title={title || 'Generate Report'} onClose={onClose}>
      <div className="space-y-5">
        <div className="grid grid-cols-[140px_1fr] items-center gap-4 text-sm">
          <div className="text-right font-semibold">File Type:</div>
          <select
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-48 bg-white"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          >
            <option value="XLSX">Excel (.xlsx)</option>
            <option value="CSV">CSV</option>
          </select>

          <div className="text-right font-semibold">Range:</div>
          <select
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-48 bg-white"
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
              <div className="text-right font-semibold">Starting Date:</div>
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-48"
                value={startDate}
                onChange={(e) => {
                  setPreset('custom');
                  setStartDate(e.target.value);
                }}
              />

              <div className="text-right font-semibold">End Date:</div>
              <input
                type="date"
                className="border border-gray-300 rounded-md px-3 py-1 text-sm w-48"
                value={endDate}
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

        <div className="flex justify-end pt-2 gap-3">
          <button
            type="button"
            className="bg-[#EDEDED] text-[#990100] text-xs px-5 py-2 rounded-md hover:bg-gray-200 transition duration-300 ease-in-out"
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            type="button"
            className="bg-[#990100] text-white text-xs px-5 py-2 rounded-md hover:bg-[#ad3332] transition duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={!canGenerate}
            onClick={() => onGenerate?.({ preset, startDate, endDate, fileType })}
          >
            Download {fileType === 'XLSX' ? 'Excel' : 'CSV'}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}
