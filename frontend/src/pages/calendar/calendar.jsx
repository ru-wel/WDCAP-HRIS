import React, { useMemo, useRef, useState, useEffect } from "react";
import Navbar from "../../components/navbar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { get, post, put, del } from "../../services/api.js";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";
import ConfirmModal from "../../components/confirm-modal.jsx";
import "./calendar.css";

// CALENDAR COLOR CONFIGURATION - PALITAN NIYO COLORS HERE

const CALENDAR_COLORS = {

  birthday: "#BD2B25",           // Red
  holiday: "#0B8043",            // Dark Green
  meeting: "#3B82F6",            // Blue
  company_event: "#A142F4",      // Purple
  evaluation: "#F59E0B",         // Amber/Orange

  leave: {
    background: "#44688f",       // Blue background for all leaves
    approved: "#10B981",         // Green border for approved
    pending: "#F59E0B",          // Orange border for pending
    rejected: "#EF4444",         // Red border for rejected (if needed)
    cancelled: "#6B7280",        // Gray border for cancelled (if needed)
  },

  // for filters
  parentEvent: "#A142F4",        // Purple (matches company_event)
  parentLeave: "#44688f",        // Blue (matches leave background)
};

// date formatting
function formatPrettyDate(dateInput) {
  
  let dateStr;
  if (dateInput instanceof Date) {
    
    const year = dateInput.getFullYear();
    const month = String(dateInput.getMonth() + 1).padStart(2, '0');
    const day = String(dateInput.getDate()).padStart(2, '0');
    dateStr = `${year}-${month}-${day}`;
  } else {
    dateStr = String(dateInput).split('T')[0]; 
  }

  // parse manually to avoid timezone issues
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);

  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatPrettyDateRange(startIso, endIso) {
  if (!startIso) return "";
  if (!endIso || endIso === startIso) return formatPrettyDate(startIso);
  return `${formatPrettyDate(startIso)} to ${formatPrettyDate(endIso)}`;
}

