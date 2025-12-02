import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Navbar from "./components/navbar";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../assets/styles/calendar.css";

function StatCard({ title, icon, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left focus:outline-none"
    >
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-[2px] transition duration-200 ease-in-out">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#990100]">{value}</p>
        </div>
        <img
          src={icon}
          alt={`${title} icon`}
          className="w-9 h-9 opacity-90"
        />
      </div>
    </button>
  );
}

function Greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Morning";
  if (hour < 18) return "Afternoon";
  return "Evening";
}

function CalendarModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md mx-4">
        <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-[#990100]">Calendar</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-[#990100] text-xl leading-none"
          >
            ✕
          </button>
        </div>

        <div className="p-6 flex items-center justify-center">
          <div className="flex justify-center w-full">
            <Calendar className="rounded-lg border border-gray-300 p-3" />
          </div>
        </div>
      </div>
    </div>
  );
}

function Dashboard() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const navigate = useNavigate();

  return (
    <div>
      <Navbar />

      <div className="px-6 lg:px-10 py-6">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#990100]">
              Good <Greeting />, Reuel Christian!
            </h1>
            <p className="text-sm text-gray-500">
              Here’s a quick overview of your organization today.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="self-start md:self-auto text-xs md:text-sm bg-[#990100] hover:bg-[#ad3332] text-white px-4 py-2 rounded-full font-medium shadow-sm transition duration-200 ease-in-out"
          >
            View Calendar
          </button>
        </header>

        <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
          <StatCard
            title="Employees"
            icon="icons/red-employees.png"
            value="20"
            onClick={() => navigate("/employees")}
          />
          <StatCard
            title="Ongoing Projects"
            icon="icons/red-projects.png"
            value="5"
            onClick={() => navigate("/projects")}
          />
          <StatCard
            title="Leave Requests"
            icon="icons/red-leave.png"
            value="8"
            onClick={() => navigate("/leave")}
          />
          <StatCard
            title="Total Departments"
            icon="icons/red-departments.png"
            value="12"
            onClick={() => navigate("/employees/departments")}
          />
        </section>

        <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
                Pending Evaluations
              </h2>
              <span className="text-xs px-3 py-1 rounded-full bg-[#ad3332] text-white">
                1 Pending
              </span>
            </div>

            <div className="overflow-hidden rounded-lg border border-[#e5e5e5]">
              <table className="min-w-full text-sm">
                <thead className="bg-[#ad3332] text-white">
                  <tr>
                    <th className="px-4 py-2 text-left font-medium">Name</th>
                    <th className="px-4 py-2 text-left font-medium">Position</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="bg-white hover:bg-[#f9f1f1] transition-colors">
                    <td className="px-4 py-2 text-gray-900">Lance Cabe</td>
                    <td className="px-4 py-2 text-gray-900">Web Developer</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Monitor employees who are due for performance evaluation.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
            <h2 className="text-lg md:text-xl font-semibold text-[#990100] mb-4">
              Audit Logs
            </h2>

            <div className="space-y-3">
              <div className="flex items-start justify-between border-b border-[#f0dede] pb-3">
                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">r.sundiam@acdc.ph</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Onboarding</p>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-[#ad3332] text-white">
                  Employee
                </span>
              </div>

              <div className="flex items-start justify-between border-b border-[#f0dede] pb-3">
                <div>
                  <p className="text-sm text-gray-900">
                    <span className="font-semibold">g.delossantos@acdc.ph</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">Logged in</p>
                </div>
                <span className="text-[11px] px-2 py-1 rounded-full bg-[#ad3332] text-white">
                  User
                </span>
              </div>
            </div>

            <p className="mt-3 text-xs text-gray-500">
              Recent account activities for monitoring and compliance.
            </p>
          </div>
        </section>
      </div>

      <CalendarModal
        open={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />
    </div>
  );
}

export default Dashboard;