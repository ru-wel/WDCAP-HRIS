import React, { useMemo, useRef, useState } from "react";
import Navbar from "../../components/navbar";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import "./calendar.css";

function MiniMonthCalendar({ value, onChange }) {
  const [view, setView] = useState(() => new Date(value.getFullYear(), value.getMonth(), 1));

  const monthLabel = view.toLocaleDateString(undefined, { month: "long", year: "numeric" });

  const startOfMonth = new Date(view.getFullYear(), view.getMonth(), 1);
  const endOfMonth = new Date(view.getFullYear(), view.getMonth() + 1, 0);

  const start = new Date(startOfMonth);
  start.setDate(start.getDate() - start.getDay());

  const days = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    days.push(d);
  }

  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

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
                selected ? "bg-[#1A73E8] text-white" : "hover:bg-gray-100",
                !selected && isToday ? "border border-[#1A73E8] text-[#1A73E8]" : "",
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
      { id: "events", label: "Family", checked: true, color: "#A142F4" },
      { id: "tasks", label: "Tasks", checked: true, color: "#F29900" },
    ],
    []
  );

  const filterList = (list) =>
    !search.trim()
      ? list
      : list.filter((c) => c.label.toLowerCase().includes(search.toLowerCase()));

  const CheckboxRow = ({ item }) => (
    <label className="flex items-center gap-3 py-2 cursor-pointer select-none">
      <input type="checkbox" defaultChecked={item.checked} className="accent-[#1A73E8]" />
      <span
        className="w-3 h-3 rounded-sm"
        style={{ backgroundColor: item.color }}
      />
      <span className="text-sm text-gray-800">{item.label}</span>
    </label>
  );

  return (
    <aside className="w-[300px] shrink-0 border-r border-gray-200 bg-white hidden lg:block">
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
          <div className="mt-2">
            {filterList(myCalendars).map((c) => (
              <CheckboxRow key={c.id} item={c} />
            ))}
          </div>
        </div>

        <div className="mt-10 px-1 text-[12px] text-gray-500">
          Terms · Privacy
        </div>
      </div>
    </aside>
  );
}

export default function CalendarPage() {
  const calendarRef = useRef(null);
  const [selectedDate, setSelectedDate] = useState(new Date(2026, 0, 1));

  const events = useMemo(
    () => [
      { title: "Rizal Day", date: "2026-01-30", color: "#0B8043" },
      { title: "New Year's Eve", date: "2025-12-31", color: "#0B8043" },
      { title: "New Year's Day", date: "2026-01-01", color: "#0B8043" },
      { title: "Lailatul Isra Wal Mi Raj (tentative)", date: "2026-01-16", color: "#0B8043" },
      { title: "deadliest deadline jdn", date: "2026-01-20", color: "#1A73E8" },
    ],
    []
  );

  const pickDate = (d) => {
    setSelectedDate(d);
    const api = calendarRef.current?.getApi?.();
    if (api) api.gotoDate(d);
  };

  return (
    <div>
      <Navbar />

      <div className="flex">
        <CalendarSidebar selectedDate={selectedDate} onPickDate={pickDate} />

        <main className="flex-1 bg-white">
          <div className="p-6">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              initialDate="2026-01-01"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: "dayGridMonth",
              }}
              events={events}
              height="auto"
              fixedWeekCount={false}
              showNonCurrentDates={true}
            />
          </div>
        </main>
      </div>
    </div>
  );
}