import React, { useMemo } from 'react';

function DropDownFilter({
  label = 'Sort By',
  value,
  onChange,
  options,
  disabled = false,
}) {
  const resolvedOptions = useMemo(() => {
    const fallback = [
      { value: 'az', label: 'A - Z' },
      { value: 'za', label: 'Z - A' },
    ];
    return Array.isArray(options) && options.length ? options : fallback;
  }, [options]);

  const selectedLabel = useMemo(() => {
    const opt = resolvedOptions.find((o) => o.value === value);
    return opt ? opt.label : null;
  }, [resolvedOptions, value]);

  return (
    <div className="left-align">
      {/* Header row (keeps the "label" behavior similar to dropdown) */}
      <div className="mb-2 flex items-center gap-3">
        <p className="text-xs md:text-sm text-gray-600">{label}: </p>
        <p className="text-xs md:text-sm text-[#990100] font-medium truncate uppercase">
          {selectedLabel || ''}
        </p>
      </div>

      {/* Chips */}
      <div
        className={`flex flex-wrap items-center gap-2 ${
          disabled ? 'opacity-60 pointer-events-none' : ''
        }`}
        role="listbox"
        aria-disabled={disabled}
      >
        {resolvedOptions.map((opt) => {
          const isActive = value === opt.value;

          return (
            <button
              key={String(opt.value)}
              type="button"
              role="option"
              aria-selected={isActive}
              disabled={disabled}
              onClick={() => onChange?.(opt.value)}
              className={[
                'rounded-full border px-4 py-2 text-xs md:text-sm',
                'transition duration-200 ease-in-out cursor-pointer',
                'hover:scale-105',
                isActive
                  ? 'bg-[#990100] border-[#990100] text-white shadow-sm'
                  : 'bg-white border-[#990100] text-[#990100] hover:bg-[#990100]/5',
              ].join(' ')}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default DropDownFilter;