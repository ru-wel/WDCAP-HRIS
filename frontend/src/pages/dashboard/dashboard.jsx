import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Calendar from "react-calendar";
import "react-calendar/dist/Calendar.css";
import "../../assets/styles/calendar.css";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";
import { get } from "../../services/api.js";

function StatCard({ title, icon, value, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full text-left focus:outline-none cursor-pointer"
    >
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-4 flex items-center justify-between shadow-sm hover:shadow-md hover:-translate-y-[2px] transition duration-200 ease-in-out">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            {title}
          </p>
          <p className="mt-2 text-2xl font-semibold text-[#990100]">{value}</p>
        </div>
        <img src={icon} alt={`${title} icon`} className="w-9 h-9 opacity-90" />
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-x-hidden">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-[#990100]">
            Calendar
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-500 hover:text-[#990100] text-xl leading-none cursor-pointer"
          >
            ✕
          </button>
        </div>

        <div className="p-4 sm:p-6 flex items-center justify-center overflow-x-hidden">
          <div className="flex justify-center w-full min-w-0 overflow-x-hidden">
            <Calendar className="rounded-lg border border-gray-300 p-2 sm:p-3 w-full max-w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}

const toNumberOrNull = (value) => {
  if (value === null || typeof value === "undefined") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeSummary = (payload) => {
  const src = payload && typeof payload === "object" ? payload : {};

  const recentAuditLogs = Array.isArray(src.recentAuditLogs)
    ? src.recentAuditLogs
    : [];
  const pendingEvaluations = Array.isArray(src.pendingEvaluations)
    ? src.pendingEvaluations
    : [];

  return {
    role: typeof src.role === "string" ? src.role : "",
    pendingLeaveRequestsCount: toNumberOrNull(src.pendingLeaveRequestsCount),
    employeesCount: toNumberOrNull(src.employeesCount),
    departmentsCount: toNumberOrNull(src.departmentsCount),
    activeProjectsCount: toNumberOrNull(src.activeProjectsCount),
    pendingEvaluationsCount: toNumberOrNull(src.pendingEvaluationsCount),
    pendingEvaluations: pendingEvaluations
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        evaluation_id: r.evaluation_id,
        employee_id: r.employee_id,
        employee_code: typeof r.employee_code === "string" ? r.employee_code : "",
        employee_name: typeof r.employee_name === "string" ? r.employee_name : "",
        position_title:
          typeof r.position_title === "string" ? r.position_title : "",
        evaluation_date: r.evaluation_date,
        evaluation_type:
          typeof r.evaluation_type === "string" ? r.evaluation_type : "",
      })),
    recentAuditLogs: recentAuditLogs
      .filter((r) => r && typeof r === "object")
      .map((r) => ({
        id: r.id,
        action_type: typeof r.action_type === "string" ? r.action_type : "",
        table_name: typeof r.table_name === "string" ? r.table_name : "",
        record_id: typeof r.record_id === "string" ? r.record_id : "",
        old_values:
          r.old_values && typeof r.old_values === "object" ? r.old_values : null,
        new_values:
          r.new_values && typeof r.new_values === "object" ? r.new_values : null,
        timestamp: r.timestamp,
        actor:
          r.actor && typeof r.actor === "object"
            ? {
                name: typeof r.actor.name === "string" ? r.actor.name : "",
                email: typeof r.actor.email === "string" ? r.actor.email : "",
                role: typeof r.actor.role === "string" ? r.actor.role : "",
                employeeCode:
                  typeof r.actor.employee_code === "string"
                    ? r.actor.employee_code
                    : null,
              }
            : null,
        targetEmployee:
          r.target_employee && typeof r.target_employee === "object"
            ? {
                id:
                  typeof r.target_employee.id === "string"
                    ? r.target_employee.id
                    : null,
                employeeCode:
                  typeof r.target_employee.employee_code === "string"
                    ? r.target_employee.employee_code
                    : null,
                name:
                  typeof r.target_employee.name === "string"
                    ? r.target_employee.name
                    : null,
              }
            : null,
        targetProject:
          r.target_project && typeof r.target_project === "object"
            ? {
                id:
                  typeof r.target_project.id === "string"
                    ? r.target_project.id
                    : null,
                name:
                  typeof r.target_project.name === "string"
                    ? r.target_project.name
                    : null,
              }
            : null,
        user: {
          email: typeof r.user?.email === "string" ? r.user.email : "",
          role: typeof r.user?.role === "string" ? r.user.role : "",
        },
      })),
  };
};

const formatShortDate = (value) => {
  if (!value) return "—";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "2-digit",
    year: "numeric",
  });
};

