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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 overflow-x-hidden">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-5 py-3 border-b border-gray-200">
          <h2 className="text-base sm:text-lg font-semibold text-[#990100]">Calendar</h2>
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
  if (value === null || typeof value === 'undefined') return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
};

const normalizeSummary = (payload) => {
  const src = payload && typeof payload === 'object' ? payload : {};

  const recentAuditLogs = Array.isArray(src.recentAuditLogs) ? src.recentAuditLogs : [];
  const pendingEvaluations = Array.isArray(src.pendingEvaluations) ? src.pendingEvaluations : [];

  return {
    role: typeof src.role === 'string' ? src.role : '',
    pendingLeaveRequestsCount: toNumberOrNull(src.pendingLeaveRequestsCount),
    employeesCount: toNumberOrNull(src.employeesCount),
    departmentsCount: toNumberOrNull(src.departmentsCount),
    activeProjectsCount: toNumberOrNull(src.activeProjectsCount),
    pendingEvaluationsCount: toNumberOrNull(src.pendingEvaluationsCount),
    pendingEvaluations: pendingEvaluations
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        evaluation_id: r.evaluation_id,
        employee_id: r.employee_id,
        employee_code: typeof r.employee_code === 'string' ? r.employee_code : '',
        employee_name: typeof r.employee_name === 'string' ? r.employee_name : '',
        position_title: typeof r.position_title === 'string' ? r.position_title : '',
        evaluation_date: r.evaluation_date,
        evaluation_type: typeof r.evaluation_type === 'string' ? r.evaluation_type : ''
      })),
    recentAuditLogs: recentAuditLogs
      .filter((r) => r && typeof r === 'object')
      .map((r) => ({
        id: r.id,
        action_type: typeof r.action_type === 'string' ? r.action_type : '',
        table_name: typeof r.table_name === 'string' ? r.table_name : '',
        record_id: typeof r.record_id === 'string' ? r.record_id : '',
        old_values: r.old_values && typeof r.old_values === 'object' ? r.old_values : null,
        new_values: r.new_values && typeof r.new_values === 'object' ? r.new_values : null,
        timestamp: r.timestamp,
        actor: r.actor && typeof r.actor === 'object'
          ? {
            name: typeof r.actor.name === 'string' ? r.actor.name : '',
            email: typeof r.actor.email === 'string' ? r.actor.email : '',
            role: typeof r.actor.role === 'string' ? r.actor.role : '',
            employeeCode: typeof r.actor.employee_code === 'string' ? r.actor.employee_code : null,
          }
          : null,
        targetEmployee: r.target_employee && typeof r.target_employee === 'object'
          ? {
            id: typeof r.target_employee.id === 'string' ? r.target_employee.id : null,
            employeeCode: typeof r.target_employee.employee_code === 'string' ? r.target_employee.employee_code : null,
            name: typeof r.target_employee.name === 'string' ? r.target_employee.name : null,
          }
          : null,
        targetProject: r.target_project && typeof r.target_project === 'object'
          ? {
            id: typeof r.target_project.id === 'string' ? r.target_project.id : null,
            name: typeof r.target_project.name === 'string' ? r.target_project.name : null,
          }
          : null,
        user: {
          email: typeof r.user?.email === 'string' ? r.user.email : '',
          role: typeof r.user?.role === 'string' ? r.user.role : ''
        }
      }))
  };
};

