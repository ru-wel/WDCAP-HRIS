import React, { useEffect, useMemo, useRef, useState } from "react";
import DropDownFilter from "../../components/dropdownfilter";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./leave.css";
import { get, put } from "../../services/api.js";
import ConfirmModal from "../../components/confirm-modal.jsx";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";

const getQuarterRange = (date) => {
  const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : new Date();
  const year = d.getFullYear();
  const month = d.getMonth();
  const quarter = Math.floor(month / 3) + 1;
  return { year, quarter };
};

function formatPrettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function addDaysIso(iso, days) {
  if (!iso) return "";
  const parts = String(iso).split("-");
  const year = Number(parts[0]);
  const monthIndex = Number(parts[1]) - 1;
  const day = Number(parts[2]);
  const d = new Date(Date.UTC(year, monthIndex, day));
  d.setUTCDate(d.getUTCDate() + Number(days || 0));
  return d.toISOString().slice(0, 10);
}

function formatPrettyDateRange(startIso, endIso) {
  if (!startIso) return "";
  if (!endIso || endIso === startIso) return formatPrettyDate(startIso);
  return `${formatPrettyDate(startIso)} to ${formatPrettyDate(endIso)}`;
}

function EventPopover({ open, anchor, data, onClose, onCancelClick, canCancel }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e) => {
      if (ref.current && !ref.current.contains(e.target)) onClose();
    };
    document.addEventListener("mousedown", onDocMouseDown);
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !data) return null;
  const CARD_W = 430;
  const CARD_H = 260;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const left = Math.max(16, Math.min(anchor.x - 60, vw - CARD_W - 16));
  const top = Math.max(16, Math.min(anchor.y - 80, vh - CARD_H - 16));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/10" />

      <div ref={ref} className="gc-popover absolute bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden" style={{ width: CARD_W, height: CARD_H, left, top }}>
          <div className="relative p-3 flex justify-end gap-2 border-b">
            {canCancel ? (
              <button className="gc-icon-cancel" title="Cancel Leave" onClick={() => onCancelClick?.(data)}>Cancel</button>
            ) : null}
            <button className="gc-icon-btn" title="Close" onClick={onClose}>✕</button>
          </div>
          <div className="p-5">
            <div className="flex items-start gap-3">
              <span
                className="gc-dot"
                style={{ background: data.dotColor || "#F59E0B" }}
              />
              <div>
                <h3 className="text-2xl font-medium text-gray-900 leading-tight">
                  {data.title}
                </h3>
                <p className="text-sm text-gray-600 mt-1">
                  {data.dateLabel || formatPrettyDate(data.date)}
                </p>
              </div>
            </div>
            <div className="mt-6 space-y-4 text-sm text-gray-800">
              <div className="gc-row">
                <span className="gc-row-icon">≡</span>
                <span>{data.category || "Leave"}</span>
              </div>
              <div className="gc-row">
              <span className="gc-row-icon">📅</span>
              <span>{data.calendarName || "SIL"}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function Leave() {
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const canManage = user?.role === ROLES.EXECUTIVE || user?.role === ROLES.MANAGER;

  const [searchTerm, setSearchTerm] = useState("");
  const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");
  const [_loading, setLoading] = useState(true);
  const [rawEvents, setRawEvents] = useState([]);

  const [calendarCursor, setCalendarCursor] = useState(() => new Date());
  const [duePending, setDuePending] = useState([]);

  const quarterInfo = useMemo(() => getQuarterRange(calendarCursor), [calendarCursor]);

  

  useEffect(() => {
    if (!canManage) {
      setDuePending([]);
      return;
    }

    const fetchDue = async () => {
      try {
        const res = await get(
          `/evaluations/pending?year=${encodeURIComponent(String(quarterInfo.year))}&quarter=${encodeURIComponent(String(quarterInfo.quarter))}`
        );
        const rows = Array.isArray(res?.data) ? res.data : [];
        setDuePending(rows);
      } catch (e) {
        console.error('Failed to load pending due evaluations (leave calendar):', e);
        setDuePending([]);
      }
    };

    fetchDue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canManage, quarterInfo.year, quarterInfo.quarter]);

  const autoDueEvents = useMemo(() => {
    if (!canManage) return [];
    const rows = Array.isArray(duePending) ? duePending : [];
    return rows
      .filter((r) => r?.due_date)
      .map((r) => {
        const date = String(r.due_date).slice(0, 10);
        const employeeName = String(r.employee_name || '').trim();
        const type = String(r.evaluation_type || 'Evaluation').trim();
        const title = `${employeeName} - ${type}`.trim();
        return {
          id: `eval-due-${String(r.employee_db_id || '')}-${date}-${type}`,
          title,
          start: date,
          end: undefined,
          dotColor: "#F59E0B",
          pillBg: "#FFE1A3",
          pillText: "#FF8A00",
          category: "Evaluation",
          calendarName: "Evaluation",
          start_date: date,
          end_date: date,
          isAutoDue: true,
        };
      });
  }, [canManage, duePending]);

  const effectiveEvents = useMemo(() => [...rawEvents, ...autoDueEvents], [rawEvents, autoDueEvents]);

  const fetchCalendar = async () => {
    try {
      setLoading(true);
      const endpoint = isEmployee ? "/leave/history/me" : "/leave/history";
      const res = await get(endpoint);
      const rows = Array.isArray(res?.data) ? res.data : [];

      const approved = rows.filter(
        (r) => String(r.status || "").toUpperCase() === "APPROVED"
      );

      const mapped = approved
        .filter((r) => r.start_date)
        .map((r) => {
          const employeeName = r.employee_name || r.name || "";
          const leaveType = r.leave_type_name || r.type || "Leave";
          const title = `${employeeName} - ${leaveType}`.trim();

          const start = r.start_date;
          const endInclusive = r.end_date || r.start_date;

          return {
            id: String(r.leave_request_id || r.id || `${title}-${start}`),
            title,
            start,
            end: endInclusive ? addDaysIso(endInclusive, 1) : undefined,
            dotColor: "#F59E0B",
            pillBg: "#FFE1A3",
            pillText: "#FF8A00",
            category: "Leave",
            calendarName: leaveType,
            start_date: start,
            end_date: endInclusive,
            // metadata for actions
            leave_request_id: r.leave_request_id || r.id,
            employee_db_id: r.employee_db_id || r.employee_id,
            leave_type_name: r.leave_type_name || r.type,
            status: r.status || 'APPROVED',
            _raw: r,
          };
        });

      setRawEvents(mapped);
    } catch (e) {
      console.error("Failed to load leave calendar:", e);
      setRawEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCalendar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEmployee]);

  const performCancel = async (leaveRequestId, employeeDbId) => {
    if (!leaveRequestId) throw new Error('Missing leave id');
    // Employee cancelling their own pending request
    if (isEmployee && String(user.employee_id) === String(employeeDbId)) {
      await put(`/leave/requests/${leaveRequestId}/cancel`);
      return;
    }

    // HR/Admin can change status to CANCELLED
    if (canManage) {
      await put(`/leave/requests/${leaveRequestId}/status`, { status: 'CANCELLED' });
      return;
    }

    throw new Error('Not authorized to cancel this leave');
  };

  const requestCancel = async (data) => {
    if (!data) return;
    const leaveRequestId = data.leave_request_id || data.id;
    const employeeDbId = data.employee_db_id || data.employeeId || null;
    const leaveTypeName = data.leave_type_name || data.calendarName || '';
    const start = data.start_date || data.start;
    const end = data.end_date || data.end_date;
    const days = calcInclusiveDays(start, end);

    // fetch leave credits to show sick leave balance if available
    let credits = [];
    try {
      const res = isEmployee ? await get('/leave/credits/me') : await get(`/leave/credits?employee_id=${encodeURIComponent(String(employeeDbId || ''))}`);
      credits = Array.isArray(res?.data) ? res.data : [];
    } catch (e) {
      credits = [];
    }

    const sick = (credits || []).find((c) => /sick/i.test(String(c.leave_type_name || c.label || '')) ) || null;

    const content = (
      <div className="space-y-3 text-sm">
        <div><b>Employee:</b> {data.title?.split(' - ')[0] || '—'}</div>
        <div><b>Type:</b> {leaveTypeName}</div>
        <div><b>Dates:</b> {formatPrettyDateRange(start, end)}</div>
        <div><b>Inclusive Days:</b> {days}</div>
        {sick ? (
          <div>
            <b>Sick Leave Balance:</b> {sick.current_balance ?? sick.credit ?? '—'} (used: {sick.used_leave ?? sick.used ?? 0})
          </div>
        ) : (
          <div className="text-gray-600">No sick leave balance information available.</div>
        )}

        <div className="pt-2 text-xs text-gray-700">If this leave has already been deducted from the balance, cancelling may restore the credits. HR will review and the system will adjust balances accordingly.</div>
      </div>
    );

    openConfirm({
      title: 'Confirm Leave Cancellation',
      content,
      confirmText: 'Confirm Cancellation',
      cancelText: 'Back',
      onConfirm: async () => {
        await performCancel(leaveRequestId, employeeDbId);
      },
    });
  };

  const leaveTypeOptions = useMemo(() => {
    const types = Array.from(
      new Set(
        effectiveEvents
          .map((e) => e.calendarName)
          .filter((v) => typeof v === 'string' && v.trim().length)
      )
    ).sort((a, b) => a.localeCompare(b));

    return [
      { value: 'all', label: 'All' },
      ...types.map((t) => ({ value: t, label: t })),
    ];
  }, [effectiveEvents]);

  const filteredEvents = useMemo(() => {
    let list = effectiveEvents;

    if (leaveTypeFilter !== 'all') {
      list = list.filter((e) => String(e.calendarName || '') === leaveTypeFilter);
    }

    if (!searchTerm) return list;
    const q = searchTerm.toLowerCase();
    return list.filter((e) => String(e.title || "").toLowerCase().includes(q));
  }, [effectiveEvents, searchTerm, leaveTypeFilter]);

  const calendarEvents = useMemo(
    () =>
      [...filteredEvents]
        .sort((a, b) => {
          const aTime = a?.start ? new Date(String(a.start) + 'T00:00:00').getTime() : 0;
          const bTime = b?.start ? new Date(String(b.start) + 'T00:00:00').getTime() : 0;
          if (aTime !== bTime) return aTime - bTime;
          return String(a?.title || '').localeCompare(String(b?.title || ''), undefined, {
            numeric: true,
            sensitivity: 'base',
          });
        })
        .map((e) => ({
          id: e.id,
          title: e.title,
          start: e.start,
          end: e.end,
          backgroundColor: "transparent",
          borderColor: "transparent",
          textColor: "inherit",
          extendedProps: {
            title: e.title,
            date: e.start,
            dateLabel: formatPrettyDateRange(e.start_date || e.start, e.end_date || e.start),
            dotColor: e.dotColor,
            category: e.category,
            calendarName: e.calendarName,
            visibility: e.visibility,
            pillBg: e.pillBg,
            pillText: e.pillText,
          },
        })),
    [filteredEvents]
  );

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [anchor, setAnchor] = useState({ x: 200, y: 200 });

  const [confirmState, setConfirmState] = useState({
    open: false,
    title: '',
    message: '',
    content: null,
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: null,
  });

  const [confirmBusy, setConfirmBusy] = useState(false);

  const openConfirm = ({ title = '', message = '', content = null, confirmText = 'OK', cancelText = 'Cancel', onConfirm = null }) => {
    setConfirmState({ open: true, title, message, content, confirmText, cancelText, onConfirm });
  };

  const closeConfirm = () => setConfirmState((p) => ({ ...p, open: false, onConfirm: null, content: null }));

  const handleConfirm = async () => {
    const fn = confirmState.onConfirm;
    if (!fn) {
      closeConfirm();
      return;
    }

    try {
      setConfirmBusy(true);
      await fn();
      await fetchCalendar();
      setPopoverOpen(false);
      setSelected(null);
      setConfirmState({ open: true, title: 'Success', message: 'Action completed successfully.', content: null, confirmText: 'OK', cancelText: null, onConfirm: null });
    } catch (e) {
      setConfirmState({ open: true, title: 'Error', message: e?.message || 'Action failed.', content: null, confirmText: 'OK', cancelText: null, onConfirm: null });
    } finally {
      setConfirmBusy(false);
    }
  };

  const calcInclusiveDays = (startIso, endIso) => {
    if (!startIso) return 0;
    const s = new Date(startIso + 'T00:00:00');
    const e = new Date((endIso || startIso) + 'T00:00:00');
    const diff = Math.floor((e.getTime() - s.getTime()) / (24 * 60 * 60 * 1000));
    return Math.max(1, diff + 1);
  };

  if (_loading) {
    return (
      <div>
        <div className="flex items-center justify-center min-h-screen">
          <p className="text-gray-600">Loading Leave Calendar...</p>
        </div>
      </div>
    );
  }

  return (

    
    <div>
      <div className="p-4 sm:p-6 lg:p-7 md:mx-10 lg:mx-[4.5rem]">
        <div className="flex flex-col lg:flex-row  justify-between gap-4 mb-4">
        <h1 className="text-2xl lg:text-3xl font-bold text-[#990100] text-left lg:self-center">Leave</h1>

        <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto items-start md:items-end">
          <DropDownFilter
            label="Leave Type"
            value={leaveTypeFilter}
            onChange={setLeaveTypeFilter}
            options={leaveTypeOptions}
          />

          <div className="relative flex items-center border border-[#990100] rounded-lg h-10 w-full md:w-56">
            <input
              type="search"
              placeholder="Search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-full w-full px-3 pr-8 rounded-lg text-sm focus:outline-none"
            />
            <img
              src="/icons/red-search.png"
              alt="search"
              className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2"
            />
          </div>
        </div>
      </div>

        <hr className="border-[#990100] mb-6" />
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          <div className="lg:col-span-3 bg-white rounded-xl border border-gray-300 shadow-sm px-6 py-5">
            <FullCalendar
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              height="auto"
              fixedWeekCount={false}
              expandRows={true}
              showNonCurrentDates={true}
              dayMaxEvents={true}
              eventOrder="title"
              eventOrderStrict={true}
              eventDisplay="block"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
              }}

              datesSet={(arg) => {
                const cur = arg?.view?.currentStart;
                if (cur instanceof Date && !Number.isNaN(cur.getTime())) setCalendarCursor(cur);
              }}

              events={calendarEvents}
              eventContent={(arg) => {
                const bg = arg.event.extendedProps?.pillBg || "#FFE1A3";
                const color = arg.event.extendedProps?.pillText || "#FF8A00";

                return (
                  <div
                    className="gc-event-pill"
                    style={{ background: bg, color }}
                    title={arg.event.title}
                  >
                    {arg.event.title}
                  </div>
                );
              }}

              eventClick={(info) => {
                const x = info.jsEvent?.clientX ?? 200;
                const y = info.jsEvent?.clientY ?? 200;
                setAnchor({ x, y });
                setSelected(info.event.extendedProps);
                setPopoverOpen(true);
              }}
            />
          </div>

          <div className="gc-legend">
            <div className="gc-legend-title">Calendars</div>
            <div className="gc-legend-line" />
            <div className="gc-legend-item">
              <span
                className="gc-legend-color"
                style={{ background: "#F59E0B" }}
              />
              <span>SIL</span>
            </div>
            {canManage ? (
              <div className="gc-legend-item">
                <span className="gc-legend-color" style={{ background: "#F59E0B" }} />
                <span>Evaluation</span>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <EventPopover
        open={popoverOpen}
        anchor={anchor}
        data={selected}
        onClose={() => setPopoverOpen(false)}
        onCancelClick={requestCancel}
        canCancel={canManage || (isEmployee && String(selected?.employee_db_id || '') === String(user?.employee_id || ''))}
      />
      <ConfirmModal
        open={confirmState.open}
        title={confirmState.title}
        message={confirmState.message}
        content={confirmState.content}
        variant="form"
        confirmText={confirmBusy ? 'Processing…' : confirmState.confirmText}
        cancelText={confirmState.cancelText}
        onConfirm={handleConfirm}
        onCancel={confirmBusy ? undefined : closeConfirm}
        confirmDisabled={confirmBusy}
      />
    </div>
  );
}