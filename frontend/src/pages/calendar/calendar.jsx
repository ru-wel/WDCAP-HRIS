import React, { useMemo, useRef, useState, useEffect } from "react";
import Navbar from "../../components/navbar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./calendar.css";

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
        {["S", "M", "T", "W", "T", "F", "S"].map((w) => (
          <div key={w} className="text-center">
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

function CalendarSidebar({ selectedDate, onPickDate }) {
  const [search, setSearch] = useState("");

  const myCalendars = useMemo(
    () => [
      { id: "birthdays", label: "Birthdays", checked: true, color: "#0B8043" },
      { id: "events", label: "Events", checked: true, color: "#A142F4" },
      { id: "tasks", label: "Tasks", checked: true, color: "#F29900" },
    ],
    []
  );

  const filterList = (list) =>
    !search.trim() ? list : list.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()));

  const CheckboxRow = ({ item }) => (
    <label className="flex items-center gap-3 py-2 cursor-pointer select-none">
      <input type="checkbox" defaultChecked={item.checked} className="accent-[#990100]" />
      <span className="w-3 h-3 rounded-sm" style={{ backgroundColor: item.color }} />
      <span className="text-sm text-gray-800">{item.label}</span>
    </label>
  );

  return (
    <div className="w-full">
      <div className="p-4">
        <button
          type="button"
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-2xl shadow-sm border border-gray-200 hover:shadow transition"
          onClick={() => alert("Create (UI only)")}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl font-semibold text-gray-700">+</span>
            <span className="text-sm font-semibold text-gray-800">Create</span>
          </div>
          <span className="text-gray-500">▾</span>
        </button>

        <div className="mt-4 rounded-2xl border border-gray-200 p-3">
          <MiniMonthCalendar value={selectedDate} onChange={onPickDate} />
        </div>

        <div className="mt-4">
          <button
            type="button"
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-gray-700"
          >
            <span className="text-lg">👤</span>
            <span className="text-sm font-medium">Search for people</span>
          </button>
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-800">Booking pages</p>
            <button className="w-8 h-8 rounded-full hover:bg-gray-100 grid place-items-center">+</button>
          </div>
        </div>

        <div className="mt-4">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter calendars"
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-gray-300"
          />
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between px-1">
            <p className="text-sm font-semibold text-gray-800">My calendars</p>
            <button className="w-8 h-8 rounded-full hover:bg-gray-100 grid place-items-center">▾</button>
          </div>
          <div className="mt-2">{filterList(myCalendars).map((c) => <CheckboxRow key={c.id} item={c} />)}</div>
        </div>

        <div className="mt-10 px-1 text-[12px] text-gray-500">Terms · Privacy</div>
      </div>
    </div>
  );
}

function DateCreateModal({
  open,
  onClose,
  date,
  tab,
  setTab,
  title,
  setTitle,
  allDay,
  setAllDay,
  startTime,
  setStartTime,
  endTime,
  setEndTime,
  onSave,
}) {
  if (!open) return null;

  const dateLabel = date
    ? new Date(date).toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" })
    : "";

  return (
    <div className="fixed inset-0 z-[60]">
      <button
        type="button"
        className="absolute inset-0 bg-black/30"
        onClick={onClose}
        aria-label="Close create modal overlay"
      />

      <div className="absolute left-4 top-4 right-4 sm:right-auto sm:left-6 sm:top-6 w-[min(92vw,620px)]">
        <div className="rounded-3xl overflow-hidden shadow-2xl border border-gray-200 bg-[#F4F6F8]">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              className="w-9 h-9 rounded-full hover:bg-black/5 grid place-items-center"
              aria-label="Menu"
            >
              ☰
            </button>

            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 rounded-full hover:bg-black/5 grid place-items-center text-lg"
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="px-6 pb-5">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Add title and time"
              className="w-full bg-transparent text-3xl sm:text-4xl font-semibold text-gray-800 placeholder:text-gray-500 outline-none border-b-2 border-[#990100] pb-3"
              autoFocus
            />

            <div className="mt-5 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTab("event")}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold",
                  tab === "event" ? "bg-[#990100]/10 text-[#990100]" : "hover:bg-black/5 text-gray-700",
                ].join(" ")}
              >
                Event
              </button>
              <button
                type="button"
                onClick={() => setTab("task")}
                className={[
                  "px-4 py-2 rounded-xl text-sm font-semibold",
                  tab === "task" ? "bg-[#990100]/10 text-[#990100]" : "hover:bg-black/5 text-gray-700",
                ].join(" ")}
              >
                Task
              </button>
            </div>

            <div className="mt-6 space-y-4 text-gray-800">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 grid place-items-center">🕒</div>
                <div className="flex-1">
                  <div className="text-sm font-semibold">
                    {dateLabel}
                    {allDay ? null : " · "}
                    {allDay ? null : "Time"}
                  </div>
                  <div className="text-xs text-gray-600 mt-0.5">Doesn&apos;t repeat</div>

                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={allDay}
                        onChange={(e) => setAllDay(e.target.checked)}
                        className="accent-[#990100]"
                      />
                      All day
                    </label>

                    {!allDay ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={startTime}
                          onChange={(e) => setStartTime(e.target.value)}
                          className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                        <span className="text-gray-500 text-sm">-</span>
                        <input
                          type="time"
                          value={endTime}
                          onChange={(e) => setEndTime(e.target.value)}
                          className="h-9 px-3 rounded-lg border border-gray-200 bg-white text-sm"
                        />
                      </div>
                    ) : null}

                    <button
                      type="button"
                      className="ml-auto h-9 px-4 rounded-full border border-[#990100] text-[#990100] bg-white hover:bg-[#990100]/10 text-sm font-semibold"
                      onClick={() => setAllDay(false)}
                    >
                      Add time
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white border border-gray-200 grid place-items-center">📅</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">Default calendar</div>
                  <div className="text-xs text-gray-600">Free · Default visibility</div>
                </div>
                <span className="ml-2 inline-block w-3 h-3 rounded-full bg-[#990100]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const calendarRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 1));

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bp, setBp] = useState(() => {
    const w = typeof window === "undefined" ? 1200 : window.innerWidth;
    return {
      isMobile: w < 640,
      isTablet: w >= 640 && w < 1024,
      isDesktop: w >= 1024,
    };
  });

  const [viewTitle, setViewTitle] = useState("January 2026");

  const [events, setEvents] = useState(() => [
    { id: "rizal", title: "Rizal Day", date: "2026-01-30", color: "#0B8043" },
    { id: "nye", title: "New Year's Eve", date: "2025-12-31", color: "#0B8043" },
    { id: "nyd", title: "New Year's Day", date: "2026-01-01", color: "#0B8043" },
    { id: "lailatul", title: "Lailatul Isra Wal Mi Raj (tentative)", date: "2026-01-16", color: "#0B8043" },
  ]);

  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState(null);
  const [createTab, setCreateTab] = useState("event");
  const [createTitle, setCreateTitle] = useState("");
  const [createAllDay, setCreateAllDay] = useState(true);
  const [createStartTime, setCreateStartTime] = useState("09:00");
  const [createEndTime, setCreateEndTime] = useState("10:00");

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
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!sidebarOpen && !createOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [sidebarOpen, createOpen]);

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
    setCreateTab("event");
    setCreateTitle("");
    setCreateAllDay(true);
    setCreateStartTime("09:00");
    setCreateEndTime("10:00");
  };

  const closeCreate = () => setCreateOpen(false);

  const saveCreate = () => {
    if (!createDate) return;

    const baseTitle = createTitle.trim() || "(No title)";
    const id = `${Date.now()}`;

    if (createAllDay) {
      setEvents((prev) => [
        ...prev,
        {
          id,
          title: baseTitle,
          date: createDate,
          color: "#990100",
        },
      ]);
    } else {
      setEvents((prev) => [
        ...prev,
        {
          id,
          title: baseTitle,
          start: `${createDate}T${createStartTime}:00`,
          end: `${createDate}T${createEndTime}:00`,
          color: "#990100",
        },
      ]);
    }

    setCreateOpen(false);
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
        <aside className="hidden lg:block w-[300px] shrink-0 border-r border-gray-200 bg-white">
          <CalendarSidebar selectedDate={selectedDate} onPickDate={pickDate} />
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
                <p className="text-sm font-semibold text-gray-800">Calendar options</p>
                <button
                  type="button"
                  onClick={() => setSidebarOpen(false)}
                  className="w-9 h-9 rounded-lg hover:bg-gray-100 grid place-items-center text-lg"
                  aria-label="Close sidebar"
                >
                  ✕
                </button>
              </div>
              <CalendarSidebar selectedDate={selectedDate} onPickDate={pickDate} />
            </div>
          </div>
        ) : null}

        <main className="flex-1 bg-white min-w-0">
          <div className="p-3 sm:p-4 md:p-6">
            <div className="mb-3 sm:mb-4 flex flex-col items-center gap-3 text-center">
              <div>
                <h1 className="text-lg sm:text-xl md:text-2xl font-semibold text-gray-800 truncate">
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
                      className="h-9 w-9 rounded-lg border border-[#990100] bg-white text-[#990100] hover:bg-[#990100]/10 text-lg font-semibold flex items-center justify-center"
                    >
                      &lt;
                    </button>

                    <button
                      type="button"
                      onClick={goToday}
                      className={[
                        "h-9 px-3 rounded-lg border text-sm font-semibold",
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
                      className="h-9 w-9 rounded-lg border border-[#990100] bg-white text-[#990100] hover:bg-[#990100]/10 text-lg font-semibold flex items-center justify-center"
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
                  className="lg:hidden px-3 py-2 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700"
                >
                  Options
                </button>
              </div>
            </div>

            <div className="w-full">
              <FullCalendar
                ref={calendarRef}
                plugins={[dayGridPlugin, interactionPlugin]}
                initialView="dayGridMonth"
                initialDate="2026-01-01"
                headerToolbar={false}
                footerToolbar={false}
                datesSet={(arg) => {
                  try {
                    setViewTitle(arg?.view?.title || "");
                  } catch {}
                }}
                dateClick={(info) => {
                  setSelectedDate(info.date);
                  openCreateForDate(info.dateStr);
                }}
                events={events}
                height="auto"
                fixedWeekCount={false}
                showNonCurrentDates={!bp.isMobile}
                dayMaxEventRows={bp.isMobile ? 1 : 3}
                eventDisplay="block"
              />
            </div>
          </div>
        </main>
      </div>

      <DateCreateModal
        open={createOpen}
        onClose={closeCreate}
        date={createDate}
        tab={createTab}
        setTab={setCreateTab}
        title={createTitle}
        setTitle={setCreateTitle}
        allDay={createAllDay}
        setAllDay={setCreateAllDay}
        startTime={createStartTime}
        setStartTime={setCreateStartTime}
        endTime={createEndTime}
        setEndTime={setCreateEndTime}
        onSave={saveCreate}
      />
    </div>
  );
}