import React, { useMemo, useState } from "react";

export default function ChipFilterPanel({
  // current applied values from parent
  applied = { personnelType: "", sort: "" },
  // chip options
  personnelTypeOptions = ["All", "Regular", "Contractual", "OJT"],
  sortOptions = ["Name: A–Z", "Name: Z–A"],
  // actions
  onApply,
  onClearAll,
  onClose,
}) {
  // local draft state (so Apply works like your screenshot)
  const [draft, setDraft] = useState(applied);

  const setChip = (key, val) => {
    setDraft((p) => ({ ...p, [key]: p[key] === val ? "" : val })); // tap again = deselect
  };

  const clearAll = () => {
    const cleared = { personnelType: "", sort: "" };
    setDraft(cleared);
    onClearAll?.();
  };

  const apply = () => {
    onApply?.(draft);
    onClose?.();
  };

  return (
    <div className="w-full">
      {/* CHIP GROUP: Personnel Type */}
      <div className="mb-5">
        <div className="text-sm font-semibold mb-2">Personnel Type</div>
        <div className="flex flex-wrap gap-2">
          {personnelTypeOptions.map((opt) => {
            const active = draft.personnelType === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setChip("personnelType", opt === "All" ? "" : opt)}
                className={`px-3 py-1.5 text-xs rounded-full border transition
                  ${active ? "bg-[#FFA500] text-white border-[#FFA500]" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"}
                `}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* CHIP GROUP: Sort */}
      <div className="mb-6">
        <div className="text-sm font-semibold mb-2">Sort</div>
        <div className="flex flex-wrap gap-2">
          {sortOptions.map((opt) => {
            const active = draft.sort === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => setChip("sort", opt)}
                className={`px-3 py-1.5 text-xs rounded-full border transition
                  ${active ? "bg-[#FFA500] text-white border-[#FFA500]" : "bg-gray-100 text-gray-700 border-gray-300 hover:bg-gray-200"}
                `}
              >
                {opt}
              </button>
            );
          })}
        </div>
      </div>

      {/* FOOTER: Clear all + Apply */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-200">
        <button
          type="button"
          onClick={clearAll}
          className="text-[#C60000] font-semibold hover:underline"
        >
          Clear all
        </button>

        <button
          type="button"
          onClick={apply}
          className="bg-[#C60000] text-white px-6 py-2 rounded-md hover:bg-[#d13232] hover:scale-105 transition duration-300 ease-in-out"
        >
          Apply
        </button>
      </div>
    </div>
  );
}