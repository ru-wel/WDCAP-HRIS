import React, { useEffect, useMemo, useState } from "react";
import ReactPaginate from "react-paginate";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { get, put, post } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";
import { compareDate, compareText } from "../../utils/sort.js";
import ReportModal from "../../components/report-modal.jsx";
import { exportRowsToCsv } from "../../utils/csv.js";
import { exportRowsToXlsx } from "../../utils/excel.js";
import { filterRowsByDateRange } from "../../utils/reporting.js";

const formatDateShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yyyy = String(d.getFullYear());
  return `${mm}/${dd}/${yyyy}`;
};

const formatPrettyDate = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const formatDateTime = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const dateStr = formatDateShort(iso);
  const timeStr = d.toLocaleTimeString(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
  return `${dateStr} at ${timeStr}`;
};

const formatRange = (startIso, endIso, mode) => {
  if (mode === "short") {
    const start = formatDateShort(startIso);
    const end = formatDateShort(endIso);
    if (!start && !end) return "";
    if (!end || start === end) return start;
    return `${start} - ${end}`;
  }

  const start = formatPrettyDate(startIso);
  const end = formatPrettyDate(endIso);
  if (!start && !end) return "";
  if (!end || start === end) return start;
  return `${start} to ${end}`;
};

const mapApiRowToUi = (r) => ({
  leave_request_id: r.leave_request_id,
  id: r.employee_code || r.employee_id,
  name: r.employee_name || "",
  type: r.leave_type_name || "",
  leave_purpose: r.leave_purpose || null,
  startDateRaw: r.start_date || "",
  endDateRaw: r.end_date || "",
  date: formatRange(r.start_date, r.end_date, "short"),
  status: r.status || "",
  dateRequested: formatDateShort(r.created_at),
  createdAtTs: (() => {
    const ts = new Date(r.created_at).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  })(),
  position: r.position_title || "",
  dateLong: formatRange(r.start_date, r.end_date, "long"),
  reason: r.reason || "",
  updated_by_name: r.updated_by_name || "",
  updated_at: r.updated_by_timestamp || r.updated_at,
  updatedAtTs: (() => {
    const updatedAt = r.updated_by_timestamp || r.updated_at;
    if (!updatedAt) return 0;
    const ts = new Date(updatedAt).getTime();
    return Number.isNaN(ts) ? 0 : ts;
  })(),
  updatedBy: (() => {
    const email = r.updated_by_email || r.updatedByEmail || r.updated_by || "";
    const role = r.updated_by_role || r.updatedByRole || "";
    const label = String(email || "").trim();
    const roleLabel = String(role || "").trim();
    if (label && roleLabel) return `${label} (${roleLabel})`;
    return label;
  })(),
});

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
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/20 z-0" aria-hidden="true" />

      <div className="relative w-full max-w-2xl mx-4 bg-white rounded-lg shadow-xl border border-gray-300 z-10">
        <div className="p-4 sm:p-6">
          <div className="rounded-lg bg-[#990100] flex items-center justify-between py-2 sm:py-3 px-3 sm:px-4">
            <h1 className="text-white text-sm sm:text-base lg:text-lg font-medium">{title}</h1>

            <button
              type="button"
              onClick={onClose}
              className="text-white text-2xl font-bold hover:scale-110 transition cursor-pointer"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function StatusPill({ status }) {
  const normalized = String(status || "").toUpperCase();
  if (normalized === "APPROVED") {
    return (
      <span className="inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold bg-green-200 text-green-700">
        APPROVED
      </span>
    );
  }
  if (normalized === "REJECTED") {
    return (
      <span className="bg-red-200 text-red-600 inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
        REJECTED
      </span>
    );
  }
  return (
    <span className=" bg-[#C8C8FF] text-[#0000FF] inline-flex min-w-fit px-3 py-1 whitespace-nowrap rounded-full text-xs font-semibold">
      {normalized || "PENDING"}
    </span>
  );
}