const toTitleCase = (input) =>
  String(input || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');

const humanizeAuditEntity = (tableName) => {
  const t = String(tableName || '').trim().toLowerCase();
  if (!t) return '';
  const map = {
    employees: 'Employee',
    users: 'User Account',
    departments: 'Department',
    positions: 'Position',
    projects: 'Project',
    project_assignments: 'Project Assignment',
    leave_requests: 'Leave Request',
    leave_types: 'Leave Type',
    employee_leave_balances: 'Leave Credits',
    onboarding_checklists: '201 File',
    onboarding_items: 'Onboarding Item',
    documents: '201 File',
    reports: 'Report',
    evaluation: 'Evaluation',
    performance_evaluations: 'Evaluation',
  };
  if (map[t]) return map[t];
  const cleaned = t.replace(/_/g, ' ');
  return toTitleCase(cleaned);
};

const pickAuditTarget = (row) => {
  const table = String(row?.table_name || '').trim().toLowerCase();
  const preferred = row?.new_values && typeof row.new_values === 'object' ? row.new_values : null;
  const fallback = row?.old_values && typeof row.old_values === 'object' ? row.old_values : null;
  const v = preferred || fallback || {};

  const targetEmployeeLabel = (() => {
    const name = String(row?.targetEmployee?.name || '').trim();
    const code = String(row?.targetEmployee?.employeeCode || '').trim();
    if (name && code) return `${name} (${code})`;
    if (name) return name;
    if (code) return code;
    return '';
  })();

  if (table === 'employees') {
    const empId = String(v.employee_id || v.employee_code || '').trim();
    if (empId) return empId;
    const fn = String(v.first_name || '').trim();
    const ln = String(v.last_name || '').trim();
    const full = `${fn} ${ln}`.trim();
    if (full) return full;
  }
  if (table === 'users') {
    const email = String(v.email || '').trim();
    if (email) return email;
  }
  if (table === 'departments') {
    const name = String(v.department_name || v.name || '').trim();
    if (name) return name;
  }
  if (table === 'projects') {
    const name = String(v.project_name || v.name || '').trim();
    if (name) return name;
  }
  if (table === 'leave_requests') {
    const id = String(v.leave_request_id || v.id || '').trim();
    const shortId = id && /^[0-9a-f-]{20,}$/i.test(id) ? id.slice(0, 8) : id;
    const who = String(
      targetEmployeeLabel ||
        v.employee_name ||
        v.name ||
        (v.employees
          ? `${String(v.employees?.first_name || '').trim()} ${String(v.employees?.last_name || '').trim()}`.trim()
          : '') ||
        v.employee_id ||
        ''
    ).trim();
    const type = String(v.leave_type_name || v.type || '').trim();
    const label = [who, type].filter(Boolean).join(' - ');
    if (label && shortId) return `${label} (#${shortId})`;
    if (label) return label;
    if (shortId) return `#${shortId}`;
  }

  if (table === 'employee_leave_balances') {
    const who = String(
      targetEmployeeLabel ||
        (v.employees
          ? `${String(v.employees?.first_name || '').trim()} ${String(v.employees?.last_name || '').trim()}`.trim()
          : '') ||
        v.employee_name ||
        v.employee_id ||
        ''
    ).trim();
    const type = String(v.leave_types?.leave_type_name || v.leave_type_name || '').trim();
    const label = [who, type].filter(Boolean).join(' - ');
    if (label) return label;
    return '';
  }
  if (table === 'leave_types') {
    const type = String(v.leave_type_name || v.name || '').trim();
    if (type) return type;
  }
  if (table === 'documents' || table === 'onboarding_checklists') {
    const file = String(v.file_name || v.filename || v.file_path || '').trim();
    if (file) return targetEmployeeLabel ? `${file} (${targetEmployeeLabel})` : file;
    if (targetEmployeeLabel) return targetEmployeeLabel;
  }
  if (table === 'project_assignments') {
    const empLabel = (() => {
      const name = String(row?.targetEmployee?.name || '').trim();
      const code = String(row?.targetEmployee?.employeeCode || '').trim();
      if (name && code) return `${name} (${code})`;
      return name || code || '';
    })();
    const projLabel = String(row?.targetProject?.name || v.project_name || '').trim();
    const label = [empLabel, projLabel].filter(Boolean).join(' → ');
    if (label) return label;
  }
  if (table === 'performance_evaluations' || table === 'evaluation') {
    const empCode = String(v.employee_code || v.employee_id || v.employees?.employee_id || '').trim();
    const empName = String(v.employee_name || `${v.employees?.first_name || ''} ${v.employees?.last_name || ''}`.trim()).trim();
    const type = String(v.evaluation_type || '').trim();

    const looksLikeUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || '').trim());
    const who = targetEmployeeLabel || ((empCode && !looksLikeUuid(empCode)) ? empCode : (empName || ''));
    const label = [who, type].filter(Boolean).join(' - ');
    if (label) return label;
  }

  const recordId = String(row?.record_id || '').trim();
  // Avoid showing raw UUIDs on the dashboard.
  if (recordId && !/^[0-9a-f]{8}-/i.test(recordId)) return recordId;
  return '';
};

