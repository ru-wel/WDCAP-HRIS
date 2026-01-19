import React, { useEffect, useMemo, useRef, useState } from 'react';

function DropDownFilter({
  label = 'Sort By',
  value,
  onChange,
  options,
  disabled = false,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

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

  function filterDropdown() {
    if (disabled) return;
    setIsOpen((v) => !v);
  }

  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={dropdownRef} className="relative">
      <div className="text-gray-600 border border-[#990100] rounded-lg">
        <div className="flex justify-end">
          <button
            type="button"
            onClick={filterDropdown}
            className="flex items-center bg-white lg:h-10 md:h-9 h-8 rounded-lg py-1 cursor-pointer px-3 md:text-sm text-xs text-[#990100] md:gap-8 gap-4 disabled:opacity-60 disabled:cursor-not-allowed"
            disabled={disabled}
          >
            {selectedLabel || label}
            <img
              src="/icons/red-dropdown.png"
              width={"10px"}
              height={"10px"}
              className={`${isOpen ? 'rotate-180' : ''}`}
              alt="dropdown"
            />
          </button>
        </div>
      </div>

      {isOpen && (
        <div
          className="origin-top-right absolute right-0 top-full mt-1 md:w-50 w-40 rounded-md shadow-lg bg-white border border-[#990100] z-[1000]"
          role="menu"
        >
          <div className="md:py-1 py-0" role="none">
            {resolvedOptions.map((opt, idx) => (
              <React.Fragment key={String(opt.value)}>
                <button
                  type="button"
                  className={`w-full text-left px-4 py-2 md:text-sm text-xs cursor-pointer hover:font-medium hover:bg-[#EDEDED] ${
                    value === opt.value ? 'font-medium bg-[#EDEDED]' : ''
                  }`}
                  role="menuitem"
                  onClick={() => {
                    onChange?.(opt.value);
                    setIsOpen(false);
                  }}
                >
                  <p className="text-[#990100]">{opt.label}</p>
                </button>
                {idx !== resolvedOptions.length - 1 && <hr />}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default DropDownFilter;
