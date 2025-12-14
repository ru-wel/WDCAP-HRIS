import React, { useEffect, useMemo, useRef, useState } from "react";
import Navbar from "./components/navbar";
import DropDownFilter from "./components/dropdownfilter";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./leave-page/leave.css";

function formatPrettyDate(iso) {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function EventPopover({ open, anchor, data, onClose }) {
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
                  {formatPrettyDate(data.date)}
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
const rawEvents = [
  {
    id: "1",
    title: "Reuel Christian Sundiam - SIL",
    date: "2025-12-15",
    pillBg: "#FFE1A3",
    pillText: "#FF8A00",
    dotColor: "#F59E0B",
  },
  {
    id: "2",
    title: "Lance Paolo Cabe - SIL",
    date: "2025-12-05",
    pillBg: "#FFE1A3",
    pillText: "#FF8A00",
    dotColor: "#F59E0B",
  },
];

  const calendarEvents = useMemo(
    () =>
      rawEvents.map((e) => ({
        id: e.id,
        title: e.title,
        date: e.date,
        backgroundColor: "transparent",
        borderColor: "transparent",
        textColor: "inherit",
        extendedProps: {
          title: e.title,
          date: e.date,
          dotColor: e.dotColor,
          category: e.category,
          calendarName: e.calendarName,
          visibility: e.visibility,
          pillBg: e.pillBg,
          pillText: e.pillText,
        },
      })),
    []
  );

  const [popoverOpen, setPopoverOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [anchor, setAnchor] = useState({ x: 200, y: 200 });

  return (
    <div>
      <Navbar />
      <div className="p-7 lg:mx-18 md:mx-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-3xl font-bold text-[#990100]">Leave</h1>
          <div className="flex gap-3">
            <DropDownFilter />
            <input
              type="search"
              placeholder="Search"
              className="border border-[#990100] rounded-lg px-3 h-9 text-sm"
            />
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
              eventDisplay="block"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "",
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
          </div>
        </div>
      </div>

      <EventPopover
        open={popoverOpen}
        anchor={anchor}
        data={selected}
        onClose={() => setPopoverOpen(false)}
      />
    </div>
  );
}