function LeaveHistoryDetailsModal({ open, row, onClose, canUpdate, onUpdate, openConfirm }) {
  const [status, setStatus] = useState(row?.status || "PENDING");

  useEffect(() => {
    if (!open) return;
    setStatus(row?.status || "PENDING");
  }, [open, row]);

  const originalStatus = row?.status || "PENDING";
  const hasChanges =
    String(status || "").toUpperCase() !== String(originalStatus || "").toUpperCase();

  const closeModal = () => {
    if (!canUpdate || !hasChanges) {
    onClose();
    return;
  }

  openConfirm(
    {
      title: "Confirmation",
      message: "You have unsaved changes. Do you want to close it without saving?",
      confirmText: "OK",
      cancelText: "Cancel",
      onConfirm: () => {
        onClose();
      },
    });
  }

  return (
    <ModalShell open={open} title={`Leave History of ${row?.id ?? ""}`} onClose={closeModal}>
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-2 px-2">
          <div className="font-semibold text-[#483D3D] uppercase">Date Requested:</div>
          <div>{row?.dateRequested || "—"}</div>

          <div className="font-semibold text-[#483D3D] uppercase">Employee Name:</div>
          <div>{row?.name ?? ""}</div>

          <div className="font-semibold text-[#483D3D] uppercase">Position:</div>
          <div>{row?.position || "—"}</div>

          <div className="font-semibold text-[#483D3D] uppercase">Leave Type:</div>
          <div>
            {row?.type ?? "SIL"}
            {row?.leave_purpose && (  
              <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                {row.leave_purpose === 'vacation' ? 'Vacation' : row.leave_purpose === 'bereavement' ? 'Bereavement' : 'Sick'}
              </span>
            )}
          </div>

          <div className="font-semibold text-[#483D3D] uppercase">Date:</div>
          <div>{row?.date ?? ""}</div>

          <div className="font-semibold text-[#483D3D] uppercase">Reason:</div>
          <textarea
            className="border border-gray-300 rounded-md p-3 text-sm h-28 resize-none"
            placeholder="Reason"
            value={row?.reason ?? ""}
            readOnly
          />
        </div>

        <hr className="border-[#990100]" />

        <div className="flex items-center gap-4 px-2">
          <div className="font-semibold text-[#483D3D] uppercase">Status:</div>
          <StatusPill status={row?.status} />
          <select
            className="border border-gray-300 rounded-md px-4 py-2 text-sm bg-white w-full sm:w-56"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            disabled={!canUpdate}
          >
            <option value="APPROVED">APPROVED</option>
            <option value="REJECTED">REJECTED</option>
            <option value="PENDING">PENDING</option>
            {canUpdate && <option value="CANCELLED">CANCELLED</option>}
          </select>
        </div>

        {row?.updated_by_name && row?.updated_at && (
          <div className="pt-2 px-2">
            <span className="font-semibold text-[#483D3D] uppercase">Update Made By: </span>
            <span className="text-gray-700">
              {row.updated_by_name} on {formatDateTime(row.updated_at)}
            </span>
          </div>
        )}

        <div className="flex justify-center pt-3">
          <button
            type="button"
            className="green-button shadow-md px-6"
            onClick={() => {
              if (!row) return;
              if (!canUpdate) {
                closeModal();
                return;
              }
              if (!hasChanges) return;
              onUpdate?.(row, status);
            }}
            disabled={canUpdate && !hasChanges}
          >
            {canUpdate ? "Update" : "Close"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

export default function LeaveHistory() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const canUpdate = !isEmployee;

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

  const [confirmBusy, setConfirmBusy] = useState(false);

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
    setConfirmState((prev) => ({ ...prev, open: false, onConfirm: null, onCancel: null }));
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

        const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== "";
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null, onCancel: null };
        }
        return { ...prev, open: false, onConfirm: null, onCancel: null };
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

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
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
      { value: "leave_type_az", label: "Leave Type: A - Z" },
      { value: "leave_type_za", label: "Leave Type: Z - A" },
      { value: "leave_date_newest", label: "Date: Newest" },
      { value: "leave_date_oldest", label: "Date: Oldest" },
      { value: "status_az", label: "Status: A - Z" },
      { value: "status_za", label: "Status: Z - A" },
      { value: "requested_newest", label: "Date Requested: Newest" },
      { value: "requested_oldest", label: "Date Requested: Oldest" },
      { value: "approval_date_newest", label: "Approval Date: Newest" },
      { value: "approval_date_oldest", label: "Approval Date: Oldest" },
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

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const endpoint = isEmployee ? "/leave/history/me" : "/leave/history";
      const resp = await get(endpoint);
      const apiRows = Array.isArray(resp?.data) ? resp.data : [];
      setRows(apiRows.map(mapApiRowToUi));
    } catch (e) {
      console.error("Failed to load leave history:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory();
  }, [isEmployee]);

  const handleUpdate = (row, nextStatus) => {
    if (!row?.leave_request_id) return;
    openConfirm({
      title: "Confirm update",
      message: `Update leave history status to ${String(nextStatus || "").toUpperCase()}?`,
      confirmText: "OK",
      cancelText: "Cancel",
      onCancel: closeConfirm,
      onConfirm: async () => {
        try {
          await put(`/leave/requests/${row.leave_request_id}/status`, { status: nextStatus });
          await fetchHistory();
          setDetailsOpen(false);
          openConfirm({
            title: "Success",
            message: "Leave history updated successfully.",
            confirmText: "OK",
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        } catch (e) {
          console.error("Failed to update leave history:", e);
          openConfirm({
            title: "Error",
            message: e?.message || "Failed to update leave history",
            confirmText: "OK",
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        }
      },
    });
  };

  const filteredRows = useMemo(() => {
    if (!searchTerm) return rows;
    const q = searchTerm.toLowerCase();
    return rows.filter((r) =>
      `${r.id} ${r.name} ${r.position} ${r.type} ${r.date} ${r.status}`
        .toLowerCase()
        .includes(q)
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
        case "leave_type_az":
          return compareText(a?.type, b?.type);
        case "leave_type_za":
          return compareText(b?.type, a?.type);
        case "leave_date_newest":
          return compareDate(b?.startDateRaw, a?.startDateRaw);
        case "leave_date_oldest":
          return compareDate(a?.startDateRaw, b?.startDateRaw);
        case "status_az":
          return compareText(a?.status, b?.status);
        case "status_za":
          return compareText(b?.status, a?.status);
        case "requested_newest":
          return (b?.createdAtTs || 0) - (a?.createdAtTs || 0);
        case "requested_oldest":
          return (a?.createdAtTs || 0) - (b?.createdAtTs || 0);
        case "approval_date_newest":
          return (b?.updatedAtTs || 0) - (a?.updatedAtTs || 0);
        case "approval_date_oldest":
          return (a?.updatedAtTs || 0) - (b?.updatedAtTs || 0);
        default:
          return (b?.createdAtTs || 0) - (a?.createdAtTs || 0);
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

  const handleGenerateReport = async ({ startDate, endDate, fileType } = {}) => {
    const rowsForExport =
      startDate || endDate
        ? filterRowsByDateRange(visibleRows, (r) => r?.startDateRaw, startDate, endDate)
        : visibleRows;

    const stamp = new Date().toISOString().slice(0, 10);
    const isCsv = fileType === "CSV";
    const filename = `leave-history-${stamp}.${isCsv ? "csv" : "xlsx"}`;

    post("/audit-logs/reports", {
      report_name: "Leave History Report",
      filename,
      start_date: startDate || null,
      end_date: endDate || null,
      row_count: rowsForExport.length,
      source: "leave-history",
    }).catch(() => {});

    const columns = [
      { header: "Employee ID", value: (r) => r?.id || "" },
      { header: "Name", value: (r) => r?.name || "" },
      { header: "Position", value: (r) => r?.position || "" },
      { header: "Leave Type", value: (r) => r?.type || "" },
      { header: "Start Date", value: (r) => r?.startDateRaw || "" },
      { header: "End Date", value: (r) => r?.endDateRaw || "" },
      { header: "Status", value: (r) => r?.status || "" },
      { header: "Date Requested", value: (r) => r?.dateRequested || "" },
      { header: "Updated By", value: (r) => r?.updatedBy || "" },
    ];

    if (isCsv) {
      exportRowsToCsv({ filename, columns, rows: rowsForExport });
    } else {
      await exportRowsToXlsx({ filename, sheetName: "Leave History", columns, rows: rowsForExport });
    }

    setReportOpen(false);
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Leave History...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Leave History
          </h1>

          <div className="flex items-center justify-end md:gap-4 gap-3">
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

        <div className="flex justify-end mt-6">
          <button className="generate-report-button" onClick={() => setReportOpen(true)}>
            Generate Report
          </button>

          <ReportModal
            open={reportOpen}
            title="Generate Report - Leave History"
            onClose={() => setReportOpen(false)}
            onGenerate={handleGenerateReport}
            enableDateRange={true}
          />
        </div>

        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">Employee ID</th>
                <th className="th-style">Name</th>
                <th className="th-style">Leave Type</th>
                <th className="th-style">Date</th>
                <th className="th-style">Status</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">Actions</th>
              </tr>
            </thead>

            <tbody className="tbody-style">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    Loading...
                  </td>
                </tr>
              ) : filteredRows.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    No leave history found
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr key={row.leave_request_id ?? row.id} className="tr-style">
                    <td className="td-style font-medium">{row.id}</td>
                    <td className="td-style">{row.name}</td>
                    <td className="td-style">{row.type}</td>
                    <td className="td-style">{row.date}</td>
                    <td className="td-style">
                      <StatusPill status={row.status} />
                    </td>
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
                ))
              )}
            </tbody>
          </table>

          <br />

          <div className="lg:flex items-center lg:justify-between">
            <p className="lg:text-md text-sm">
              Showing <b>{currentRows.length}</b> of <b>{visibleRows.length}</b> record
              {visibleRows.length !== 1 ? "s" : ""}
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

      <LeaveHistoryDetailsModal
        open={detailsOpen}
        row={selectedRow}
        onClose={() => setDetailsOpen(false)}
        canUpdate={canUpdate}
        onUpdate={handleUpdate}
        openConfirm={openConfirm}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? "Processing…" : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : confirmState.onCancel || closeConfirm}
        confirmDisabled={Boolean(confirmState.confirmDisabled || confirmBusy)}
      />
    </div>
  );
}