// event details modal
function EventDetailsModal({ open, data, onClose, onEdit, onDelete, isConfirmModalOpen, isProcessing }) {
  const ref = useRef(null);
  const { user } = useAuth();
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [leaveDetails, setLeaveDetails] = useState(null);

  // check if user can edit/delete company events (Admin/HR/Executive only)
  const canManageEvents = user?.role === ROLES.EXECUTIVE || user?.role === ROLES.HR;

  // check if this is a company event (can be edited/deleted)
  const eventType = data?.extendedProps?.type;
  const isCompanyEvent = eventType === 'holiday' || eventType === 'event';
  const canEditDelete = canManageEvents && isCompanyEvent;

  useEffect(() => {
    if (!open) return;

    const onDocMouseDown = (e) => {
      if (isConfirmModalOpen) return;

      if (ref.current && !ref.current.contains(e.target)) {
        onClose();
      }
    };

    const onKey = (e) => {
      if (e.key === "Escape" && !isConfirmModalOpen) onClose();
    };

    document.addEventListener("mousedown", onDocMouseDown);
    window.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocMouseDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, isConfirmModalOpen]);

  // fetch detailed leave information when opening a leave event
  useEffect(() => {
    if (!open || !data) {
      setLeaveDetails(null);
      return;
    }

    const eventType = data.extendedProps?.type;
    const recordId = data.extendedProps?.recordId;

    if (eventType === 'leave' && recordId) {
      setDetailsLoading(true);
      get(`/calendar/leaves/${recordId}`)
        .then(response => {
          if (response.success) {
            setLeaveDetails(response.data);
          }
        })
        .catch(error => {
          console.error('Error fetching leave details:', error);
        })
        .finally(() => {
          setDetailsLoading(false);
        });
    }
  }, [open, data]);

  if (!open || !data) return null;

  const eventColor = data.backgroundColor || data.color || "#990100";

  // determine date label based on event type
  const getDateLabel = () => {
    if (data.extendedProps?.dateLabel) return data.extendedProps.dateLabel;

    // for single-day events (evaluations, birthdays, holidays)
    if (data.extendedProps?.originalDate) {
      const originalEnd = data.extendedProps?.originalEndDate;
      return formatPrettyDateRange(data.extendedProps.originalDate, originalEnd);
    }

    // for multi-day events (leaves)
    const originalStart = data.extendedProps?.originalStartDate;
    const originalEnd = data.extendedProps?.originalEndDate;
    if (originalStart) {
      return formatPrettyDateRange(originalStart, originalEnd);
    }

    // fallback to event dates
    const start = data.start || data.startStr;
    const end = data.end || data.endStr;
    if (!start) return "";

    const startDate = typeof start === 'string' ? start.split('T')[0] : start.toISOString().split('T')[0];
    const endDate = end ? (typeof end === 'string' ? end.split('T')[0] : end.toISOString().split('T')[0]) : null;

    return formatPrettyDateRange(startDate, endDate);
  };

  // determine view details button redirect link based on event type
  const getViewDetailsLink = () => {
    switch (eventType) {
      case 'leave':
        return '/leave/history';
      case 'evaluation':
        return '/evaluation/history';
      default:
        return null;
    }
  };

  const viewDetailsLink = getViewDetailsLink();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/30"
        onClick={(e) => {
          if (!isConfirmModalOpen) {
            onClose();
          }
        }}
      />

      {/* modal */}
      <div ref={ref} className="gc-popover relative bg-white rounded-2xl shadow-2xl border border-gray-200 w-[430px] max-w-[90vw]"
      >
        <div className="p-3 flex justify-end gap-2 border-b border-[#990100]">
          <button className="gc-icon-btn" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="p-5">
          <div className="flex items-start gap-3">
            <span className="gc-dot" style={{ background: eventColor }}
            />
            <div>
              <h3 className="lg:text-2xl text-xl text-gray-900">
                {data.title}
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {getDateLabel()}
              </p>
            </div>
          </div>

          <div className="mt-6 space-y-4 text-sm text-gray-800">
            {/* Event Type */}
            <div className="gc-row">
              <span className="gc-row-icon">≡</span>
              <span className="capitalize">{eventType || "Event"}</span>
            </div>

            {/* Leave-specific details */}
            {eventType === 'leave' && detailsLoading && (
              <div className="text-sm text-gray-600">Loading details...</div>
            )}

            {eventType === 'leave' && leaveDetails && (
              <>
                {leaveDetails.reason && (
                  <div className="gc-row">
                    <span className="gc-row-icon">📝</span>
                    <span>{leaveDetails.reason}</span>
                  </div>
                )}
                <div className="gc-row">
                  <span className="gc-row-icon">📊</span>
                  <span className="capitalize">{leaveDetails.status?.toLowerCase() || 'Pending'}</span>
                </div>
              </>
            )}

            {/* Evaluation-specific details */}
            {eventType === 'evaluation' && data.extendedProps && (
              <>
                {data.extendedProps.employeeName && (
                  <div className="gc-row">
                    <span className="gc-row-icon">👤</span>
                    <span>{data.extendedProps.employeeName}</span>
                  </div>
                )}
                {data.extendedProps.evaluationType && (
                  <div className="gc-row">
                    <span className="gc-row-icon">📋</span>
                    <span>{data.extendedProps.evaluationType}</span>
                  </div>
                )}
                {data.extendedProps.notes && (
                  <div className="gc-row">
                    <span className="gc-row-icon">📝</span>
                    <span>{data.extendedProps.notes}</span>
                  </div>
                )}
              </>
            )}

            {/* Birthday-specific details */}
            {eventType === 'birthday' && data.extendedProps && (
              <>
                {data.extendedProps.employeeName && (
                  <div className="gc-row">
                    <span className="gc-row-icon">👤</span>
                    <span>{data.extendedProps.employeeName}</span>
                  </div>
                )}
              </>
            )}

            {/* Holiday/Event-specific details */}
            {(eventType === 'holiday' || eventType === 'event') && data.extendedProps && (
              <>
                {data.extendedProps.description && (
                  <div className="gc-row">
                    <span className="gc-row-icon">📝</span>
                    <span>{data.extendedProps.description}</span>
                  </div>
                )}
                {data.extendedProps.isRecurring && (
                  <div className="gc-row">
                    <span className="gc-row-icon">🔄</span>
                    <span>Recurring: {data.extendedProps.recurrencePattern || 'Yes'}</span>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Action Buttons at Bottom */}
          {(canEditDelete || viewDetailsLink) && (
            <div className="mt-6 pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
              <div className="flex gap-2 justify-end">
                {canEditDelete && (
                  <>
                    <button type="button" onClick={() => onEdit(data)} disabled={isProcessing} className="lg:h-10 md:h-9 h-8 px-4 rounded-lg border border-[#990100] text-[#990100] bg-white hover:text-[#990100]/70 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition duration-300">
                      Edit
                    </button>
                    <button type="button" onClick={() => onDelete(data)} disabled={isProcessing} className="lg:h-10 md:h-9 h-8 px-4 rounded-lg bg-[#990100] text-white hover:bg-red-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition duration-300">
                      {isProcessing ? 'Deleting...' : 'Delete'}
                    </button>
                  </>
                )}
              </div>
              {viewDetailsLink && (
                <a href={viewDetailsLink} className="lg:h-10 md:h-9 h-8 px-4 rounded-lg border border-[#990100] text-[#990100] bg-white hover:text-[#990100]/70 text-sm font-semibold flex items-center hover:scale-105 transition duration-300">
                  View Details
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MiniMonthCalendar({ value, onChange }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const start = new Date(startOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();

  const isInMonth = (d) => d.getMonth() === view.getMonth();

  return (
    <div className="w-full">
      <div className="flex items-center justify-between px-2">
        <p className="text-sm font-semibold text-gray-800">{monthLabel}</p>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() - 1, 1))}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            className="w-8 h-8 grid place-items-center rounded-full hover:bg-gray-100"
            onClick={() => setView(new Date(view.getFullYear(), view.getMonth() + 1, 1))}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pt-2 text-[10px] text-gray-500 font-semibold">
        {["S", "M", "T", "W", "T", "F", "S"].map((w, index) => (
          <div key={index} className="text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1 px-1 pt-1">
        {days.map((d) => {
          const selected = isSameDay(d, value);
          const inMonth = isInMonth(d);
          const isToday = isSameDay(d, new Date());

          return (
            <button
              key={d.toISOString()}
              type="button"
              onClick={() => onChange(d)}
              className={[
                "h-7 w-7 mx-auto rounded-full text-[11px] grid place-items-center transition",
                inMonth ? "text-gray-800" : "text-gray-400",
                selected ? "bg-[#990100] text-white" : "hover:bg-gray-100",
                !selected && isToday ? "border border-[#990100] text-[#990100]" : "",
              ].join(" ")}
              title={d.toDateString()}
            >
              {d.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CalendarSidebar({ selectedDate, onPickDate, enabledTypes, onToggleType, enabledSubTypes, onToggleSubType, onCreateClick }) {
  const [expandedSections, setExpandedSections] = useState(["event", "leave"]);
  const { user } = useAuth();

  // check if user can create company events (Executive/HR only)
  const canCreateEvents = user?.role === ROLES.EXECUTIVE || user?.role === ROLES.HR;

  const myCalendars = useMemo(
    () => [
      {
        id: "birthday",
        label: "Birthdays",
        color: CALENDAR_COLORS.birthday
      },
      {
        id: "event",
        label: "Events",
        color: CALENDAR_COLORS.parentEvent,
        hasChildren: true,
        children: [
          { id: "holiday", label: "Holidays", color: CALENDAR_COLORS.holiday },
          { id: "meeting", label: "Meetings", color: CALENDAR_COLORS.meeting },
          { id: "company_event", label: "Company Events", color: CALENDAR_COLORS.company_event },
        ]
      },
      {
        id: "evaluation",
        label: "Evaluation",
        color: CALENDAR_COLORS.evaluation
      },
      {
        id: "leave",
        label: "Leave",
        color: CALENDAR_COLORS.parentLeave,
        hasChildren: true,
        children: [
          { id: "leave-approved", label: "Approved", color: CALENDAR_COLORS.leave.approved },
          { id: "leave-pending", label: "Pending", color: CALENDAR_COLORS.leave.pending },
        ]
      },
    ],
    []
  );

  const toggleSection = (sectionId) => {
    setExpandedSections(prev =>
      prev.includes(sectionId)
        ? prev.filter(id => id !== sectionId)
        : [...prev, sectionId]
    );
  };

  const handleParentToggle = (item) => {
    if (item.hasChildren) {
      if (!enabledTypes.includes(item.id)) {
        onToggleType(item.id);
        item.children.forEach(child => {
          if (!enabledSubTypes.includes(child.id)) {
            onToggleSubType(child.id);
          }
        });
      } else {
        onToggleType(item.id);
        item.children.forEach(child => {
          if (enabledSubTypes.includes(child.id)) {
            onToggleSubType(child.id);
          }
        });
      }
    } else {
      onToggleType(item.id);
    }
  };

  const CheckboxRow = ({ item, isChild = false }) => {
    const isExpanded = expandedSections.includes(item.id);
    const isChecked = isChild ? enabledSubTypes.includes(item.id) : enabledTypes.includes(item.id);

    const isIndeterminate = item.hasChildren && enabledTypes.includes(item.id) &&
      item.children.some(child => enabledSubTypes.includes(child.id)) &&
      !item.children.every(child => enabledSubTypes.includes(child.id));

    return (
      <div>
        <div className={`flex items-center gap-3 py-2 ${isChild ? 'pl-6' : ''}`}>
          <label className="flex items-center gap-3 cursor-pointer select-none flex-1">
            <input
              type="checkbox"
              checked={isChecked}
              ref={input => {
                if (input && isIndeterminate) {
                  input.indeterminate = true;
                }
              }}
              onChange={() => isChild ? onToggleSubType(item.id) : handleParentToggle(item)}
              className="accent-[#990100]"
            />
            <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
            <span className="text-sm text-gray-800">{item.label}</span>
          </label>
          {item.hasChildren && (
            <button type="button" onClick={() => toggleSection(item.id)} className="w-6 h-6 rounded hover:bg-gray-100 grid place-items-center text-gray-500 transition-transform" style={{ transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)' }}>
              ▾
            </button>
          )}
        </div>
        {item.hasChildren && isExpanded && (
          <div className="ml-3">
            {item.children.map(child => (
              <CheckboxRow key={child.id} item={child} isChild={true} />
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="w-full">
      <div className="p-4">
        {canCreateEvents && (
          <button type="button" className="w-full flex items-center justify-between gap-3 px-4 h-12 rounded-2xl shadow-sm border border-[#990100] hover:shadow transition text-[#990100] hover:bg-[#990100]/5" onClick={onCreateClick}>
            <div className="flex items-center gap-3">
              <span className="text-xl font-semibold">+</span>
              <span className="text-sm font-semibold">Create</span>
            </div>
          </button>
        )}

        <div className="mt-4 rounded-2xl border border-gray-200 p-3">
          <MiniMonthCalendar value={selectedDate} onChange={onPickDate} />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-800">My calendars</p>
          </div>
          <div className="mt-2">{myCalendars.map((c) => <CheckboxRow key={c.id} item={c} />)}</div>
        </div>
      </div>
    </div>
  );
}

function DateCreateModal({
  open,
  onClose,
  date,
  setDate,
  title,
  setTitle,
  endDate,
  setEndDate,
  eventType,
  setEventType,
  description,
  setDescription,
  isEditMode,
  isConfirmModalOpen,
  isProcessing,
  onSave,
}) {
  
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape" && !isConfirmModalOpen) {
        onClose();
      }
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, isConfirmModalOpen]);

  if (!open) return null;

  const dateLabel = date
    ? new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "";

  const endDateLabel = endDate
    ? new Date(endDate).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <button type="button" className="absolute inset-0 bg-black/40"
        onClick={() => {
          if (!isConfirmModalOpen) {
            onClose();
          }
        }}
        aria-label="Close create modal overlay"
      />

      <div className="relative w-[min(92vw,500px)]">
        <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200 bg-white">
          <div className="flex items-center justify-end px-4 py-3">
            <button
              type="button"
              onClick={() => {
                if (!isConfirmModalOpen) {
                  onClose();
                }
              }}
              className="w-9 h-9 rounded-full bg-[#990100] text-white hover:bg-[#990100]/80 grid place-items-center lg:text-lg"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pb-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEditMode ? "Edit event title" : "Add event title"}
              className="w-full bg-transparent text-xl font-semibold text-[#990100] placeholder:text-gray-500 outline-none border-b-2 border-[#990100] pb-2"
              autoFocus
            />

            <div className="mt-6 space-y-4 text-gray-800">
              {/* Start Date */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 grid place-items-center">📅</div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-800">Start Date</label>
                  <input type="date" value={date || ""} onChange={(e) => setDate(e.target.value)} className="mt-2 w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm"/>
                  {date && (
                    <div className="text-xs text-gray-600 mt-1">{dateLabel}</div>
                  )}
                </div>
              </div>

              {/* End Date for multi-day events */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 grid place-items-center">📆</div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-800">End Date (Optional)</label>
                  <input type="date" value={endDate || ""} onChange={(e) => setEndDate(e.target.value)} min={date} className="mt-2 w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm"/>
                  {endDate && (
                    <div className="text-xs text-gray-600 mt-1">{endDateLabel}</div>
                  )}
                </div>
              </div>

              {/* Event Type */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 grid place-items-center">🏷️</div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-800">Event Type</label>
                  <select value={eventType} onChange={(e) => setEventType(e.target.value)} className="mt-2 w-full h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm">
                    <option value="company_event">Company Event</option>
                    <option value="holiday">Holiday</option>
                    <option value="meeting">Meeting</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 grid place-items-center">📝</div>
                <div className="flex-1">
                  <label className="text-sm font-semibold text-gray-800">Description (Optional)</label>
                  <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Add description..." rows="3" className="mt-2 w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm resize-none"/>
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" onClick={onClose} disabled={isProcessing} className="lg:h-10 md:h-9 h-8 px-4 rounded-lg border border-[#990100] text-[#990100] bg-white hover:text-[#990100]/70 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition duration-300">
                Cancel
              </button>
              <button type="button" onClick={onSave} disabled={isProcessing} className="lg:h-10 md:h-9 h-8 px-4 rounded-lg bg-[#990100] text-white hover:bg-[#990100]/90 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 transition duration-300">
                {isProcessing ? (isEditMode ? "Updating..." : "Saving...") : (isEditMode ? "Update" : "Save")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const calendarRef = useRef(null);
  const { user } = useAuth();
  const today = new Date();
  const [selectedDate, setSelectedDate] = useState(today);

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bp, setBp] = useState(() => {
    const w = typeof window === "undefined" ? 1200 : window.innerWidth;
    return {
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isDesktop: w >= 1024,
    };
  });

  const [viewTitle, setViewTitle] = useState("");
  const [allEvents, setAllEvents] = useState([]); 
  const [loading, setLoading] = useState(false);
  const [currentDateRange, setCurrentDateRange] = useState({ start: null, end: null });

  const [enabledTypes, setEnabledTypes] = useState([
    "leave",
    "evaluation",
    "birthday",
    "event",
  ]);

  const [enabledSubTypes, setEnabledSubTypes] = useState([
    "holiday",
    "meeting",
    "company_event",
    "leave-approved",
    "leave-pending",
  ]);

  // filtering of events based on enabled types and sub-types
  const filteredEvents = useMemo(() => {
    return allEvents.filter(event => {
      const eventType = event.extendedProps?.type;

      if (!eventType) return false;

      if (eventType === 'event' || eventType === 'holiday') {
        
        const eventSubType = event.extendedProps?.eventType; // e.g., 'holiday', 'meeting', 'company_event'

        if (!enabledTypes.includes('event')) return false;

        return eventSubType && enabledSubTypes.includes(eventSubType);
      }

      if (eventType === 'leave') {
        
        if (!enabledTypes.includes('leave')) return false;

        const status = event.extendedProps?.status;
        if (!status) return true;

        const isApproved = status.toLowerCase() === 'approved';
        const isPending = status.toLowerCase() === 'pending';

        if (isApproved && enabledSubTypes.includes('leave-approved')) return true;
        if (isPending && enabledSubTypes.includes('leave-pending')) return true;

        return false;
      }

      return enabledTypes.includes(eventType);
    });
  }, [allEvents, enabledTypes, enabledSubTypes]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [createTitle, setCreateTitle] = useState("");
  const [createEndDate, setCreateEndDate] = useState("");
  const [createEventType, setCreateEventType] = useState("company_event");
  const [createDescription, setCreateDescription] = useState("");
  const [editingEventId, setEditingEventId] = useState(null); 
  const [editingFromDetails, setEditingFromDetails] = useState(false); 

  // event details modal state
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState(null);

  // confirmation/alert modal state
  const [modalState, setModalState] = useState({
    open: false,
    title: "",
    message: "",
    confirmText: "OK",
    onConfirm: null,
    onCancel: null,
  });

  const showAlert = (title, message) => {
    setModalState({
      open: true,
      title,
      message,
      confirmText: "OK",
      onConfirm: () => setModalState((prev) => ({ ...prev, open: false })),
      onCancel: null,
    });
  };

  const showConfirm = (title, message, onConfirmAction) => {
    setModalState({
      open: true,
      title,
      message,
      confirmText: "Confirm",
      onConfirm: () => {
        setModalState((prev) => ({ ...prev, open: false }));
        onConfirmAction();
      },
      onCancel: () => setModalState((prev) => ({ ...prev, open: false })),
    });
  };

  // fetch calendar events from API 
  const fetchEvents = async (start, end) => {
    if (!start || !end) return;

    setLoading(true);
    try {
      const params = new URLSearchParams({
        start: start.toISOString().split('T')[0],
        end: end.toISOString().split('T')[0],
      });

      const response = await get(`/calendar/events?${params.toString()}`);

      if (response.success) {
        setAllEvents(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      setAllEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentDateRange.start && currentDateRange.end) {
      fetchEvents(currentDateRange.start, currentDateRange.end);
    }
  }, [currentDateRange]);

  const toggleType = (typeId) => {
    setEnabledTypes(prev =>
      prev.includes(typeId)
        ? prev.filter(t => t !== typeId)
        : [...prev, typeId]
    );
  };

  const toggleSubType = (subTypeId) => {
    setEnabledSubTypes(prev =>
      prev.includes(subTypeId)
        ? prev.filter(t => t !== subTypeId)
        : [...prev, subTypeId]
    );
  };

  useEffect(() => {
    const onResize = () => {
      const w = window.innerWidth;
      setBp({
        isMobile: w < 640,
        isTablet: w >= 640 && w < 1024,
        isDesktop: w >= 1024,
      });
    };

    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") {
        setSidebarOpen(false);
        setCreateOpen(false);
        setDetailsModalOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sidebarOpen && !createOpen && !detailsModalOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, createOpen, detailsModalOpen]);

  const pickDate = (d) => {
    setSelectedDate(d);
    const api = calendarRef.current?.getApi?.();
    if (api) api.gotoDate(d);
    setSidebarOpen(false);
  };

  const goPrev = () => calendarRef.current?.getApi?.()?.prev?.();
  const goNext = () => calendarRef.current?.getApi?.()?.next?.();
  const goToday = () => calendarRef.current?.getApi?.()?.today?.();

  const openCreateForDate = (iso) => {
    setCreateDate(iso);
    setCreateOpen(true);
    setCreateTitle("");
    setCreateEndDate("");
    setCreateEventType("company_event");
    setCreateDescription("");
    setEditingEventId(null);  
    setEditingFromDetails(false);
  };

  const handleCreateClick = () => {
    const dateToUse = selectedDate || new Date();
    const isoDate = dateToUse.toISOString().split('T')[0];
    openCreateForDate(isoDate);
  };

  const closeCreate = () => {
    setCreateOpen(false);
    setEditingEventId(null);

    if (editingFromDetails) {
      setEditingFromDetails(false);
      setDetailsModalOpen(true);
    }
  };

  const saveCreate = async () => {
    // only Executive/HR can create events
    const canCreate = user?.role === ROLES.EXECUTIVE || user?.role === ROLES.HR;
    if (!canCreate) {
      showAlert("Permission Denied", "You don't have permission to create events. Only Executive and HR can create company events.");
      setCreateOpen(false);
      return;
    }

    if (!createDate || !createTitle.trim()) {
      showAlert("Validation Error", "Please enter a title for the event");
      return;
    }

    // validate end date is not before start date
    if (createEndDate && createEndDate < createDate) {
      showAlert("Validation Error", "End date cannot be before start date");
      return;
    }

    const baseTitle = createTitle.trim();

    try {
      setLoading(true);

      const eventData = {
        title: baseTitle,
        event_date: createDate,
        event_type: createEventType,
        is_recurring: false,
      };

      // ddd optional fields if provided
      if (createEndDate) {
        eventData.end_date = createEndDate;
      }

      if (createDescription.trim()) {
        eventData.description = createDescription.trim();
      }

      // call backend API
      let response;
      if (editingEventId) {
        // editingEventId is the actual database UUID
        response = await put(`/calendar/events/${editingEventId}`, eventData);
      } else {
        response = await post('/calendar/events', eventData);
      }

      if (response.success) {
        // refresh events after creation/update
        if (currentDateRange.start && currentDateRange.end) {
          await fetchEvents(currentDateRange.start, currentDateRange.end);
        }
        setCreateOpen(false);
        setEditingEventId(null);
        setEditingFromDetails(false);
        showAlert("Success", editingEventId ? "Event updated successfully!" : "Event created successfully!");
      } else {
        showAlert("Error", `Failed to ${editingEventId ? 'update' : 'create'} event: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error(`Error ${editingEventId ? 'updating' : 'creating'} event:`, error);
      showAlert("Error", `Error ${editingEventId ? 'updating' : 'creating'} event: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditEvent = (eventData) => {
    const originalStartDate = eventData.extendedProps?.originalDate || eventData.startStr?.split('T')[0];
    const originalEndDate = eventData.extendedProps?.originalEndDate;

    setCreateDate(originalStartDate);
    setCreateTitle(eventData.title || "");
    setCreateEndDate(originalEndDate || "");
    setCreateEventType(eventData.extendedProps?.eventType || "company_event");
    setCreateDescription(eventData.extendedProps?.description || "");
    setEditingEventId(eventData.extendedProps?.recordId);
    setEditingFromDetails(true);

    setDetailsModalOpen(false);
    setCreateOpen(true);
  };

  const handleDeleteEvent = (eventData) => {
    showConfirm(
      "Delete Event",
      `Are you sure you want to delete "${eventData.title}"?\n\nThis action cannot be undone.`,
      async () => {
        // user confirmed deletion
        try {
          setLoading(true);

          const eventId = eventData.extendedProps?.recordId;

          const response = await del(`/calendar/events/${eventId}`);

          if (response.success) {
            if (currentDateRange.start && currentDateRange.end) {
              await fetchEvents(currentDateRange.start, currentDateRange.end);
            }
            setDetailsModalOpen(false);
            setSelectedEvent(null);
            showAlert("Success", "Event deleted successfully!");
          } else {
            showAlert("Error", `Failed to delete event: ${response.message || 'Unknown error'}`);
          }
        } catch (error) {
          console.error('Error deleting event:', error);
          showAlert("Error", `Error deleting event: ${error.message || 'Unknown error'}`);
        } finally {
          setLoading(false);
        }
      }
    );
  };

  return (
    <div>
      <Navbar />

      <style>{`
        @media (max-width: 640px) {
          .fc .fc-daygrid-day-number {
            font-size: 0.75rem;
            padding: 4px;
          }
          .fc .fc-daygrid-day-top {
            justify-content: center;
          }
          .fc .fc-daygrid-day-frame {
            padding: 2px;
          }
          .fc .fc-daygrid-event {
            font-size: 0.7rem;
          }
        }

        .fc {
          max-width: 100%;
        }
      `}</style>

      <div className="flex min-h-[calc(100vh-64px)]">
        <aside className="hidden lg:block w-[260px] shrink-0 border-r border-gray-200 bg-white sticky top-0 self-start max-h-screen overflow-y-auto">
          <CalendarSidebar
            selectedDate={selectedDate}
            onPickDate={pickDate}
            enabledTypes={enabledTypes}
            onToggleType={toggleType}
            enabledSubTypes={enabledSubTypes}
            onToggleSubType={toggleSubType}
            onCreateClick={handleCreateClick}
          />
        </aside>

        {sidebarOpen ? (
          <div className="lg:hidden fixed inset-0 z-50">
            <button
              type="button"
              className="absolute inset-0 bg-black/40"
              aria-label="Close sidebar overlay"
              onClick={() => setSidebarOpen(false)}
            />
            <div className="absolute left-0 top-0 h-full w-[min(92vw,360px)] bg-white border-r border-gray-200 shadow-xl overflow-y-auto">
              <div className="sticky top-0 bg-white border-b border-gray-200 p-3 flex items-center justify-between">
                <p className="text-sm font-bold text-[#990100]">Calendar options</p>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="w-9 h-9 rounded-full bg-[#990100] text-white hover:bg-[#990100]/80 grid place-items-center text-lg"
                  aria-label="Close sidebar"
                >
                  ✕
                </button>
              </div>
              <CalendarSidebar
                selectedDate={selectedDate}
                onPickDate={pickDate}
                enabledTypes={enabledTypes}
                onToggleType={toggleType}
                enabledSubTypes={enabledSubTypes}
                onToggleSubType={toggleSubType}
                onCreateClick={handleCreateClick}
              />
            </div>
          </div>
        ) : null}

        <main className="flex-1 bg-white min-w-0">
          <div className="p-4 sm:p-6 lg:p-7 md:mx-6 lg:mx-12">
            <div className="mb-4 flex flex-col items-center gap-3 text-center">
              <div>
                <h1 className="text-2xl lg:text-3xl font-bold text-[#990100] truncate">
                  {viewTitle}
                </h1>

                <div className="mt-3">
                  <div
                    className={
                      bp.isMobile
                        ? "grid grid-cols-3 items-center gap-2 justify-items-center"
                        : "flex items-center justify-center gap-2"
                    }
                  >
                    <button
                      type="button"
                      onClick={goPrev}
                      aria-label="Previous month"
                      className="lg:h-10 md:h-9 h-8 lg:w-10 md:w-9 w-8 rounded-lg border border-[#990100] bg-white text-[#990100] hover:bg-[#990100]/10 text-lg font-semibold flex items-center justify-center"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      onClick={goToday}
                      className={[
                        "lg:h-10 md:h-9 h-8 px-3 rounded-lg border text-sm font-semibold",
                        "border-[#990100] text-[#990100] bg-white hover:bg-[#990100]/10",
                        bp.isMobile ? "justify-self-center" : "",
                      ].join(" ")}
                    >
                      Today
                    </button>

                    <button
                      type="button"
                      onClick={goNext}
                      aria-label="Next month"
                      className="lg:h-10 md:h-9 h-8 lg:w-10 md:w-9 w-8 rounded-lg border border-[#990100] bg-white text-[#990100] hover:bg-[#990100]/10 text-lg font-semibold flex items-center justify-center"
                    >
                      &gt;
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setSidebarOpen(true)}
                  className="lg:hidden lg:h-10 md:h-9 h-8 px-3 rounded-lg border border-[#990100] bg-white text-[#990100] hover:bg-[#990100]/10 text-sm font-medium"
                >
                  Calendar Options
                </button>
              </div>
            </div>

            <hr className="border-[#990100] mb-6 mt-4" />

            <div className="w-full bg-white rounded-xl border border-gray-300 shadow-sm px-4 py-4 relative">
              {loading && (
                <div className="absolute top-0 left-0 right-0 z-10 bg-white/80 py-2 text-center rounded-t-xl">
                  <span className="text-sm text-gray-600">Loading events...</span>
                </div>
              )}
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                headerToolbar={false}
                footerToolbar={false}   
                datesSet={(arg) => {
                  try {
                    setViewTitle(arg?.view?.title || "");
                    if (arg?.start && arg?.end) {
                      setCurrentDateRange({ start: arg.start, end: arg.end });
                    }
                  } catch (error) {
                    console.error('Calendar datesSet error:', error);
                  }
                }}
                dateClick={(info) => {
                  setSelectedDate(info.date);
                  // Admin/HR/Executive can create events by clicking dates
                  const canCreate = user?.role === ROLES.EXECUTIVE || user?.role === ROLES.HR;
                  if (canCreate) {
                    openCreateForDate(info.dateStr);
                  }
                }}
                eventClick={(info) => {
                  info.jsEvent.preventDefault();
                  setSelectedEvent(info.event);
                  setDetailsModalOpen(true);
                }}
                eventContent={(arg) => {
                  const eventType = arg.event.extendedProps?.type;

                  // Handle leave events with status-based border colors
                  if (eventType === 'leave') {
                    const status = arg.event.extendedProps?.status || 'Pending';
                    const statusLower = status.toLowerCase();

                    // Get border color based on status
                    let borderColor = CALENDAR_COLORS.leave.pending; // Default
                    if (statusLower === 'approved') borderColor = CALENDAR_COLORS.leave.approved;
                    else if (statusLower === 'rejected' || statusLower === 'declined' || statusLower === 'disapproved') borderColor = CALENDAR_COLORS.leave.rejected;
                    else if (statusLower === 'cancelled') borderColor = CALENDAR_COLORS.leave.cancelled;

                    return (
                      <div className="gc-event-pill" style={{ background: CALENDAR_COLORS.leave.background, color: '#ffffff', borderLeft: `4px solid ${borderColor}`, paddingLeft: '8px' }} title={`${arg.event.title} (${status})`}>
                        {arg.event.title}
                      </div>
                    );
                  }

                  // get color for other event types
                  let bgColor = '#6B7280'; // Default gray
                  const eventSubType = arg.event.extendedProps?.eventType;

                  if (eventType === 'birthday') bgColor = CALENDAR_COLORS.birthday;
                  else if (eventType === 'evaluation') bgColor = CALENDAR_COLORS.evaluation;
                  else if (eventType === 'holiday' || eventSubType === 'holiday') bgColor = CALENDAR_COLORS.holiday;
                  else if (eventType === 'event' || eventSubType === 'meeting') {
                    if (eventSubType === 'meeting') bgColor = CALENDAR_COLORS.meeting;
                    else if (eventSubType === 'company_event') bgColor = CALENDAR_COLORS.company_event;
                    else if (eventSubType === 'holiday') bgColor = CALENDAR_COLORS.holiday;
                  }

                  return (
                    <div className="gc-event-pill" style={{ background: bgColor, color: "#ffffff" }} title={arg.event.title}>
                      {arg.event.title}
                    </div>
                  );
                }}
                events={filteredEvents}
                height="auto"
                fixedWeekCount={false}
                expandRows={true}
                showNonCurrentDates={!bp.isMobile}
                dayMaxEvents={true}
                moreLinkClick="popover"
                eventOrder="title"
                eventDisplay="block"
                eventOrderStrict={true}
              />
            </div>
          </div>
        </main>
      </div>

      <DateCreateModal
        open={createOpen}
        onClose={closeCreate}
        date={createDate}
        setDate={setCreateDate}
        title={createTitle}
        setTitle={setCreateTitle}
        endDate={createEndDate}
        setEndDate={setCreateEndDate}
        eventType={createEventType}
        setEventType={setCreateEventType}
        description={createDescription}
        setDescription={setCreateDescription}
        isEditMode={!!editingEventId}
        isConfirmModalOpen={modalState.open}
        isProcessing={loading}
        onSave={saveCreate}
      />

      <EventDetailsModal
        open={detailsModalOpen}
        data={selectedEvent}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedEvent(null);
        }}
        onEdit={handleEditEvent}
        onDelete={handleDeleteEvent}
        isConfirmModalOpen={modalState.open}
        isProcessing={loading}
      />

      <ConfirmModal
        open={modalState.open}
        title={modalState.title}
        message={modalState.message}
        confirmText={modalState.confirmText}
        cancelText="Cancel"
        onConfirm={modalState.onConfirm}
        onCancel={modalState.onCancel}
      />
    </div>
  );
}