const formatAuditAction = (row) => {
  const action = String(row?.action_type || '').toUpperCase();
  const table = String(row?.table_name || '');
  const entity = humanizeAuditEntity(table);
  const target = pickAuditTarget(row);
  const reportName = String(row?.new_values?.report_name || row?.new_values?.reportName || '').trim();
  const reportSource = String(row?.new_values?.source || '').trim();
  const requestedEmail = String(row?.new_values?.email || '').trim();
  if (action === 'LOGIN') return 'Logged in';
  if (action === 'LOGOUT') return 'Logged out';
  if (action === 'CREATE') return `${entity ? `Created ${entity}` : 'Created record'}${target ? ` — ${target}` : ''}`;
  if (action === 'UPDATE') return `${entity ? `Updated ${entity}` : 'Updated record'}${target ? ` — ${target}` : ''}`;
  if (action === 'DELETE') return `${entity ? `Deleted ${entity}` : 'Deleted record'}${target ? ` — ${target}` : ''}`;
  if (action === 'PASSWORD_RESET_REQUEST') {
    return requestedEmail ? `Password reset requested: ${requestedEmail}` : 'Password reset requested';
  }
  if (action === 'GENERATE_REPORT') {
    if (reportName) return `Generated report: ${reportName}`;
    if (reportSource) return `Generated report (${reportSource})`;
    return 'Generated report';
  }
  return `${action || 'Activity'}${entity ? ` ${entity}` : ''}${target ? ` — ${target}` : ''}`.trim();
};

const getAuditRouteForRow = (row) => {
  const action = String(row?.action_type || '').toUpperCase();
  const table = String(row?.table_name || '').trim().toLowerCase();
  const reportSource = String(row?.new_values?.source || '').trim().toLowerCase();

  // For report generation audit logs, table_name is the report source (users/employees/projects/etc).
  if (action === 'GENERATE_REPORT') {
    const effective = reportSource || table;
    if (effective === 'users') return '/audit/user-accounts';
    if (effective === 'employees') return '/audit/employees';
    if (effective === 'departments') return '/audit/departments';
    if (effective === 'projects') return '/audit/projects';
    if (effective === 'evaluation' || effective === 'performance_evaluations') return '/audit/evaluation';
    if (
      effective === 'leave' ||
      effective === 'leave_requests' ||
      effective === 'leave_types' ||
      effective === 'employee_leave_balances'
    ) {
      return '/audit/leave';
    }
    return '/audit/reports';
  }

  // Non-report audit logs
  if (table === 'users') return '/audit/user-accounts';
  if (table === 'employees') return '/audit/employees';
  if (table === 'departments') return '/audit/departments';
  if (table === 'projects') return '/audit/projects';
  if (table === 'project_assignments') return '/audit/projects';
  if (table === 'evaluation' || table === 'performance_evaluations') return '/audit/evaluation';
  if (
    table === 'leave' ||
    table === 'leave_requests' ||
    table === 'leave_types' ||
    table === 'employee_leave_balances'
  ) {
    return '/audit/leave';
  }
  // 201 files are part of Employees module in the UI
  if (table === 'documents' || table === 'onboarding_checklists' || table === 'onboarding_items') {
    return '/audit/employees';
  }
  if (table === 'reports') return '/audit/reports';

  return null;
};

