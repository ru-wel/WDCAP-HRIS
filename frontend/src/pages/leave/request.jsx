import React, { useEffect, useMemo, useState } from "react";
import DropDownFilter from "../../components/dropdownfilter";
import ReactPaginate from "react-paginate";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { get, post, put } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";
import { compareDate, compareText } from '../../utils/sort.js';

const formatDateShort = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
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

const formatRange = (startIso, endIso, mode) => {
  const start = formatPrettyDate(startIso);
  const end = formatPrettyDate(endIso);
  if (!start && !end) return "";
  if (!end || start === end) return start;
  if (mode === "short") {
    return `${formatDateShort(startIso)} - ${formatDateShort(endIso)}`;
  }
  return `${start} to ${end}`;
};

/** ✅ UPDATED: header matches your sample design */
function ModalShell({ open, title, onClose, children }) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/20"
        onClick={onClose}
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

          <div className="pt-6">{children}</div>
        </div>
      </div>
    </div>
  );
}

function LeaveRequestDetailsModal({
  open,
  row,
  onClose,
  canUpdate,
  canCancel,
  onUpdate,
  onCancelRequest,
}) {
  const [status, setStatus] = useState("APPROVED");

  useEffect(() => {
    if (!open) return;
    setStatus(row?.status || "PENDING");
  }, [open, row]);

  return (
    <ModalShell
      open={open}
      title={`Leave Request of ${row?.id ?? ""}`}
      onClose={onClose}
    >
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-[140px_1fr] gap-x-6 gap-y-2">
          <div className="font-semibold">Date Requested:</div>
          <div>{row?.dateRequested ?? "10/29/2025"}</div>

          <div className="font-semibold">Employee Name:</div>
          <div>{row?.name ?? ""}</div>

          <div className="font-semibold">Position:</div>
          <div>{row?.position ?? "Web Developer"}</div>

          <div className="font-semibold">Leave Type:</div>
          <div>{row?.type ?? "SIL"}</div>

          <div className="font-semibold">Date:</div>
          <div>{row?.dateLong ?? row?.date ?? ""}</div>

          <div className="font-semibold">Reason:</div>
          <textarea
            className="border border-gray-300 rounded-md p-3 text-sm h-28 resize-none"
            placeholder="Reason"
            value={row?.reason ?? ""}
            readOnly
          />
        </div>

        <hr className="border-[#990100]" />

        <div className="flex items-center gap-4">
          <div className="font-semibold">Status:</div>
          <select
            className="border border-gray-300 rounded-md px-4 py-2 text-sm bg-white w-56"
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

        <div className="pt-2">
          <span className="font-semibold">Update Made By:</span>{" "}
          {row?.updatedBy ?? ""}
        </div>

        <div className="flex justify-center pt-3">
          <button
            type="button"
            className="green-button shadow-md px-6"
            onClick={() => {
              if (!row) return;
              if (!canUpdate) {
                if (canCancel) {
                  onCancelRequest?.(row);
                } else {
                  onClose();
                }
                return;
              }
              onUpdate?.(row, status);
            }}
          >
            {canUpdate ? "Update Request" : canCancel ? "Cancel Request" : "Close"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function LeaveRequestCreateModal({ open, onClose, onCreated, onNotify }) {
  const [loadingTypes, setLoadingTypes] = useState(false);
  const [leaveTypes, setLeaveTypes] = useState([]);
  const [leaveTypeId, setLeaveTypeId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [employeeProfile, setEmployeeProfile] = useState(null);

  useEffect(() => {
    if (!open) return;
    setStartDate("");
    setEndDate("");
    setReason("");
    setSubmitting(false);

    const fetchTypes = async () => {
      try {
        setLoadingTypes(true);
        // Load employee profile for eligibility checks
        try {
          const prof = await get('/employees/me');
          setEmployeeProfile(prof?.data || null);
        } catch {
          setEmployeeProfile(null);
        }

        const resp = await get("/leave/types");
        const types = Array.isArray(resp?.data) ? resp.data : [];
        setLeaveTypes(types);

        // Preselect the first enabled type
        const firstEnabled = types.find((t) => isTypeEnabled(t));
        setLeaveTypeId(firstEnabled ? String(firstEnabled.leave_type_id ?? "") : "");
      } catch (e) {
        console.error("Failed to load leave types:", e);
        setLeaveTypes([]);
        setLeaveTypeId("");
      } finally {
        setLoadingTypes(false);
      }
    };

    fetchTypes();
  }, [open]);

  const isTypeEnabled = (t) => {
    const name = String(t?.leave_type_name || '').toLowerCase();
    const hireDateIso = String(employeeProfile?.hire_date || '').slice(0, 10);
    const personnelType = String(employeeProfile?.personnel_type || '').toLowerCase();

    let probationary = personnelType === 'probationary';

    if (probationary && hireDateIso) {
      try {
        const hired = new Date(`${hireDateIso}T00:00:00`);
        const now = new Date();
        const diffDays = Math.floor((now.getTime() - hired.getTime()) / (24 * 60 * 60 * 1000));
        if (diffDays >= 365) probationary = false; // treat as regularized after 1 year
      } catch {
        // ignore parse errors; fall back to personnel type only
      }
    }

    if (probationary) {
      // Only Leave Without Pay allowed during probationary period
      return name.includes('without pay');
    }

    // Regular / others: allow all
    return true;
  };

  const canSubmit = Boolean(leaveTypeId && startDate && endDate);

  const toApiLeaveTypeId = (value) => {
    const v = String(value || "").trim();
    if (!v) return "";
    if (/^\d+$/.test(v)) return Number(v);
    return v;
  };

  const handleSubmit = async () => {
    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      await post("/leave/requests", {
        leave_type_id: toApiLeaveTypeId(leaveTypeId),
        start_date: startDate,
        end_date: endDate,
        reason: reason || null,
      }, true, 60000);

      onCreated?.();
      onClose?.();
      onNotify?.({
        type: 'success',
        title: 'Success',
        message: 'Leave request submitted successfully.',
      });
    } catch (e) {
      console.error("Failed to create leave request:", e);
      onNotify?.({
        type: 'error',
        title: 'Error',
        message: e?.message || 'Failed to create leave request',
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ModalShell open={open} title="Request Leave" onClose={onClose}>
      <div className="space-y-5 text-sm">
        <div className="grid grid-cols-[140px_1fr] items-center gap-4">
          <div className="text-right font-semibold">Leave Type:</div>
          <select
            className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white"
            value={leaveTypeId}
            onChange={(e) => setLeaveTypeId(e.target.value)}
            disabled={loadingTypes || submitting}
          >
            {loadingTypes ? (
              <option value="">Loading…</option>
            ) : leaveTypes.length ? (
              leaveTypes.map((t) => (
                <option
                  key={String(t.leave_type_id)}
                  value={String(t.leave_type_id)}
                  disabled={!isTypeEnabled(t)}
                >
                  {t.leave_type_name}
                </option>
              ))
            ) : (
              <option value="">No leave types</option>
            )}
          </select>

          {(() => {
            const type = String(employeeProfile?.personnel_type || '').toLowerCase();
            const hire = String(employeeProfile?.hire_date || '').slice(0, 10);
            let show = false;
            if (type === 'probationary') {
              show = true;
              if (hire) {
                try {
                  const d = new Date(`${hire}T00:00:00`);
                  const diff = Math.floor((Date.now() - d.getTime()) / (24 * 60 * 60 * 1000));
                  if (diff >= 365) show = false;
                } catch {
                  // ignore
                }
              }
            }
            return show ? (
              <div className="col-span-2 text-xs text-gray-600">
                Only <b>Leave Without Pay</b> is available during the probationary period.
              </div>
            ) : null;
          })()}

          <div className="text-right font-semibold">Start Date:</div>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-48"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            disabled={submitting}
          />

          <div className="text-right font-semibold">End Date:</div>
          <input
            type="date"
            className="border border-gray-300 rounded-md px-3 py-2 text-sm w-48"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            disabled={submitting}
            min={startDate || undefined}
          />

          <div className="text-right font-semibold">Reason:</div>
          <textarea
            className="border border-gray-300 rounded-md p-3 text-sm h-28 resize-none"
            placeholder="Optional"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            disabled={submitting}
          />
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            className="bg-[#990100] text-white text-sm px-5 py-2 rounded-md hover:bg-[#ad3332] transition duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
            onClick={handleSubmit}
            disabled={!canSubmit || submitting || loadingTypes || !leaveTypes.length}
          >
            {submitting ? "Submitting…" : "Submit Request"}
          </button>
        </div>
      </div>
    </ModalShell>
  );
}

function LeaveRequest() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
    onCancel: null,
    confirmDisabled: false,
  });

  const [confirmBusy, setConfirmBusy] = useState(false);

  const openConfirm = ({
    title = '',
    message = '',
    confirmText = 'OK',
    cancelText = 'Cancel',
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

        const wasConfirmation = snapshot.cancelText != null && snapshot.cancelText !== '';
        if (!wasConfirmation) {
          return { ...prev, open: false, onConfirm: null, onCancel: null };
        }

        return {
          open: true,
          title: 'Success',
          message: 'Action completed successfully.',
          confirmText: 'OK',
          cancelText: null,
          onConfirm: null,
          onCancel: null,
          confirmDisabled: false,
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
        onCancel: null,
        confirmDisabled: false,
      });
    } finally {
      setConfirmBusy(false);
    }
  };

  const notify = ({ type, title, message } = {}) => {
    const isError = String(type || '').toLowerCase() === 'error';
    openConfirm({
      title: title || (isError ? 'Error' : 'Success'),
      message: message || '',
      confirmText: 'OK',
      cancelText: null,
      onConfirm: null,
      onCancel: null,
    });
  };

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState('requested_newest');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const endpoint = isEmployee
        ? "/leave/requests/me?status=PENDING"
        : "/leave/requests?status=PENDING";

      const resp = await get(endpoint);
      const apiRows = Array.isArray(resp?.data) ? resp.data : [];

      const mapped = apiRows.map((r) => ({
        leave_request_id: r.leave_request_id,
        id: r.employee_code || r.employee_id,
        name: r.employee_name || "",
        type: r.leave_type_name || "",
        startDateRaw: r.start_date || "",
        endDateRaw: r.end_date || "",
        date: formatRange(r.start_date, r.end_date, "short"),
        status: r.status || "PENDING",
        dateRequested: formatPrettyDate(r.created_at),
        createdAtTs: (() => {
          const ts = new Date(r.created_at).getTime();
          return Number.isNaN(ts) ? 0 : ts;
        })(),
        position: r.position_title || "",
        dateLong: formatRange(r.start_date, r.end_date, "long"),
        reason: r.reason || "",
        updatedBy: "",
      }));

      setRows(mapped);
    } catch (e) {
      console.error("Failed to load leave requests:", e);
      setRows([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee]);

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
        case 'employee_id_asc':
          return compareText(a?.id, b?.id);
        case 'employee_id_desc':
          return compareText(b?.id, a?.id);
        case 'name_az':
          return compareText(a?.name, b?.name);
        case 'name_za':
          return compareText(b?.name, a?.name);
        case 'leave_type_az':
          return compareText(a?.type, b?.type);
        case 'leave_type_za':
          return compareText(b?.type, a?.type);
        case 'leave_date_newest':
          return compareDate(b?.startDateRaw, a?.startDateRaw);
        case 'leave_date_oldest':
          return compareDate(a?.startDateRaw, b?.startDateRaw);
        case 'status_az':
          return compareText(a?.status, b?.status);
        case 'status_za':
          return compareText(b?.status, a?.status);
        case 'requested_newest':
          return (b?.createdAtTs || 0) - (a?.createdAtTs || 0);
        case 'requested_oldest':
          return (a?.createdAtTs || 0) - (b?.createdAtTs || 0);
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

  const handleUpdate = (row, nextStatus) => {
    if (!row?.leave_request_id) return;
    const computeDaysAndPoints = (r) => {
      try {
        const s = r?.startDateRaw ? new Date(r.startDateRaw) : null;
        const e = r?.endDateRaw ? new Date(r.endDateRaw) : null;
        if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return { days: null, points: null };
        const diffMs = e.setHours(0,0,0,0) - s.setHours(0,0,0,0);
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
        const points = days; // default: 1 point per day
        return { days, points };
      } catch (err) {
        return { days: null, points: null };
      }
    };

    const meta = computeDaysAndPoints(row);

    openConfirm({
      title: 'Confirm update',
      message: `Update leave request status to ${String(nextStatus || '').toUpperCase()}?${meta.days ? `\n\nThis request is for ${meta.days} day${meta.days !== 1 ? 's' : ''} (estimated ${meta.points} point${meta.points !== 1 ? 's' : ''}).` : ''}`,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onCancel: closeConfirm,
      onConfirm: async () => {
        try {
          await put(`/leave/requests/${row.leave_request_id}/status`, {
            status: nextStatus,
          });
          await fetchRequests();
          setDetailsOpen(false);
          openConfirm({
            title: 'Success',
            message: 'Leave request updated successfully.',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        } catch (e) {
          console.error('Failed to update leave request:', e);
          openConfirm({
            title: 'Error',
            message: e?.message || 'Failed to update leave request',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        }
      },
    });
  };

  const handleCancel = (row) => {
    if (!row?.leave_request_id) return;
    const computeDaysAndPoints = (r) => {
      try {
        const s = r?.startDateRaw ? new Date(r.startDateRaw) : null;
        const e = r?.endDateRaw ? new Date(r.endDateRaw) : null;
        if (!s || !e || Number.isNaN(s.getTime()) || Number.isNaN(e.getTime())) return { days: null, points: null };
        const diffMs = e.setHours(0,0,0,0) - s.setHours(0,0,0,0);
        const days = Math.floor(diffMs / (24 * 60 * 60 * 1000)) + 1;
        const points = days;
        return { days, points };
      } catch (err) {
        return { days: null, points: null };
      }
    };

    const meta = computeDaysAndPoints(row);

    openConfirm({
      title: 'Confirm cancel',
      message: `Cancel this leave request?${meta.days ? `\n\nThis request is for ${meta.days} day${meta.days !== 1 ? 's' : ''} (estimated ${meta.points} point${meta.points !== 1 ? 's' : ''}).` : ''}`,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onCancel: closeConfirm,
      onConfirm: async () => {
        try {
          await put(`/leave/requests/${row.leave_request_id}/cancel`, {});
          await fetchRequests();
          setDetailsOpen(false);
          openConfirm({
            title: 'Success',
            message: 'Leave request cancelled successfully.',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        } catch (e) {
          console.error('Failed to cancel leave request:', e);
          openConfirm({
            title: 'Error',
            message: e?.message || 'Failed to cancel leave request',
            confirmText: 'OK',
            cancelText: null,
            onConfirm: () => closeConfirm(),
          });
        }
      },
    });
  };

  return (
    <div>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div className="md:flex justify-between items-center w-full">
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold md:mb-0 mb-5">
            Leave Requests
          </h1>

          <div className="flex items-center justify-end md:gap-4 gap-3">
            {isEmployee && (
              <button
                type="button"
                className="bg-[#990100] text-white text-sm px-4 py-[7px] rounded-lg hover:bg-[#ad3332] transition duration-300 ease-in-out"
                onClick={() => setCreateOpen(true)}
              >
                Request Leave
              </button>
            )}
            <DropDownFilter
              value={sortOrder}
              onChange={setSortOrder}
              options={[
                { value: 'employee_id_asc', label: 'Employee ID: Ascending' },
                { value: 'employee_id_desc', label: 'Employee ID: Descending' },
                { value: 'name_az', label: 'Name: A - Z' },
                { value: 'name_za', label: 'Name: Z - A' },
                { value: 'leave_type_az', label: 'Leave Type: A - Z' },
                { value: 'leave_type_za', label: 'Leave Type: Z - A' },
                { value: 'leave_date_newest', label: 'Date: Newest' },
                { value: 'leave_date_oldest', label: 'Date: Oldest' },
                { value: 'status_az', label: 'Status: A - Z' },
                { value: 'status_za', label: 'Status: Z - A' },
                { value: 'requested_newest', label: 'Date Requested: Newest' },
                { value: 'requested_oldest', label: 'Date Requested: Oldest' },
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
        <div className="div-table">
          <table className="table-style">
            <thead className="thead-style">
              <tr>
                <th className="th-style rounded-tl-lg rounded-bl-lg">
                  Employee ID
                </th>
                <th className="th-style">Name</th>
                <th className="th-style">Leave Type</th>
                <th className="th-style">Date</th>
                <th className="th-style">Status</th>
                <th className="th-style rounded-tr-lg rounded-br-lg">
                  Actions
                </th>
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
                    No leave requests found
                  </td>
                </tr>
              ) : (
                currentRows.map((row) => (
                  <tr
                    key={row.leave_request_id || row.id}
                    className="tr-style"
                  >
                    <td className="td-style font-medium">
                      {row.id}
                    </td>
                    <td className="td-style">
                      {row.name}
                    </td>
                    <td className="td-style">
                      {row.type}
                    </td>
                    <td className="td-style">
                      {row.date}
                    </td>
                    <td className="td-style">
                      <span className="inline-block bg-[#FFE1A3] text-[#805200] px-4 py-[6px] rounded-xl text-xs font-semibold">
                        {row.status}
                      </span>
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
            <p className='lg:text-md text-sm'>
              Showing <b>{currentRows.length}</b> of <b>{visibleRows.length}</b> request{visibleRows.length !== 1 ? 's' : ''}
              {pageCount ? <> | Page <b>{currentPage}</b> of <b>{pageCount}</b></> : null}
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
      </div>

      <LeaveRequestDetailsModal
        open={detailsOpen}
        row={selectedRow}
        onClose={() => setDetailsOpen(false)}
        canUpdate={!isEmployee}
        onUpdate={handleUpdate}
        canCancel={isEmployee && String(selectedRow?.status || '').toUpperCase() === 'PENDING'}
        onCancelRequest={handleCancel}
      />

      <LeaveRequestCreateModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreated={fetchRequests}
        onNotify={notify}
      />

      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        confirmText={confirmBusy ? 'Processing…' : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : (confirmState.onCancel || closeConfirm)}
        confirmDisabled={Boolean(confirmState.confirmDisabled || confirmBusy)}
      />
    </div>
  );
}

export default LeaveRequest;