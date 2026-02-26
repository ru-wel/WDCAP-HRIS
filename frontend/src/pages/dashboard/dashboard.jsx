import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { useAuth } from "../../context/AuthContext.jsx";
import { ROLES } from "../../constants/config.js";
import { get } from "../../services/api.js";

const PROJECT_STATUS_COLORS = {
  Active: "#22c55e",
  Completed: "#2563eb",
  "On Hold": "#f59e0b",
};

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

const toNumberOrNull = (value) => {
  if (value === null || typeof value === "undefined") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeSummary = (payload) => {
  const src = payload && typeof payload === "object" ? payload : {};

  const pendingEvaluations = Array.isArray(src.pendingEvaluations)
    ? src.pendingEvaluations
    : [];

  return {
    pendingLeaveRequestsCount: toNumberOrNull(src.pendingLeaveRequestsCount),
    employeesCount: toNumberOrNull(src.employeesCount),
    activeProjectsCount: toNumberOrNull(src.activeProjectsCount),
    pendingEvaluationsCount: toNumberOrNull(src.pendingEvaluationsCount),
    onLeaveTodayCount: toNumberOrNull(src.onLeaveTodayCount),
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
  };
};

function Dashboard() {
  const [summary, setSummary] = useState(() => normalizeSummary(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  // Support both legacy single-role (user.role) and multi-role (user.roles)
  const userRoles = useMemo(() => {
    const raw = Array.isArray(user?.roles) ? user.roles : [user?.role];
    return raw
      .filter(Boolean)
      .map((r) => String(r).trim())
      .filter(Boolean);
  }, [user?.roles, user?.role]);

  const isEmployee = userRoles.includes(ROLES.EMPLOYEE);
  const isManager = userRoles.includes(ROLES.MANAGER);
  const isExecutive = userRoles.includes(ROLES.EXECUTIVE);
  const isHR = userRoles.includes(ROLES.HR);

  // Self dashboard = employee/manager widgets (My Dept, My Docs, etc.)
  const canSeeSelfDashboard = isEmployee || isManager;

  // Admin dashboard = Executive/HR widgets (company-wide pending evals + analytics)
  const canSeeAuditDashboard = isExecutive || isHR;
  // Show the admin dashboard if user is not in self-dashboard roles, or if they are Exec/HR (e.g. Executive + Manager)
  const showAdminDashboard = !canSeeSelfDashboard || canSeeAuditDashboard;

  // Employee/Manager quick context
  const [meDetails, setMeDetails] = useState(null);

  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [employeeStatusData, setEmployeeStatusData] = useState([]);
  const [employeesByPersonnelType, setEmployeesByPersonnelType] = useState([]);
  const [projectsByStatus, setProjectsByStatus] = useState([]);

  const [weekEvents, setWeekEvents] = useState([]);
  const [weekEventsLoading, setWeekEventsLoading] = useState(false);

  const [selfDataLoading, setSelfDataLoading] = useState(false);
  const [selfDataError, setSelfDataError] = useState("");
  const [myProjectsCount, setMyProjectsCount] = useState(null);
  const [nextEvalDate, setNextEvalDate] = useState(null);
  const [myLeaveCreditsTotal, setMyLeaveCreditsTotal] = useState(null);
  const [myDocsActionCount, setMyDocsActionCount] = useState(null);
  const [myDocsPendingItems, setMyDocsPendingItems] = useState([]);

  const rawName = String(user?.name || "").trim();
  const safeName = rawName && !rawName.includes("@") ? rawName : "";

  const roleLabel =
    isExecutive && isManager
      ? "Executive / Manager"
      : isExecutive
      ? "Executive"
      : isHR
      ? "HR"
      : isManager
      ? "Manager"
      : isEmployee
      ? "Employee"
      : "";

  const displayName =
    safeName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(" ").trim() ||
    roleLabel ||
    user?.email ||
    "";

  useEffect(() => {
    let cancelled = false;
    let lastFetchTime = 0;
    const COOLDOWN_MS = 30000; // 30 seconds cooldown to minimize API calls

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

      // prevent API refresh if data fetched recently (within 30 seconds)
      const timeSinceLastFetch = Date.now() - lastFetchTime;
      if (timeSinceLastFetch < COOLDOWN_MS) {
        return;
      }

      run();
    };

    run();

    // keep dashboard stats without requiring a full page reload.
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

  // Executive/HR-only: lightweight analytics for employees (active/inactive) and projects (by status)
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!canSeeAuditDashboard) {
        setAnalyticsLoading(false);
        setAnalyticsError("");
        setEmployeeStatusData([]);
        setEmployeesByPersonnelType([]);
        setProjectsByStatus([]);
        return;
      }

      try {
        setAnalyticsLoading(true);
        setAnalyticsError("");

        const res = await get("/analytics/summary");
        if (!res?.success)
          throw new Error(res?.message || "Failed to load analytics");
        const data = res?.data || {};

        if (cancelled) return;

        const normalizePairs = (rows, labelKeyCandidates, valueKeyCandidates) => {
          const list = Array.isArray(rows) ? rows : [];
          return list
            .filter((r) => r && typeof r === "object")
            .map((r) => {
              const labelKey =
                labelKeyCandidates.find((k) => typeof r?.[k] === "string") ||
                labelKeyCandidates[0];
              const valueKey =
                valueKeyCandidates.find((k) => r?.[k] !== undefined) ||
                valueKeyCandidates[0];
              const label = String(
                r?.[labelKey] ?? r?.name ?? r?.label ?? ""
              ).trim();
              const rawVal = r?.[valueKey] ?? r?.value ?? r?.count ?? r?.total;
              const value = Number(rawVal);
              return {
                name: label || "Unknown",
                value: Number.isFinite(value) ? value : 0,
              };
            })
            .filter((r) => r.name && Number.isFinite(r.value));
        };

        setEmployeeStatusData(
          normalizePairs(data.employeeStatusData, ["status", "name", "label"], [
            "count",
            "value",
            "total",
          ])
        );
        setEmployeesByPersonnelType(
          normalizePairs(data.employeesByPersonnelType, ["name", "label"], [
            "count",
            "value",
            "total",
          ])
        );
        setProjectsByStatus(
          normalizePairs(data.projectsByStatus, ["status", "name", "label"], [
            "count",
            "value",
            "total",
          ])
        );
      } catch (e) {
        if (!cancelled) setAnalyticsError(e?.message || "Failed to load analytics");
      } finally {
        if (!cancelled) setAnalyticsLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [canSeeAuditDashboard]);

  // Employee/Manager: load "me" details
  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!canSeeSelfDashboard) {
        setMeDetails(null);
        return;
      }

      try {
        const meRes = await get("/employees/me");
        const details = meRes?.data && typeof meRes.data === "object" ? meRes.data : null;
        if (!cancelled) setMeDetails(details);
      } catch {
        if (!cancelled) setMeDetails(null);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [canSeeSelfDashboard]);

  const isProjectBased = useMemo(() => {
    if (!isEmployee) return false;
    const type = String(meDetails?.personnel_type || "").trim().toLowerCase();
    return type === "project-based" || type === "project based";
  }, [isEmployee, meDetails?.personnel_type]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!canSeeSelfDashboard) {
        setMyProjectsCount(null);
        setNextEvalDate(null);
        setMyLeaveCreditsTotal(null);
        setMyDocsActionCount(null);
        setMyDocsPendingItems([]);
        setSelfDataError("");
        return;
      }
      setSelfDataLoading(true);
      setSelfDataError("");
      try {
        const [projectsRes, creditsRes, evalsRes, checklistRes] = await Promise.all([
          get("/projects/my").catch(() => null),
          get("/leave/credits/me").catch(() => null),
          get("/evaluations/me").catch(() => null),
          get("/onboarding/me/checklist").catch(() => null),
        ]);
        if (cancelled) return;

        const projects = Array.isArray(projectsRes?.data) ? projectsRes.data : [];
        setMyProjectsCount(projects.length);

        const credits = Array.isArray(creditsRes?.data) ? creditsRes.data : [];
        const total = credits.reduce((sum, c) => sum + (Number(c?.current_balance) || 0), 0);
        setMyLeaveCreditsTotal(total);

        const today = new Date().toISOString().split("T")[0];
        const evals = Array.isArray(evalsRes?.data) ? evalsRes.data : [];
        const upcoming = evals
          .filter((e) => {
            if (!e?.evaluation_date || String(e.evaluation_date) < today) return false;
            const hasDoc = !!e?.evaluation_document_path;
            const hasResult = /^\s*(score|remarks)\s*:/im.test(String(e?.evaluation_notes || ""));
            return !hasDoc && !hasResult;
          })
          .sort((a, b) => String(a.evaluation_date).localeCompare(String(b.evaluation_date)));
        setNextEvalDate(upcoming[0]?.evaluation_date || null);

        const checklist = Array.isArray(checklistRes?.data) ? checklistRes.data : [];
        const pendingItems = checklist.filter(
          (item) => item?.is_required && (item?.status === "pending" || item?.status === "rejected")
        );
        setMyDocsActionCount(pendingItems.length);
        setMyDocsPendingItems(pendingItems);
      } catch {
        if (!cancelled) {
          setMyProjectsCount(null);
          setMyLeaveCreditsTotal(null);
          setNextEvalDate(null);
          setMyDocsActionCount(null);
          setMyDocsPendingItems([]);
          setSelfDataError("Some dashboard data could not be loaded.");
        }
      } finally {
        if (!cancelled) setSelfDataLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [canSeeSelfDashboard]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setWeekEventsLoading(true);
        const now = new Date();
        const day = now.getDay(); 
        const diffToMonday = day === 0 ? -6 : 1 - day;
        const monday = new Date(now);
        monday.setDate(now.getDate() + diffToMonday);
        monday.setHours(0, 0, 0, 0);
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);

        const startStr = monday.toISOString().split("T")[0];
        const endStr = sunday.toISOString().split("T")[0];

        const res = await get(`/calendar/events?start=${startStr}&end=${endStr}`);
        if (cancelled) return;
        const events = Array.isArray(res?.data) ? res.data : [];
        const todayStr = now.toISOString().split("T")[0];
        setWeekEvents(
          events.filter(
            (e) =>
              e?.extendedProps?.type !== "leave" &&
              String(e?.start || "").split("T")[0] >= todayStr
          )
        );
      } catch {
        if (!cancelled) setWeekEvents([]);
      } finally {
        if (!cancelled) setWeekEventsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const departmentName =
    String(meDetails?.departments?.department_name || "").trim() || "—";

  const statValues = useMemo(() => {
    return {
      employees: summary.employeesCount ?? "—",
      activeProjects: summary.activeProjectsCount ?? "—",
      pendingLeaves: summary.pendingLeaveRequestsCount ?? "—",
      pendingEvaluations: summary.pendingEvaluationsCount ?? "—",
    };
  }, [summary]);

  const activeEmployeesCount = useMemo(() => {
    const norm = (v) => String(v || "").trim().toLowerCase();
    return employeeStatusData.find((r) => norm(r?.name) === "active")?.value ?? 0;
  }, [employeeStatusData]);

  const projectsStatusTotal = useMemo(() => {
    return projectsByStatus.reduce(
      (sum, r) => sum + (Number(r?.value) || 0),
      0
    );
  }, [projectsByStatus]);

  const weekEventsByDay = useMemo(() => {
    const map = new Map();
    for (const evt of weekEvents) {
      const dateKey = String(evt?.start || "").split("T")[0];
      if (!dateKey) continue;
      if (!map.has(dateKey)) map.set(dateKey, []);
      map.get(dateKey).push(evt);
    }

    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [weekEvents]);

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

        {canSeeSelfDashboard ? (
          <>
            <section
              className={`mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4 ${
                isManager || (isEmployee && !isProjectBased)
                  ? "lg:grid-cols-4 xl:grid-cols-4"
                  : "lg:grid-cols-3 xl:grid-cols-3"
              }`}
            >
              <StatCard
                title="My Department"
                icon="icons/red-departments.png"
                value={departmentName}
                onClick={() => navigate("/employees/departments")}
              />
              <StatCard
                title="Leave Credits"
                icon="icons/red-leave.png"
                value={selfDataLoading ? "…" : (myLeaveCreditsTotal !== null ? myLeaveCreditsTotal : "—")}
                onClick={() => navigate("/leave/my-leaves")}
              />
              <StatCard
                title="Next Evaluation"
                icon="icons/sidenav/red-evaluation.png"
                value={selfDataLoading ? "…" : (nextEvalDate
                  ? new Date(nextEvalDate + "T00:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" })
                  : "—")}
                onClick={() => navigate("/evaluation/my-evaluations")}
              />
              {isEmployee && isProjectBased ? null : (
                <StatCard
                  title="My Projects"
                  icon="icons/red-projects.png"
                  value={selfDataLoading ? "…" : (myProjectsCount !== null ? myProjectsCount : "—")}
                  onClick={() => navigate("/projects")}
                />
              )}
            </section>

            {selfDataError && (
              <p className="mt-3 text-xs text-[#990100]">{selfDataError}</p>
            )}

            <section className="mt-8 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
                      My Documents
                    </h2>
                    {!selfDataLoading && myDocsActionCount !== null && myDocsActionCount > 0 && (
                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-red-100 text-red-700 font-semibold">
                        {myDocsActionCount} pending
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate("/employees/my-documents")}
                    className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50"
                  >
                    Open
                  </button>
                </div>

                <div className="mt-3 rounded-lg border border-gray-200 overflow-hidden">
                  <ul data-lenis-prevent className="divide-y divide-gray-200 max-h-[420px] overflow-y-auto">
                    {selfDataLoading ? (
                      <li className="px-4 py-3 text-sm text-gray-500">Loading…</li>
                    ) : myDocsPendingItems.length ? (
                      myDocsPendingItems.map((item) => (
                        <li
                          key={String(item?.id)}
                          className="px-4 py-3 text-sm flex items-center justify-between gap-3"
                        >
                          <p className="text-gray-900 font-medium truncate">
                            {String(item?.onboarding_items?.item_name || "Document").trim()}
                          </p>
                          <span className={`shrink-0 text-xs px-2.5 py-0.5 rounded-full font-semibold ${
                            item?.status === "rejected"
                              ? "bg-red-100 text-red-700"
                              : "bg-gray-100 text-gray-600"
                          }`}>
                            {item?.status === "rejected" ? "Rejected" : "Pending Upload"}
                          </span>
                        </li>
                      ))
                    ) : (
                      <li className="px-4 py-3 text-sm text-green-700 font-medium">
                        ✓ All required documents submitted
                      </li>
                    )}
                  </ul>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Required documents pending submission or re-upload.
                </p>
              </div>

              {!showAdminDashboard && (
                <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                  <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
                    Events for the Week
                  </h2>
                  <div data-lenis-prevent className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border border-gray-100 pr-1">
                    {weekEventsLoading ? (
                      <p className="text-sm text-gray-500 px-2 py-3">Loading events…</p>
                    ) : weekEventsByDay.length === 0 ? (
                      <p className="text-sm text-gray-500 px-2 py-3">No events this week.</p>
                    ) : (
                      weekEventsByDay.map(([dateKey, events]) => {
                        const date = new Date(dateKey + "T00:00:00");
                        const dayLabel = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
                        const weekdayLabel = date.toLocaleDateString("en-US", { weekday: "long" });
                        return (
                          <div key={dateKey} className="border-b border-[#f0dede] py-3 last:border-b-0">
                            <p className="font-semibold bg-[#ad3332] px-3 py-1.5 mb-3 text-white rounded-lg text-sm">
                              {dayLabel} | {weekdayLabel}
                            </p>
                            <ul className="px-4 space-y-1">
                              {events.map((evt, idx) => (
                                <li key={String(evt?.id || idx)} className="text-sm text-gray-800">
                                  — {String(evt?.title || "").replace(/^🎂\s*/, "🎂 ")}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              )}
            </section>
          </>
        ) : null}

        {showAdminDashboard ? (
          <>
            <section className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    Evaluations Due This Month
                  </h2>
                  <span className="text-xs px-3 py-1 rounded-full bg-[#ad3332] text-white">
                    {loading ? "…" : statValues.pendingEvaluations}
                  </span>
                </div>

                <div data-lenis-prevent className="overflow-x-auto overflow-y-auto max-h-[280px] rounded-lg border border-[#e5e5e5]">
                  <table className="min-w-[600px] w-full text-sm">
                    <thead className="bg-[#ad3332] text-white">
                      <tr>
                        <th className="px-4 py-2 text-left font-medium">Name</th>
                        <th className="px-4 py-2 text-left font-medium">Position</th>
                        <th className="px-4 py-2 text-left font-medium">Type</th>
                        <th className="px-4 py-2 text-left font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {!loading && summary.pendingEvaluations.length ? (
                        summary.pendingEvaluations.map((row) => (
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
                              {row.employee_code || row.employee_name
                                ? `${row.employee_code || ""}${
                                    row.employee_code && row.employee_name
                                      ? " - "
                                      : ""
                                  }${row.employee_name || ""}`.trim()
                                : "—"}
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {row.position_title || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-gray-900">
                              {row.evaluation_type || "N/A"}
                            </td>
                            <td className="px-4 py-2 text-gray-900 whitespace-nowrap">
                              {row.evaluation_date
                                ? new Date(row.evaluation_date + "T00:00:00").toLocaleDateString("en-US", {
                                    month: "short",
                                    day: "numeric",
                                    year: "numeric",
                                  })
                                : "N/A"}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr className="bg-white">
                          <td className="px-4 py-2 text-gray-900" colSpan={4}>
                            {loading ? "Loading…" : "No pending evaluations."}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Monitor employees who are due for performance evaluation.
                </p>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
                  Events for the Week
                </h2>

                <div data-lenis-prevent className="mt-3 max-h-[420px] overflow-y-auto rounded-lg border border-gray-100 pr-1">
                  {weekEventsLoading ? (
                    <p className="text-sm text-gray-500 px-2 py-3">Loading events…</p>
                  ) : weekEventsByDay.length === 0 ? (
                    <p className="text-sm text-gray-500 px-2 py-3">No events this week.</p>
                  ) : (
                    weekEventsByDay.map(([dateKey, events]) => {
                      const date = new Date(dateKey + "T00:00:00");
                      const dayLabel = date.toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      });
                      const weekdayLabel = date.toLocaleDateString("en-US", {
                        weekday: "long",
                      });
                      return (
                        <div key={dateKey} className="border-b border-[#f0dede] py-3 last:border-b-0">
                          <p className="font-semibold bg-[#ad3332] px-3 py-1.5 mb-3 text-white rounded-lg text-sm">
                            {dayLabel} | {weekdayLabel}
                          </p>
                          <ul className="px-4 space-y-1">
                            {events.map((evt, idx) => (
                              <li key={String(evt?.id || idx)} className="text-sm text-gray-800" >
                                — {String(evt?.title || "").replace(/^🎂\s*/, "🎂 ")}
                              </li>
                            ))}
                          </ul>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </section>

            {canSeeAuditDashboard ? (
              <section className="mt-8 bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
                  <div>
                    <h2 className="text-lg md:text-xl font-semibold text-[#990100]">
                      Data Overview
                    </h2>
                    <p className="text-xs text-gray-500 mt-1">
                      Employees & projects snapshot (Executive/HR only)
                    </p>
                  </div>

                  <button
                    type="button"
                    className="bg-white border border-gray-300 rounded-md px-4 py-2 text-sm hover:bg-gray-50"
                    onClick={() => navigate("/data-overview")}
                  >
                    Open full Data Overview
                  </button>
                </div>

                {analyticsError ? (
                  <div className="mb-4 bg-white border border-gray-200 rounded-lg p-3 text-sm text-[#990100]">
                    {analyticsError}
                  </div>
                ) : null}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      On Leave Today
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#990100]">
                      {loading ? "…" : (summary.onLeaveTodayCount ?? "—")}
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Active Employees
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#990100]">
                      {analyticsLoading ? "…" : activeEmployeesCount}
                    </p>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Total Projects
                    </p>
                    <p className="mt-2 text-2xl font-semibold text-[#990100]">
                      {analyticsLoading ? "…" : projectsStatusTotal}
                    </p>
                  </div>
                </div>

                <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Employee Type
                    </h3>
                    <div className="h-[280px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={employeesByPersonnelType}
                            dataKey="value"
                            nameKey="name"
                            innerRadius={50}
                            outerRadius={78}
                            paddingAngle={2}
                          >
                            {employeesByPersonnelType.map((_, idx) => (
                              <Cell
                                key={idx}
                                fill={[
                                  "#990100",
                                  "#2563EB",
                                  "#F59E0B",
                                  "#22C55E",
                                  "#6B7280",
                                ][idx % 5]}
                              />
                            ))}
                          </Pie>
                          <Tooltip />
                          <Legend iconType="circle" iconSize={10} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  <div className="bg-white border border-gray-200 rounded-xl p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">
                      Projects by Status
                    </h3>
                    <div className="h-[240px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={projectsByStatus}
                          margin={{ top: 10, right: 10, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                          <Tooltip />
                          <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                            {projectsByStatus.map((entry, index) => (
                              <Cell
                                key={index}
                                fill={
                                  PROJECT_STATUS_COLORS[entry.name] || "#64748b"
                                }
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              </section>
            ) : null}

          </>
        ) : null}
      </div>
    </div>
  );
}

export default Dashboard;