function Dashboard() {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [summary, setSummary] = useState(() => normalizeSummary(null));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEmployee = user?.role === ROLES.EMPLOYEE;
  const canSeeAuditDashboard = user?.role === ROLES.ADMIN;
  const [isProjectBased, setIsProjectBased] = useState(false);

  const rawName = String(user?.name || '').trim();
  const safeName = rawName && !rawName.includes('@') ? rawName : '';

  const displayName =
    safeName ||
    [user?.first_name, user?.last_name].filter(Boolean).join(' ').trim() ||
    (user?.role === ROLES.ADMIN ? 'Admin' : user?.role === ROLES.HR ? 'HR' : '') ||
    user?.email ||
    '';

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      try {
        setLoading(true);
        setError('');

        const res = await get('/dashboard/summary');
        const normalized = normalizeSummary(res?.data);

        if (!cancelled) setSummary(normalized);
      } catch (e) {
        if (!cancelled) {
          setSummary(normalizeSummary(null));
          setError(e?.message || 'Failed to load dashboard data');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    const refresh = () => {
      if (cancelled) return;
      run();
    };

    refresh();

    // Keep dashboard stats current without requiring a full page reload.
    window.addEventListener('focus', refresh);
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refresh();
    };
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', refresh);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, []);

  // For employees: determine if project-based to hide Projects card
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!isEmployee) {
        setIsProjectBased(false);
        return;
      }
      try {
        const res = await get('/employees/me');
        const personnel = String(res?.data?.personnel_type || '').trim().toLowerCase();
        if (!cancelled) setIsProjectBased(personnel === 'project-based' || personnel === 'project based');
      } catch {
        if (!cancelled) setIsProjectBased(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, [isEmployee]);

  const statValues = useMemo(() => {
    return {
      employees: summary.employeesCount ?? '—',
      activeProjects: summary.activeProjectsCount ?? '—',
      departments: summary.departmentsCount ?? '—',
      pendingLeaves: summary.pendingLeaveRequestsCount ?? '—',
      pendingEvaluations: summary.pendingEvaluationsCount ?? '—'
    };
  }, [summary]);

  return (
    <div>
      <div className="p-4 sm:p-6 lg:p-7 md:mx-10 lg:mx-[4.5rem]">
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-[#990100]">
              Welcome{displayName ? `, ${displayName}!` : '!'}
            </h1>
            <p className="text-sm text-gray-500">
              Good <Greeting /> — here’s what’s happening today.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsCalendarOpen(true)}
            className="self-start md:self-auto text-xs md:text-sm bg-[#990100] hover:bg-[#ad3332] text-white px-4 py-2 rounded-full font-medium shadow-sm transition duration-200 ease-in-out cursor-pointer"
          >
            View Calendar
          </button>
        </header>

        {error ? (
          <div className="mt-4 bg-white border border-gray-200 rounded-lg p-3 text-sm text-[#990100]">
            {error}
          </div>
        ) : null}

        {isEmployee ? (
          <>
            <section className="mt-6 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Employees"
                icon="icons/red-employees.png"
                value="Open"
                onClick={() => navigate("/employees/departments")}
              />
              <StatCard
                title="Leave"
                icon="icons/red-leave.png"
                value={loading ? '…' : statValues.pendingLeaves}
                onClick={() => navigate("/leave/request")}
              />
              <StatCard
                title="Evaluation"
                icon="icons/sidenav/red-evaluation.png"
                value="View"
                onClick={() => navigate("/evaluation/history")}
              />
              {isProjectBased ? null : (
                <StatCard
                  title="Projects"
                  icon="icons/red-projects.png"
                  value={loading ? '…' : statValues.activeProjects}
                  onClick={() => navigate("/projects")}
                />
              )}
            </section>

            <section className="mt-8">
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-lg md:text-xl font-semibold text-[#990100] mb-4">
                  Recent Activity
                </h2>

                <div className="space-y-3">
                  {loading ? (
                    <div className="text-sm text-gray-600">Loading activity…</div>
                  ) : summary.recentAuditLogs.length ? (
                    summary.recentAuditLogs.slice(0, 5).map((row) => (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const route = getAuditRouteForRow(row);
                          if (route) navigate(route);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          const route = getAuditRouteForRow(row);
                          if (route) navigate(route);
                        }}
                        className="flex min-w-0 items-start justify-between gap-3 border-b border-[#f0dede] pb-3 rounded-md px-2 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold block truncate">
                              {row.user.email || 'Unknown user'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{formatAuditAction(row)}</p>
                        </div>
                        <span className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-[#ad3332] text-white">
                          {row.user.role || 'User'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">No recent activity.</div>
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Recent account activities for monitoring and compliance.
                </p>
              </div>
            </section>
          </>
        ) : (
          <>
            <section className="mt-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
              <StatCard
                title="Employees"
                icon="icons/red-employees.png"
                value={loading ? '…' : statValues.employees}
                onClick={() => navigate("/employees")}
              />
              <StatCard
                title="Ongoing Projects"
                icon="icons/red-projects.png"
                value={loading ? '…' : statValues.activeProjects}
                onClick={() => navigate("/projects")}
              />
              <StatCard
                title="Leave Requests"
                icon="icons/red-leave.png"
                value={loading ? '…' : statValues.pendingLeaves}
                onClick={() => navigate("/leave")}
              />
              <StatCard
                title="Total Departments"
                icon="icons/red-departments.png"
                value={loading ? '…' : statValues.departments}
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
                  {loading ? '…' : statValues.pendingEvaluations}
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
                            navigate(`/evaluation/history?employeeId=${encodeURIComponent(String(id))}`);
                          }}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter' && e.key !== ' ') return;
                            const id = row?.employee_id;
                            if (!id) return;
                            navigate(`/evaluation/history?employeeId=${encodeURIComponent(String(id))}`);
                          }}
                          className="bg-white cursor-pointer hover:bg-gray-50"
                        >
                          <td className="px-4 py-2 text-gray-900">
                            {(row.employee_code || row.employee_name)
                              ? `${row.employee_code || ''}${row.employee_code && row.employee_name ? ' - ' : ''}${row.employee_name || ''}`.trim()
                              : '—'}
                          </td>
                          <td className="px-4 py-2 text-gray-900">{row.position_title || 'N/A'}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className="bg-white">
                        <td className="px-4 py-2 text-gray-900" colSpan={2}>
                          {loading ? 'Loading…' : 'No pending evaluations.'}
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

            {canSeeAuditDashboard ? (
              <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                <h2 className="text-lg md:text-xl font-semibold text-[#990100] mb-4">
                  Audit Logs
                </h2>

                <div className="space-y-3">
                  {loading ? (
                    <div className="text-sm text-gray-600">Loading recent activity…</div>
                  ) : summary.recentAuditLogs.length ? (
                    summary.recentAuditLogs.slice(0, 5).map((row) => (
                      <div
                        key={row.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          const route = getAuditRouteForRow(row);
                          if (route) navigate(route);
                        }}
                        onKeyDown={(e) => {
                          if (e.key !== 'Enter' && e.key !== ' ') return;
                          const route = getAuditRouteForRow(row);
                          if (route) navigate(route);
                        }}
                        className="flex min-w-0 items-start justify-between gap-3 border-b border-[#f0dede] pb-3 rounded-md px-2 cursor-pointer hover:bg-gray-50"
                      >
                        <div className="min-w-0">
                          <p className="text-sm text-gray-900">
                            <span className="font-semibold block truncate">
                              {row.actor?.name || row.user.email || 'Unknown user'}
                            </span>
                          </p>
                          <p className="text-xs text-gray-600 mt-1">{formatAuditAction(row)}</p>
                        </div>
                        <span className="shrink-0 text-[11px] px-2 py-1 rounded-full bg-[#ad3332] text-white">
                          {row.actor?.role || row.user.role || 'User'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="text-sm text-gray-600">No recent activity.</div>
                  )}
                </div>

                <p className="mt-3 text-xs text-gray-500">
                  Recent account activities for monitoring and compliance.
                </p>
              </div>
            ) : null}
          </section>
          </>
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