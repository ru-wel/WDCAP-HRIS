import React, { useEffect, useMemo, useState } from "react";
import ReactPaginate from "react-paginate";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { get, put, post } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";
import { compareNumber, compareText } from "../../utils/sort.js";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";

function ModalShell({ open, title, onClose, children }) {
  /*useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);*/

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        aria-hidden="true"
      />

      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl border border-gray-300">
        <div className="p-4 sm:p-6">
          <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
            <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">
              {title}
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

          <div className="md:pt-6 pt-4">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LeaveCreditsDetailsModal({
  open,
  row,
  details,
  onClose,
  canEdit,
  onSave,
}) {
  const [editMode, setEditMode] = useState(false);
  const [draft, setDraft] = useState([]);
  const [initialCredits, setInitialCredits] = useState([]);

  useEffect(() => {
    if (!open) return;
    setEditMode(false);

    const items = Array.isArray(details) ? details : [];

    const normalized = items.map((it) => ({
      leave_balance_id: it.leave_balance_id,
      leave_type_name: it.leave_type_name || "Leave",
      current_balance: it.current_balance ?? 0,
      used_leave: it.used_leave ?? 0,
    }));

    setDraft(normalized);
    setInitialCredits(normalized);
  }, [open, details]);

  const onChangeCredit = (leaveBalanceId, nextValue) => {
    setDraft((prev) =>
      prev.map((d) =>
        d.leave_balance_id === leaveBalanceId
          ? { ...d, current_balance: nextValue }
          : d
      )
    );
  };

  const unsavedChanges = useMemo(() => {
    if (!editMode) return false;

    return JSON.stringify(draft) !== JSON.stringify(initialCredits);
  }, [draft, initialCredits, editMode]);

  const handleClose = () => {
    if (unsavedChanges) {
      onSave?.("unsaved");
      return;
    }
    onClose();
  };

  const leaveTypes = useMemo(() => {
    const items = Array.isArray(details) ? details : [];
    if (!items.length) {
      return [
        {
          label: "Service Incentive Leave",
          credit: row?.credits ?? 0,
          used: row?.usedLeave ?? 0,
          enabled: true,
        },
      ];
    }

    return items.map((it) => ({
      leave_balance_id: it.leave_balance_id,
      label: it.leave_type_name || "Leave",
      credit: it.current_balance ?? 0,
      used: it.used_leave ?? 0,
      enabled: true,
    }));
  }, [details, row]);

  return (
    <ModalShell
      open={open}
      title={`Leave Credits of ${row?.id ?? ""}`}
      onClose={handleClose}
    >
      <div className="space-y-4">
        <div className="md:flex justify-between px-4">
          <div className="flex gap-2">
            <span className="font-semibold">Employee Name:</span>
            <span>{row?.name ?? ""}</span>
          </div>
          <div className="flex gap-2">
            <span className="font-semibold">Position:</span>
            <span>Web Developer</span>
          </div>
        </div>

        <hr className="border-[#990100]" />

        <div className="grid grid-cols-[1fr_140px_120px] gap-x-4 items-center text-sm font-semibold">
          <div className="text-center">Leave Type</div>
          <div className="text-center">Leave Credit</div>
          <div className="text-center">Used Leave</div>
        </div>

        <div className="space-y-3">
          {leaveTypes.map((lt) => (
            <div
              key={lt.leave_balance_id || lt.label}
              className="grid grid-cols-[1fr_140px_120px] gap-x-4 items-center text-sm"
            >
              <div className="text-center">{lt.label}</div>

              <div className="flex justify-center">
                {lt.enabled ? (
                  canEdit && editMode ? (
                    <input
                      type="number"
                      min={0}
                      className="border border-[#990100] focus:outline-gray-400 rounded-md px-3 py-1 text-sm w-28 text-center"
                      value={
                        draft.find(
                          (d) => d.leave_balance_id === lt.leave_balance_id
                        )?.current_balance ?? lt.credit
                      }
                      onChange={(e) =>
                        onChangeCredit(lt.leave_balance_id, e.target.value)
                      }
                    />
                  ) : (
                    <span className="font-medium">{lt.credit}</span>
                  )
                ) : (
                  <select
                    className="border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-400 bg-white w-28"
                    disabled
                    value="DISABLED"
                    onChange={() => {}}
                  >
                    <option value="DISABLED">DISABLED</option>
                  </select>
                )}
              </div>

              <div className="flex justify-center">
                {lt.enabled ? (
                  <span className="font-medium">{lt.used}</span>
                ) : (
                  <select
                    className="border border-gray-300 rounded-md px-3 py-1 text-xs text-gray-400 bg-white w-28"
                    disabled
                    value="DISABLED"
                    onChange={() => {}}
                  >
                    <option value="DISABLED">DISABLED</option>
                  </select>
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-end pt-6 text-sm">

          {canEdit ? (
            editMode ? (
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  className="green-button bg-red-700 hover:bg-red-600 shadow-md"
                  onClick={handleClose}
                >
                  Cancel Changes
                </button>
                <button
                  type="button"
                  className="mustard-button shadow-md"
                  onClick={() => onSave?.(row, draft, () => setEditMode(false))}
                >
                  Save Changes
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="green-button shadow-md"
                onClick={() => setEditMode(true)}
              >
                Update Leave
              </button>
            )
          ) : (
            <button
              type="button"
              className="green-button bg-red-700 hover:bg-red-600 shadow-md"
              onClick={onClose}
            >
              Close
            </button>
          )}
        </div>
      </div>
    </ModalShell>
  );
}

function GenerateReportModal({ open, onClose, onGenerate }) {
  const [startingDate, setStartingDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [fileType, setFileType] = useState("XLSX");

  useEffect(() => {
    if (!open) return;
    setStartingDate("");
    setEndDate("");
    setFileType("XLSX");
  }, [open]);

  return (
    <ModalShell
      open={open}
      title="Generate Report - Leave Credits"
      onClose={onClose}
    >
      <div className="space-y-5">
        <div className="grid grid-cols-[140px_1fr] items-center gap-4 text-sm">
          <div className="text-right font-semibold">Starting Date:</div>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-40"
            value={startingDate}
            onChange={(e) => setStartingDate(e.target.value)}
          />

          <div className="text-right font-semibold">End Date:</div>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-40"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />

          <div className="text-right font-semibold">File Type:</div>
          <select
            className="border border-gray-300 rounded-md px-3 py-1 text-sm w-40 bg-white"
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
          >
            <option value="XLSX">Excel (.xlsx)</option>
            <option value="CSV">CSV</option>
          </select>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="bg-[#990100] text-white text-xs px-5 py-2 rounded-md hover:bg-[#ad3332] transition duration-300 ease-in-out"
            onClick={() => onGenerate?.({ startingDate, endDate, fileType })}
          >
            Generate Report
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function LeaveCredits() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const canEdit = !isEmployee;

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "OK",
    cancelText: "Cancel",
    onConfirm: null,
    onCancel: null,
    confirmDisabled: false,
  });

  const openConfirm = ({
    title = "",
    message = "",
    confirmText = "OK",
    cancelText = "Cancel",
    onConfirm,
    onCancel,
    confirmDisabled = false,
  }) => {
    setConfirmState({
      open: true,
      title,
      message,
      confirmText,
      cancelText,
      onConfirm,
      onCancel,
      confirmDisabled,
    });
  };

  const closeConfirm = () => {
    setConfirmState((prev) => ({
      ...prev,
      open: false,
      onConfirm: null,
      onCancel: null,
    }));
  };

  const [confirmBusy, setConfirmBusy] = useState(false);

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
      confirmDisabled: confirmState.confirmDisabled,
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
          prev.cancelText === snapshot.cancelText &&
          prev.confirmDisabled === snapshot.confirmDisabled;

        if (!isSameDialog) return prev;

        const wasConfirmation =
          snapshot.cancelText != null && snapshot.cancelText !== "";
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null, onCancel: null };
        }

        return {
          open: true,
          title: "Success",
          message: "Action completed successfully.",
          confirmText: "OK",
          cancelText: null,
          onConfirm: null,
          onCancel: null,
          confirmDisabled: false,
        };
      });
    } catch (e) {
      setConfirmState({
        open: true,
        title: "Error",
        message: e?.message || "Action failed.",
        confirmText: "OK",
        cancelText: null,
        onConfirm: null,
        onCancel: null,
        confirmDisabled: false,
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState([]);
  const [detailsByEmployeeId, setDetailsByEmployeeId] = useState({});

  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [reportOpen, setReportOpen] = useState(false);

  const [sortOrder, setSortOrder] = useState("requested_newest");

  const [filtersOpen, setFiltersOpen] = useState(false);
  const defaultSort = "requested_newest";
  const [draftSortOrder, setDraftSortOrder] = useState(sortOrder);

  const activeFiltersCount = useMemo(() => {
    let n = 0;
    if (sortOrder !== defaultSort) n += 1;
    return n;
  }, [sortOrder]);

  useEffect(() => {
    if (!filtersOpen) return;
    setDraftSortOrder(sortOrder);
  }, [filtersOpen, sortOrder]);

  useEffect(() => {
    if (!filtersOpen) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") setFiltersOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [filtersOpen]);

  const clearFilters = () => {
    setDraftSortOrder(defaultSort);
  };

  const applyDraftFilters = () => {
    setSortOrder(draftSortOrder);
    setFiltersOpen(false);
  };

  const sortOptions = useMemo(
    () => [
      { value: "employee_id_asc", label: "Employee ID: Ascending" },
      { value: "employee_id_desc", label: "Employee ID: Descending" },
      { value: "name_az", label: "Name: A - Z" },
      { value: "name_za", label: "Name: Z - A" },
      { value: "leave_credits_high", label: "Leave Credits: High - Low" },
      { value: "leave_credits_low", label: "Leave Credits: Low - High" },
      { value: "used_leave_high", label: "Used Leave: High - Low" },
      { value: "used_leave_low", label: "Used Leave: Low - High" },
    ],
    []
  );

  const ChipButton = ({ active, onClick, children }) => (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-xs font-semibold border transition",
        active
          ? "bg-[#990100] text-white border-[#990100]"
          : "bg-white text-[#990100] border-[#990100] hover:bg-[#990100]/10",
      ].join(" ")}
    >
      {children}
    </button>
  );

  const fetchCredits = async () => {
    try {
      setLoading(true);
      const endpoint = isEmployee ? "/leave/credits/me" : "/leave/credits";
      const res = await get(endpoint);
      const apiRows = Array.isArray(res?.data) ? res.data : [];

      const byEmployee = new Map();
      const detailsMap = {};

      for (const r of apiRows) {
        const employeeId = r.employee_id;
        if (!employeeId) continue;

        if (!detailsMap[employeeId]) detailsMap[employeeId] = [];
        detailsMap[employeeId].push(r);

        const existing = byEmployee.get(employeeId) || {
          employee_id: employeeId,
          id: r.employee_code || employeeId,
          name: r.employee_name || "",
          credits: 0,
          usedLeave: 0,
        };

        const credit = Number(r.current_balance ?? 0);
        const used = Number(r.used_leave ?? 0);
        existing.credits += Number.isFinite(credit) ? credit : 0;
        existing.usedLeave += Number.isFinite(used) ? used : 0;
        byEmployee.set(employeeId, existing);
      }

      setDetailsByEmployeeId(detailsMap);
      setRows(Array.from(byEmployee.values()));
    } catch (e) {
      console.error("Failed to load leave credits:", e);
      setRows([]);
      setDetailsByEmployeeId({});
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCredits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee]);

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      `${r.id} ${r.name} ${r.credits} ${r.usedLeave}`.toLowerCase().includes(q)
    );
  }, [rows, searchTerm]);

  const visibleRows = useMemo(() => {
    const sorted = [...filteredRows].sort((a, b) => {
      switch (sortOrder) {
        case "employee_id_asc":
          return compareText(a?.id, b?.id);
        case "employee_id_desc":
          return compareText(b?.id, a?.id);
        case "name_az":
          return compareText(a?.name, b?.name);
        case "name_za":
          return compareText(b?.name, a?.name);
        case "leave_credits_high":
          return compareNumber(b?.credits, a?.credits);
        case "leave_credits_low":
          return compareNumber(a?.credits, b?.credits);
        case "used_leave_high":
          return compareNumber(b?.usedLeave, a?.usedLeave);
        case "used_leave_low":
          return compareNumber(a?.usedLeave, b?.usedLeave);
        default:
          return compareText(a?.name, b?.name);
      }
    });
    return sorted;
  }, [filteredRows, sortOrder]);

  const [itemOffset, setItemOffset] = useState(0);
  const itemsPerPage = 15;
  const endOffset = itemOffset + itemsPerPage;
  const currentRows = visibleRows.slice(itemOffset, endOffset);
  const pageCount = Math.ceil(visibleRows.length / itemsPerPage);
  const multiPages = pageCount > 1;
  const currentPage = pageCount ? Math.floor(itemOffset / itemsPerPage) + 1 : 0;

  useEffect(() => {
    setItemOffset(0);
  }, [searchTerm, sortOrder, rows.length]);

  const handlePageClick = (event) => {
    setItemOffset(event.selected * itemsPerPage);
  };

  const handleGenerateReport = ({ startingDate, endDate, fileType }) => {
    const detailRows = visibleRows.flatMap((employee) => {
      const employeeId = employee?.employee_id;
      const details = employeeId ? detailsByEmployeeId?.[employeeId] : null;

      if (!Array.isArray(details) || details.length === 0) {
        return [
          {
            employee_code: employee?.id,
            employee_name: employee?.name,
            leave_type_name: "Service Incentive Leave",
            current_balance: employee?.credits ?? 0,
            used_leave: employee?.usedLeave ?? 0,
          },
        ];
      }

      return details.map((d) => ({
        employee_code: employee?.id,
        employee_name: employee?.name,
        leave_type_name: d?.leave_type_name || "Leave",
        current_balance: d?.current_balance ?? 0,
        used_leave: d?.used_leave ?? 0,
      }));
    });

    const dateTag = [startingDate, endDate].filter(Boolean).join("_to_");
    const ext = fileType === "XLSX" ? "xlsx" : "csv";
    const filename = `leave-credits-report${dateTag ? `-${dateTag}` : ""}-${new Date()
      .toISOString()
      .slice(0, 10)}.${ext}`;

    post("/audit-logs/reports", {
      report_name: "Leave Credits Report",
      filename,
      start_date: startingDate || null,
      end_date: endDate || null,
      row_count: detailRows.length,
      source: "leave-credits",
    }).catch(() => {});

    const columns = [
      { header: "Employee ID", value: (r) => r.employee_code },
      { header: "Employee Name", value: (r) => r.employee_name },
      { header: "Leave Type", value: (r) => r.leave_type_name },
      { header: "Leave Credit", value: (r) => r.current_balance },
      { header: "Used Leave", value: (r) => r.used_leave },
    ];

    if (fileType === "XLSX") {
      exportRowsToXlsx({
        filename,
        sheetName: "Leave Credits",
        columns,
        rows: detailRows,
      });
    } else {
      exportRowsToCsv({
        filename,
        columns,
        rows: detailRows,
      });
    }

    setReportOpen(false);
  };

  const handleSaveCredits = (employeeRow, draft, done) => {
    const items = Array.isArray(draft) ? draft : [];
    const safeItems = items
      .filter((d) => d?.leave_balance_id)
      .map((d) => ({
        leave_balance_id: d.leave_balance_id,
        current_balance: d.current_balance,
      }));

    if (!safeItems.length) return;

    openConfirm({
      title: "Confirm update",
      message: `Save leave credit changes for ${employeeRow?.name || "this employee"}?`,
      confirmText: "OK",
      cancelText: "Cancel",
      onCancel: closeConfirm,
      onConfirm: async () => {
        try {
          for (const it of safeItems) {
            await put(`/leave/credits/${it.leave_balance_id}`, {
              current_balance: Number(it.current_balance),
            });
          }
          await fetchCredits();
          done?.();
          setDetailsOpen(false);
          openConfirm({
            title: "Success",
            message: "Leave credits updated successfully.",
            confirmText: "OK",
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        } catch (e) {
          console.error("Failed to update leave credits:", e);
          openConfirm({
            title: "Error",
            message: e?.message || "Failed to update leave credits",
            confirmText: "OK",
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        }
      },
    });
  };

  if (loading) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading leave credits...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Leave Credits
          </h1>

          <div className="flex items-center justify-end md:gap-4 gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={() => setFiltersOpen((p) => !p)}
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

                    <div className="px-4 py-4 max-h-[65vh] overflow-y-auto">
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
                name="search"
                placeholder="Search"
                className="bg-white lg:h-10 md:h-9 h-8 px-2 lg:pr-10 md:pr-5 pr-5 md:w-auto w-35 rounded-lg text-sm focus:outline-none"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              <button
                type="button"
                className="absolute right-0 top-0 md:mt-3 mt-2 lg:mr-3 mr-2 items-center cursor-pointer"
                aria-label="Search"
              >
                <img
                  src="/icons/red-search.png"
                  className="lg:w-5 lg:h-5 w-4 h-4 items-center"
                  alt="search"
                />
              </button>
            </div>
          </div>
        </div>

        <hr className="text-[#990100] mt-6" />

        {!isEmployee && (
          <div className="flex justify-end mt-4">
            <button
              type="button"
              className="generate-report-button"
              onClick={() => setReportOpen(true)}
            >
              Generate Report
            </button>
          </div>
        )}

        <div className="div-table">
          {loading && (
            <div className="text-sm text-gray-600 mb-3">
              Loading leave credits…
            </div>
          )}
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="th-style">Name</th>
                <th className="th-style">Leave Credits</th>
                <th className="th-style">Used Leave</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {currentRows.map((row) => (
                <tr key={row.id} className="tr-style">
                  <td className="td-style font-medium">{row.id}</td>
                  <td className="td-style">{row.name}</td>
                  <td className="td-style">{row.credits}</td>
                  <td className="td-style">{row.usedLeave}</td>
                  <td className="td-style">
                    <button
                      type="button"
                      className="bg-[#990100] text-white text-sm px-4 py-[5px] rounded-lg hover:bg-[#ad3332] hover:scale-105 transition duration-300 ease-in-out"
                      onClick={() => {
                        setSelectedRow(row);
                        setDetailsOpen(true);
                      }}
                    >
                      View Details
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <br />

          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentRows.length}</b> of <b>{visibleRows.length}</b>{" "}
              employee{visibleRows.length !== 1 ? "s" : ""}
              {pageCount ? (
                <>
                  {" "}
                  | Page <b>{currentPage}</b> of <b>{pageCount}</b>
                </>
              ) : null}
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

      <LeaveCreditsDetailsModal
        open={detailsOpen}
        row={selectedRow}
        details={
          selectedRow?.employee_id
            ? detailsByEmployeeId[selectedRow.employee_id]
            : null
        }
        onClose={() => setDetailsOpen(false)}
        canEdit={canEdit}
        onSave={(rowOrFlag, draft, done) => {
          if (rowOrFlag === "unsaved") {
            openConfirm({
              title: "Unsaved Changes",
              message: "You have unsaved changes. Do you want to cancel without saving?",
              confirmText: "OK",
              cancelText: "Cancel",
              onConfirm: () => {
                closeConfirm();
                setDetailsOpen(false);
              },
              onCancel: closeConfirm,
            });
            return;
          }

          handleSaveCredits(rowOrFlag, draft, done);
        }}
      />

      {!isEmployee && (
        <GenerateReportModal
          open={reportOpen}
          onClose={() => setReportOpen(false)}
          onGenerate={handleGenerateReport}
        />
      )}

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? "Processing…" : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={
          confirmBusy ? undefined : confirmState.onCancel || closeConfirm
        }
        confirmDisabled={Boolean(confirmState.confirmDisabled || confirmBusy)}
      />
    </div>
  );
}