function ExecutiveDashboard({ loading, summary, statValues, navigate }) {
  return (
    <>
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Employees"
          icon="icons/red-employees.png"
          value={loading ? "…" : statValues.employees}
          onClick={() => navigate("/employees")}
        />
        <StatCard
          title="Ongoing Projects"
          icon="icons/red-projects.png"
          value={loading ? "…" : statValues.activeProjects}
          onClick={() => navigate("/projects")}
        />
        <StatCard
          title="Pending Evaluations"
          icon="icons/sidenav/red-evaluation.png"
          value={loading ? "…" : statValues.pendingEvaluations}
          onClick={() => navigate("/evaluation")}
        />
        <StatCard
          title="Leave Requests"
          icon="icons/red-leave.png"
          value={loading ? "…" : statValues.pendingLeaves}
          onClick={() => navigate("/leave/request")}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
              Pending Evaluations
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-[#ad3332] text-white">
              {loading ? "…" : statValues.pendingEvaluations}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="min-w-[420px] w-full text-sm">
              <thead className="bg-[#ad3332] text-white">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Position</th>
                </tr>
              </thead>
              <tbody>
                {!loading && summary.pendingEvaluations.length ? (
                  summary.pendingEvaluations.slice(0, 5).map((row) => (
                    <tr
                      key={String(row.evaluation_id || row.employee_id)}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const id = row?.employee_id;
                        if (!id) return;
                        navigate(
                          `/evaluation/history?employeeId=${encodeURIComponent(
                            String(id)
                          )}`
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        const id = row?.employee_id;
                        if (!id) return;
                        navigate(
                          `/evaluation/history?employeeId=${encodeURIComponent(
                            String(id)
                          )}`
                        );
                      }}
                      className="bg-white cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-gray-900">
                        {(row.employee_code || row.employee_name)
                          ? `${row.employee_code || ""}${
                              row.employee_code && row.employee_name ? " - " : ""
                            }${row.employee_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {row.position_title || "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td className="px-4 py-2 text-gray-900" colSpan={2}>
                      {loading ? "Loading…" : "No pending evaluations."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Executive overview of employees due for evaluation.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
            Dates to Remember (This Week)
          </h2>

          <div className="px-2">
            <div className="border-b border-[#f0dede] py-3">
              <p className="font-semibold pb-1.5 bg-[#ad3332] px-3 py-1.5 mb-3 text-white rounded-lg">
                Jan 12 | Monday
              </p>

              <div className="px-4 md:grid md:grid-cols-2">
                <p className="pb-1.5 text-sm">- Executive sync / key updates</p>
                <p className="pb-1.5 text-sm">- Evaluation checkpoints</p>
                <p className="pb-1.5 text-sm">- Client / stakeholder meetings</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function HRDashboard({ loading, summary, statValues, navigate }) {
  return (
    <>
      <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Employees"
          icon="icons/red-employees.png"
          value={loading ? "…" : statValues.employees}
          onClick={() => navigate("/employees")}
        />
        <StatCard
          title="Total Departments"
          icon="icons/red-departments.png"
          value={loading ? "…" : statValues.departments}
          onClick={() => navigate("/employees/departments")}
        />
        <StatCard
          title="Leave Requests"
          icon="icons/red-leave.png"
          value={loading ? "…" : statValues.pendingLeaves}
          onClick={() => navigate("/leave/request")}
        />
        <StatCard
          title="Pending Evaluations"
          icon="icons/sidenav/red-evaluation.png"
          value={loading ? "…" : statValues.pendingEvaluations}
          onClick={() => navigate("/evaluation")}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
              Pending Evaluations
            </h2>
            <span className="text-xs px-3 py-1 rounded-full bg-[#ad3332] text-white">
              {loading ? "…" : statValues.pendingEvaluations}
            </span>
          </div>

          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="min-w-[420px] w-full text-sm">
              <thead className="bg-[#ad3332] text-white">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Name</th>
                  <th className="px-4 py-2 text-left font-medium">Position</th>
                </tr>
              </thead>
              <tbody>
                {!loading && summary.pendingEvaluations.length ? (
                  summary.pendingEvaluations.slice(0, 5).map((row) => (
                    <tr
                      key={String(row.evaluation_id || row.employee_id)}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const id = row?.employee_id;
                        if (!id) return;
                        navigate(
                          `/evaluation/history?employeeId=${encodeURIComponent(
                            String(id)
                          )}`
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        const id = row?.employee_id;
                        if (!id) return;
                        navigate(
                          `/evaluation/history?employeeId=${encodeURIComponent(
                            String(id)
                          )}`
                        );
                      }}
                      className="bg-white cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-gray-900">
                        {(row.employee_code || row.employee_name)
                          ? `${row.employee_code || ""}${
                              row.employee_code && row.employee_name ? " - " : ""
                            }${row.employee_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {row.position_title || "N/A"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td className="px-4 py-2 text-gray-900" colSpan={2}>
                      {loading ? "Loading…" : "No pending evaluations."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            HR overview for evaluation tracking and coordination.
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
            Dates to Remember (This Week)
          </h2>

          <div className="px-2">
            <div className="border-b border-[#f0dede] py-3">
              <p className="font-semibold pb-1.5 bg-[#ad3332] px-3 py-1.5 mb-3 text-white rounded-lg">
                Jan 12 | Monday
              </p>

              <div className="px-4 md:grid md:grid-cols-2">
                <p className="pb-1.5 text-sm">- Onboarding / HR reminders</p>
                <p className="pb-1.5 text-sm">- Evaluation schedules</p>
                <p className="pb-1.5 text-sm">- Leave approvals follow-ups</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function ManagerDashboard({
  loading,
  summary,
  statValues,
  navigate,
  setIsCalendarOpen,
}) {
  return (
    <>
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Pending Evaluations"
          icon="icons/sidenav/red-evaluation.png"
          value={loading ? "…" : statValues.pendingEvaluations}
          onClick={() => navigate("/evaluation")}
        />
        <StatCard
          title="Leave Requests"
          icon="icons/red-leave.png"
          value={loading ? "…" : statValues.pendingLeaves}
          onClick={() => navigate("/leave/request")}
        />
        <StatCard
          title="My Team"
          icon="icons/red-employees.png"
          value="View"
          onClick={() => navigate("/employees?scope=team")}
        />
        <StatCard
          title="My Projects"
          icon="icons/red-projects.png"
          value={loading ? "…" : statValues.activeProjects}
          onClick={() => navigate("/projects?scope=assigned")}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg md:text-xl font-semibold text-[#990100] mb-3">
            Pending Evaluations (To Do)
          </h2>

          <div className="overflow-x-auto rounded-lg border border-[#e5e5e5]">
            <table className="min-w-[420px] w-full text-sm">
              <thead className="bg-[#ad3332] text-white">
                <tr>
                  <th className="px-4 py-2 text-left font-medium">Employee</th>
                  <th className="px-4 py-2 text-left font-medium">Due Date</th>
                </tr>
              </thead>
              <tbody>
                {!loading && summary.pendingEvaluations.length ? (
                  summary.pendingEvaluations.slice(0, 5).map((row) => (
                    <tr
                      key={String(row.evaluation_id || row.employee_id)}
                      role="button"
                      tabIndex={0}
                      onClick={() => {
                        const eid = row?.evaluation_id;
                        if (!eid) return;
                        navigate(
                          `/evaluation/upload?evaluationId=${encodeURIComponent(
                            String(eid)
                          )}`
                        );
                      }}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" && e.key !== " ") return;
                        const eid = row?.evaluation_id;
                        if (!eid) return;
                        navigate(
                          `/evaluation/upload?evaluationId=${encodeURIComponent(
                            String(eid)
                          )}`
                        );
                      }}
                      className="bg-white cursor-pointer hover:bg-gray-50"
                    >
                      <td className="px-4 py-2 text-gray-900">
                        {(row.employee_code || row.employee_name)
                          ? `${row.employee_code || ""}${
                              row.employee_code && row.employee_name ? " - " : ""
                            }${row.employee_name || ""}`.trim()
                          : "—"}
                      </td>
                      <td className="px-4 py-2 text-gray-900">
                        {formatShortDate(row.evaluation_date)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr className="bg-white">
                    <td className="px-4 py-2 text-gray-900" colSpan={2}>
                      {loading ? "Loading…" : "No pending evaluations."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => navigate("/evaluation/history")}
            >
              My Eval History
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => navigate("/leave/history")}
            >
              My Leave History
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => navigate("/profile")}
            >
              My Profile
            </button>
            <button
              type="button"
              className="bg-[#990100] text-white rounded-md px-4 py-2 text-sm hover:bg-[#ad3332]"
              onClick={() => setIsCalendarOpen(true)}
            >
              Calendar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
            Dates to Remember (This Week)
          </h2>

          <div className="px-2">
            <div className="border-b border-[#f0dede] py-3">
              <p className="font-semibold pb-1.5 bg-[#ad3332] px-3 py-1.5 mb-3 text-white rounded-lg">
                Jan 12 | Monday
              </p>

              <div className="px-4 md:grid md:grid-cols-2">
                <p className="pb-1.5 text-sm">- Team check-ins</p>
                <p className="pb-1.5 text-sm">- Evaluation deadlines</p>
                <p className="pb-1.5 text-sm">- Leave reminders</p>
              </div>
            </div>
          </div>

          <p className="mt-3 text-xs text-gray-500">
            Weekly reminders for your team and deliverables.
          </p>
        </div>
      </section>
    </>
  );
}

function EmployeeDashboard({
  loading,
  nextEval,
  statValues,
  navigate,
  setIsCalendarOpen,
  isProjectBased,
}) {
  return (
    <>
      <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Leave Remarks"
          icon="icons/red-leave.png"
          value="View"
          onClick={() => navigate("/leave/history")}
        />
        <StatCard
          title="Next Evaluation"
          icon="icons/sidenav/red-evaluation.png"
          value={loading ? "…" : nextEval.date}
          onClick={() => navigate("/evaluation/history")}
        />
        {isProjectBased ? null : (
          <StatCard
            title="Projects"
            icon="icons/red-projects.png"
            value={loading ? "…" : statValues.activeProjects}
            onClick={() => navigate("/projects")}
          />
        )}
        <StatCard
          title="Leave Request"
          icon="icons/red-leave.png"
          value="Open"
          onClick={() => navigate("/leave/request")}
        />
      </section>

      <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
            Dates to Remember (This Week)
          </h2>

          <div className="px-2">
            <div className="border-b border-[#f0dede] py-3">
              <p className="font-semibold pb-1.5 bg-[#ad3332] px-3 py-1.5 mb-3 text-white rounded-lg">
                Jan 12 | Monday
              </p>

              <div className="px-4 md:grid md:grid-cols-2">
                <p className="pb-1.5 text-sm">- Weekly check-in</p>
                <p className="pb-1.5 text-sm">- Evaluation reminders</p>
                <p className="pb-1.5 text-sm">- Project updates</p>
              </div>
            </div>
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => navigate("/evaluation/history")}
            >
              My Evaluation History
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => navigate("/leave/history")}
            >
              My Leave History
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
              onClick={() => navigate("/profile")}
            >
              My Profile
            </button>
            <button
              type="button"
              className="bg-[#990100] text-white rounded-md px-4 py-2 text-sm hover:bg-[#ad3332]"
              onClick={() => setIsCalendarOpen(true)}
            >
              Calendar
            </button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <h2 className="text-lg md:text-xl font-semibold text-[#990100] mb-2">
            Quick Links
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-3 text-sm hover:bg-gray-50 text-left"
              onClick={() => navigate("/calendar")}
            >
              Calendar
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-3 text-sm hover:bg-gray-50 text-left"
              onClick={() => navigate("/projects")}
            >
              Projects
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-3 text-sm hover:bg-gray-50 text-left"
              onClick={() => navigate("/leave/request")}
            >
              Leave Request
            </button>
            <button
              type="button"
              className="bg-white border border-gray-300 rounded-md px-4 py-3 text-sm hover:bg-gray-50 text-left"
              onClick={() => navigate("/evaluation/history")}
            >
              Evaluation History
            </button>
          </div>
        </div>
      </section>
    </>
  );
}

function Dashboard() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [summary, setSummary] = useState(() => normalizeSummary(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();

  const role = user?.role;

  const isExecutive = role === ROLES.EXECUTIVE;
  const isHr = role === ROLES.HR;
  const isManager = role === ROLES.MANAGER;
  const isEmployee = role === ROLES.EMPLOYEE;

  const [isProjectBased, setIsProjectBased] = useState(false);

  const rawName = String(user?.name || "").trim();
  const safeName = rawName && !rawName.includes("@") ? rawName : "";

  const displayName =
    safeName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    (isExecutive
      ? "Executive"
      : isHr
      ? "HR"
      : isManager
      ? "Manager"
      : isEmployee
      ? "Employee"
      : "") ||
    user?.email ||
    "";

  useEffect(() => {
    let cancelled = false;
    let lastFetchTime = 0;
    const COOLDOWN_MS = 30000;

    const run = async () => {
      try {
        setLoading(true);
        setError("");

        const res = await get("/dashboard/summary");
        const normalized = normalizeSummary(res?.data);

        if (!cancelled) {
          setSummary(normalized);
          lastFetchTime = Date.now();
        }
      } catch (e) {
        if (!cancelled) {
          setSummary(normalizeSummary(null));
          setError(e?.message || "Failed to load dashboard data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refresh = () => {
      if (cancelled) return;
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (timeSinceLastFetch < COOLDOWN_MS) return;
      run();
    };

    run();
    window.addEventListener("focus", refresh);
    const onVisibility = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener("focus", refresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isEmployee) {
        setIsProjectBased(false);
        return;
      }
      try {
        const res = await get("/employees/me");
        const personnel = String(res?.data?.personnel_type || "")
          .trim()
          .toLowerCase();
        if (!cancelled)
          setIsProjectBased(
            personnel === "project-based" || personnel === "project based"
          );
      } catch {
        if (!cancelled) setIsProjectBased(false);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isEmployee]);

  const statValues = useMemo(() => {
    return {
      employees: summary.employeesCount ?? "—",
      activeProjects: summary.activeProjectsCount ?? "—",
      departments: summary.departmentsCount ?? "—",
      pendingLeaves: summary.pendingLeaveRequestsCount ?? "—",
      pendingEvaluations: summary.pendingEvaluationsCount ?? "—",
    };
  }, [summary]);

  const nextEval = useMemo(() => {
    const list = Array.isArray(summary.pendingEvaluations)
      ? summary.pendingEvaluations
      : [];
    const first = list[0] || null;
    return first
      ? {
          date: formatShortDate(first.evaluation_date),
          type: first.evaluation_type || "",
        }
      : { date: "—", type: "" };
  }, [summary.pendingEvaluations]);

  return (
    <div>
      <div className="p-4 sm:p-6 lg:p-7 md:mx-10 lg:mx-[4.5rem]">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#990100]">
              Welcome{displayName ? `, ${displayName}!` : "!"}
            </h1>
            <p className="text-sm text-gray-500">
              Good <Greeting /> — here’s what’s happening today.
            </p>
          </div>
        </header>

        {error ? (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 text-sm text-[#990100]">
            {error}
          </div>
        ) : null}

        {isExecutive ? (
          <ExecutiveDashboard
            loading={loading}
            summary={summary}
            statValues={statValues}
            navigate={navigate}
          />
        ) : isHr ? (
          <HRDashboard
            loading={loading}
            summary={summary}
            statValues={statValues}
            navigate={navigate}
          />
        ) : isManager ? (
          <ManagerDashboard
            loading={loading}
            summary={summary}
            statValues={statValues}
            navigate={navigate}
            setIsCalendarOpen={setIsCalendarOpen}
          />
        ) : (
          <EmployeeDashboard
            loading={loading}
            nextEval={nextEval}
            statValues={statValues}
            navigate={navigate}
            setIsCalendarOpen={setIsCalendarOpen}
            isProjectBased={isProjectBased}
          />
        )}
      </div>

      <CalendarModal
        open={isCalendarOpen}
        onClose={() => setIsCalendarOpen(false)}
      />
    </div>
  );
}

export default Dashboard;