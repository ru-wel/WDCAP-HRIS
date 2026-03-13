import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { get, post } from "../../services/api";
import { exportRowsToCsv } from "../../utils/csv";
import { exportRowsToXlsx } from "../../utils/excel.js";
import { exportReportToPdf } from "../../utils/pdf.js";
import ReportModal from "../../components/report-modal.jsx";
import { filterRowsByDateRange } from "../../utils/reporting.js";
import { ONBOARDING_STATUSES } from "../../constants/config.js";

const COLORS = ["#990100", "#2563EB", "#F59E0B", "#22C55E", "#6B7280"];

const PROJECT_STATUS_COLORS = {
  Active: "#22c55e",
  Completed: "#2563eb",
  "On Hold": "#f59e0b",
};

const COMPLIANCE_COLORS = ["#22C55E", "#F59E0B", "#990100"];

// ─── Module config ────────────────────────────────────────────────────────────
const _curYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 5 }, (_, i) => _curYear - i);

const MODULE_CONFIGS = {
  employees: {
    title: "Employees",
    description: "All employee records with personal and employment details.",
    modalTitle: "Export Data — Employees",
    enableDateRange: true,
    dateRangeHint: "filters by Hire Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: [
      { value: "all", label: "All Employees" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
      { value: "regular", label: "Regular" },
      { value: "probationary", label: "Probationary" },
      { value: "project_based", label: "Project-Based" },
    ],
  },
  "user-accounts": {
    title: "User Accounts",
    description: "System user accounts, roles, and access status.",
    modalTitle: "Export Data — User Accounts",
    enableDateRange: true,
    dateRangeHint: "filters by Account Created Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: [
      { value: "all", label: "All Users" },
      { value: "executives", label: "Executive" },
      { value: "hr", label: "HR" },
      { value: "managers", label: "Manager" },
      { value: "employees", label: "Employee" },
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ],
  },
  "201-files": {
    title: "201 Files",
    description: "Employee document compliance and checklist status.",
    modalTitle: "Export Data — 201 Files",
    enableDateRange: true,
    dateRangeHint: "filters by Hire Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: [
      { value: "all", label: "All 201 Files" },
      { value: "complete", label: "Complete" },
      { value: "incomplete", label: "Incomplete" },
    ],
  },
  departments: {
    title: "Departments",
    description: "Department listings with employee count and positions.",
    modalTitle: "Export Data — Departments",
    enableDateRange: false,
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  projects: {
    title: "Projects",
    description: "Project records with assigned employee details.",
    modalTitle: "Export Data — Projects",
    enableDateRange: true,
    dateRangeHint: "filters by Start Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: [
      { value: "all", label: "All Projects" },
      { value: "active", label: "Active" },
      { value: "completed", label: "Completed" },
      { value: "on_hold", label: "On Hold" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  "leave-history": {
    title: "Leave History",
    description: "All leave requests with status and approval details.",
    modalTitle: "Export Data — Leave History",
    enableDateRange: true,
    dateRangeHint: "filters by Leave Start Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: [
      { value: "all", label: "All" },
      { value: "APPROVED", label: "Approved" },
      { value: "REJECTED", label: "Rejected" },
      { value: "PENDING", label: "Pending" },
      { value: "CANCELLED", label: "Cancelled" },
    ],
  },
  "leave-credits": {
    title: "Leave Credits",
    description: "Employee leave credit balances and usage by year.",
    modalTitle: "Export Data — Leave Credits",
    enableDateRange: false,
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
    yearOptions: [new Date().getFullYear()],
  },
  "evaluation-history": {
    title: "Evaluation History",
    description: "Performance evaluation records per employee.",
    modalTitle: "Export Data — Evaluation History",
    enableDateRange: true,
    dateRangeHint: "filters by Last Evaluation Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: [
      { value: "all", label: "All Employees" },
      { value: "regular", label: "Regular" },
      { value: "probationary", label: "Probationary" },
      { value: "project_based", label: "Project-Based" },
      { value: "next_quarter", label: "Needs Evaluation – Next Quarter" },
    ],
  },
  // Audit log modules
  "audit-employees": {
    title: "Employees",
    modalTitle: "Export Data — Audit: Employees",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-leave": {
    title: "Leave",
    modalTitle: "Export Data — Audit: Leave",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-projects": {
    title: "Projects",
    modalTitle: "Export Data — Audit: Projects",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-departments": {
    title: "Departments",
    modalTitle: "Export Data — Audit: Departments",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-evaluations": {
    title: "Evaluations",
    modalTitle: "Export Data — Audit: Evaluations",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-user-accounts": {
    title: "User Accounts",
    modalTitle: "Export Data — Audit: User Accounts",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-reports": {
    title: "Reports",
    modalTitle: "Export Data — Audit: Reports",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
  "audit-calendar": {
    title: "Calendar",
    modalTitle: "Export Data — Audit: Calendar",
    enableDateRange: true,
    dateRangeHint: "filters by Log Date",
    fileTypes: ["XLSX", "CSV", "PDF"],
    categoryOptions: null,
  },
};

const AUDIT_TYPE_MAP = {
  "audit-employees":     { apiType: "employees",      source: "audit-employees",     label: "Employees" },
  "audit-leave":         { apiType: "leave",           source: "audit-leave",          label: "Leave" },
  "audit-projects":      { apiType: "projects",        source: "audit-projects",       label: "Projects" },
  "audit-departments":   { apiType: "departments",     source: "audit-departments",    label: "Departments" },
  "audit-evaluations":   { apiType: "evaluations",     source: "audit-evaluation",     label: "Evaluations" },
  "audit-user-accounts": { apiType: "users",           source: "audit-user-accounts",  label: "User Accounts" },
  "audit-reports":       { apiType: "reports",         source: "audit-reports",        label: "Reports" },
  "audit-calendar":      { apiType: "company_events",  source: "audit-calendar",       label: "Calendar" },
};

function calcDaysTaken(startIso, endIso) {
  if (!startIso || !endIso) return "";
  const start = new Date(startIso);
  const end = new Date(endIso);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "";
  const diff = Math.round((end - start) / (1000 * 60 * 60 * 24)) + 1;
  return diff > 0 ? diff : 1;
}

function formatDateTimeStr(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleString();
}

function buildFileVars(fileType, baseFilename) {
  const upper = String(fileType || "XLSX").toUpperCase();
  const isCsv = upper === "CSV";
  const isPdf = upper === "PDF";
  const ext = isPdf ? "pdf" : isCsv ? "csv" : "xlsx";
  return { isCsv, isPdf, ext, filename: `${baseFilename}.${ext}` };
}

async function dispatchExport({ fileType, filename, sheetName, title, summaryLines = [], columns, rows }) {
  const upper = String(fileType || "XLSX").toUpperCase();
  if (upper === "CSV") {
    exportRowsToCsv({ filename, columns, rows });
  } else if (upper === "PDF") {
    await exportReportToPdf({ filename, title, summaryLines, columns, rows });
  } else {
    await exportRowsToXlsx({ filename, sheetName, columns, rows });
  }
}

async function exportEmployeesReport({ startDate, endDate, fileType, category }) {
  const [empRes, deptRes] = await Promise.all([
    get("/employees?include_inactive=true"),
    get("/departments"),
  ]);

  const depts = Array.isArray(deptRes?.data) ? deptRes.data : [];
  const deptMap = new Map(depts.map((d) => [d.id, d.department_name]));

  let rows = (Array.isArray(empRes?.data) ? empRes.data : []).map((emp) => ({
    ...emp,
    department_name: emp.departments?.department_name || deptMap.get(emp.department_id) || "N/A",
    position_title: emp.positions?.position_title || "N/A",
  }));

  const cat = String(category || "all").toLowerCase();
  if (cat !== "all") {
    rows = rows.filter((r) => {
      const status = String(r?.employment_status || "").toLowerCase();
      const pt = String(r?.personnel_type || "").toLowerCase();
      if (cat === "active") return status === "active";
      if (cat === "inactive") return status === "inactive";
      if (cat === "regular") return pt === "regular";
      if (cat === "probationary") return pt === "probationary";
      if (cat === "project_based") return pt.includes("project");
      return true;
    });
  }

  if (startDate || endDate) {
    rows = filterRowsByDateRange(rows, (r) => r?.hire_date, startDate, endDate);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `employees-report-${cat}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "Employees Report",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "employees",
  }).catch(() => {});

  const columns = [
    { header: "Employee ID", value: (r) => r.employee_id || r.employee_code || "" },
    { header: "First Name", value: (r) => r.first_name || "" },
    { header: "Middle Name", value: (r) => r.middle_name || "" },
    { header: "Last Name", value: (r) => r.last_name || "" },
    { header: "Sex", value: (r) => r.sex || "" },
    { header: "Birth Date", value: (r) => r.birth_date || "" },
    { header: "Department", value: (r) => r.department_name },
    { header: "Position", value: (r) => r.position_title },
    { header: "Hire Date", value: (r) => r.hire_date || "" },
    { header: "Personnel Type", value: (r) => r.personnel_type || "" },
    { header: "Employment Status", value: (r) => r.employment_status || "" },
  ];

  const summaryLines = [
    `Category: ${cat}`,
    startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
    `Total Records: ${rows.length}`,
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "Employees",
    title: "Employees Report",
    summaryLines,
    columns,
    rows,
  });
}

async function exportUserAccountsReport({ startDate, endDate, fileType, category }) {
  const res = await get("/users");
  let rows = (Array.isArray(res?.data) ? res.data : []).map((u) => ({
    id: u.employee_id || u.id,
    email: u.email || "",
    role: u.role || "",
    createdAtRaw: u.created_at || "",
    createdAt: u.created_at
      ? new Date(u.created_at).toLocaleDateString("en-US", { month: "2-digit", day: "2-digit", year: "numeric" })
      : "",
    status: u.status || "ACTIVE",
  }));

  if (startDate || endDate) {
    rows = filterRowsByDateRange(rows, (r) => r?.createdAtRaw, startDate, endDate);
  }

  const cat = String(category || "all").toLowerCase();
  if (cat !== "all") {
    rows = rows.filter((r) => {
      const role = String(r?.role || "").toLowerCase();
      const status = String(r?.status || "").toLowerCase();
      if (cat === "executives") return role === "executive";
      if (cat === "hr") return role === "hr";
      if (cat === "managers") return role === "manager";
      if (cat === "employees") return role === "employee";
      if (cat === "active") return status === "active";
      if (cat === "inactive") return status === "inactive";
      return true;
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `user-accounts-report-${cat}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "User Accounts Report",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "user-accounts",
  }).catch(() => {});

  const columns = [
    { header: "Employee ID", value: (r) => r.id },
    { header: "Email", value: (r) => r.email },
    { header: "Role", value: (r) => r.role },
    { header: "Created At", value: (r) => r.createdAt },
    { header: "Status", value: (r) => r.status },
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "User Accounts",
    title: "User Accounts Report",
    summaryLines: [
      `Category: ${cat}`,
      startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
    ],
    columns,
    rows,
  });
}

async function export201FilesReport({ startDate, endDate, fileType, category }) {
  const res = await get("/onboarding/checklists");
  const items = Array.isArray(res?.data) ? res.data : [];

  // group by employee_id
  const byEmployee = new Map();
  for (const item of items) {
    const empId = item?.employee_id;
    if (!empId) continue;
    if (!byEmployee.has(empId)) byEmployee.set(empId, []);
    byEmployee.get(empId).push(item);
  }

  let rows = [];
  for (const [, empItems] of byEmployee.entries()) {
    const first = empItems[0];
    const emp = first?.employees || {};

    const required = empItems.filter((i) => i?.is_required);
    const anyRejected = required.some((i) => i?.status === ONBOARDING_STATUSES.REJECTED);
    const allApproved = !required.length || required.every((i) => i?.status === ONBOARDING_STATUSES.APPROVED);

    let remarks;
    if (allApproved) remarks = "COMPLETE";
    else if (anyRejected) remarks = "INCOMPLETE";
    else remarks = "INCOMPLETE";

    const approvedCount = required.filter((i) => i?.status === ONBOARDING_STATUSES.APPROVED).length;
    const missingDocs = required
      .filter((i) => i?.status !== ONBOARDING_STATUSES.APPROVED)
      .map((i) => i?.onboarding_items?.item_name || i?.item_name || "Unknown")
      .join("; ");

    rows.push({
      employee_code: emp.employee_id || "",
      employee_name: [emp.first_name, emp.last_name].filter(Boolean).join(" ").trim() || "Unknown",
      personnel_type: emp.personnel_type || "—",
      hire_date: emp.hire_date || "",
      remarks,
      required_approved: `${approvedCount}/${required.length}`,
      missing_docs: missingDocs || "—",
    });
  }

  const cat = String(category || "all").toLowerCase();
  if (cat !== "all") {
    rows = rows.filter((r) => {
      if (cat === "complete") return r.remarks === "COMPLETE";
      if (cat === "incomplete") return r.remarks === "INCOMPLETE";
      return true;
    });
  }

  if (startDate || endDate) {
    rows = filterRowsByDateRange(rows, (r) => r.hire_date, startDate, endDate);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `201-files-report-${cat}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "201 Files Report",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "201_files",
  }).catch(() => {});

  const completeCount = rows.filter((r) => r.remarks === "COMPLETE").length;

  const columns = [
    { header: "Employee ID", value: (r) => r.employee_code },
    { header: "Employee Name", value: (r) => r.employee_name },
    { header: "Personnel Type", value: (r) => r.personnel_type },
    { header: "Hire Date", value: (r) => r.hire_date },
    { header: "Compliance", value: (r) => r.remarks },
    { header: "Required Docs Approved", value: (r) => r.required_approved },
    { header: "Missing/Pending Docs", value: (r) => r.missing_docs },
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "201 Files",
    title: "201 Files Report",
    summaryLines: [
      `Category: ${cat}`,
      startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
      `Complete: ${completeCount} | Incomplete: ${rows.length - completeCount}`,
    ],
    columns,
    rows,
  });
}

async function exportDepartmentsReport({ startDate, endDate, fileType, category }) {
  const [deptRes, empRes, posRes] = await Promise.all([
    get("/departments"),
    get("/employees"),
    get("/positions"),
  ]);

  const employees = Array.isArray(empRes?.data) ? empRes.data : [];
  const counts = new Map();
  employees.forEach((emp) => {
    const deptId = emp?.departments?.id || emp?.department_id;
    if (!deptId) return;
    counts.set(deptId, (counts.get(deptId) || 0) + 1);
  });

  const allPositions = Array.isArray(posRes?.data) ? posRes.data : [];
  const positionsByDept = new Map();
  allPositions.forEach((p) => {
    const deptId = p?.departments?.id || p?.department_id;
    if (!deptId) return;
    if (!positionsByDept.has(deptId)) positionsByDept.set(deptId, []);
    positionsByDept.get(deptId).push(p.position_title);
  });

  let rows = (Array.isArray(deptRes?.data) ? deptRes.data : []).map((d) => ({
    id: d.id,
    name: d.department_name,
    created_at: d.created_at,
    employees: counts.get(d.id) || 0,
    positions: positionsByDept.get(d.id) || [],
  }));

  if (startDate || endDate) {
    rows = filterRowsByDateRange(rows, (r) => r?.created_at, startDate, endDate);
  }

  const cat = String(category || "all").toLowerCase();
  if (cat !== "all") {
    rows = rows.filter((r) => {
      const count = Number(r?.employees ?? 0);
      if (cat === "empty") return count <= 0;
      if (cat === "with_employees") return count > 0;
      return true;
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `departments-report-${cat}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "Departments Report",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "departments",
  }).catch(() => {});

  const columns = [
    { header: "Department Name", value: (r) => r?.name ?? "" },
    { header: "Employees Count", value: (r) => r?.employees ?? 0 },
    { header: "Positions", value: (r) => (r?.positions ?? []).join(", ") || "—" },
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "Departments",
    title: "Departments Report",
    summaryLines: [
      `Category: ${cat}`,
      startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
      `Total: ${rows.length}`,
    ],
    columns,
    rows,
  });
}

async function exportProjectsReport({ startDate, endDate, fileType, category }) {
  const res = await get("/projects");
  let projects = Array.isArray(res?.data) ? res.data : [];

  const cat = String(category || "all").toLowerCase();
  if (cat !== "all") {
    projects = projects.filter((p) => {
      const s = String(p?.status || "").toLowerCase();
      if (cat === "active") return s === "active";
      if (cat === "completed") return s === "completed";
      if (cat === "on_hold") return s === "on hold" || s === "on_hold";
      if (cat === "cancelled") return s === "cancelled";
      return true;
    });
  }

  if (startDate || endDate) {
    projects = filterRowsByDateRange(projects, (p) => p?.start_date, startDate, endDate);
  }

  const membersResults = await Promise.all(
    projects.map((p) =>
      get(`/projects/${p.id}/members`)
        .then((r) => (r?.success ? r.data : []))
        .catch(() => [])
    )
  );

  const rows = projects.flatMap((p, i) => {
    const members = Array.isArray(membersResults[i]) ? membersResults[i] : [];
    if (members.length === 0) {
      return [{
        project_name: p.project_name || "",
        site_location: p.site_location || "—",
        start_date: p.start_date || "",
        end_date: p.end_date || "—",
        status: p.status || "",
        employee_count: p.employee_count ?? 0,
        employee_id: "",
        employee_name: "",
        position: "",
        personnel_type: "",
      }];
    }
    return members.map((m) => ({
      project_name: p.project_name || "",
      site_location: p.site_location || "—",
      start_date: p.start_date || "",
      end_date: p.end_date || "—",
      status: p.status || "",
      employee_count: p.employee_count ?? 0,
      employee_id: m.employees?.employee_id || "",
      employee_name: [m.employees?.first_name, m.employees?.middle_name, m.employees?.last_name]
        .filter(Boolean).join(" "),
      position: m.employees?.positions?.position_title || "",
      personnel_type: m.employees?.personnel_type || "",
    }));
  });

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `projects-report-${cat}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "Projects Report",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "projects",
  }).catch(() => {});

  const columns = [
    { header: "Project Name", value: (r) => r.project_name },
    { header: "Site Location", value: (r) => r.site_location },
    { header: "Start Date", value: (r) => r.start_date },
    { header: "End Date", value: (r) => r.end_date },
    { header: "Status", value: (r) => r.status },
    { header: "Employee Count", value: (r) => r.employee_count },
    { header: "Employee ID", value: (r) => r.employee_id },
    { header: "Employee Name", value: (r) => r.employee_name },
    { header: "Position", value: (r) => r.position },
    { header: "Personnel Type", value: (r) => r.personnel_type },
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "Projects",
    title: "Projects Report",
    summaryLines: [
      `Category: ${cat}`,
      startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
      `Projects: ${projects.length}`,
    ],
    columns,
    rows,
  });
}

async function exportLeaveHistoryReport({ startDate, endDate, fileType, category }) {
  const res = await get("/leave/history");
  let rows = (Array.isArray(res?.data) ? res.data : []).map((r) => ({
    id: r.employee_code || r.employee_id || "",
    name: r.employee_name || "",
    position: r.position_title || "",
    type: r.leave_type_name || "",
    leave_purpose: r.leave_purpose || null,
    startDateRaw: r.start_date || "",
    endDateRaw: r.end_date || "",
    status: r.status || "",
    reason: r.reason || "",
    dateRequested: r.created_at ? new Date(r.created_at).toLocaleDateString() : "",
    updatedBy: (() => {
      const email = r.updated_by_email || r.updated_by || "";
      const role = r.updated_by_role || "";
      if (email && role) return `${email} (${role})`;
      return email;
    })(),
  }));

  if (startDate || endDate) {
    rows = filterRowsByDateRange(rows, (r) => r?.startDateRaw, startDate, endDate);
  }

  const cat = String(category || "all");
  if (cat !== "all" && cat !== "All") {
    rows = rows.filter((r) => String(r?.status || "").toUpperCase() === cat.toUpperCase());
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `leave-history-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "Leave History Report",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "leave-history",
  }).catch(() => {});

  const columns = [
    { header: "Employee ID", value: (r) => r?.id || "" },
    { header: "Name", value: (r) => r?.name || "" },
    { header: "Position", value: (r) => r?.position || "" },
    { header: "Leave Type", value: (r) => r?.type || "" },
    { header: "Leave Purpose", value: (r) => {
      const p = r?.leave_purpose || "";
      if (p === "vacation") return "Vacation";
      if (p === "bereavement") return "Bereavement";
      if (p === "sick") return "Sick";
      return p || "—";
    }},
    { header: "Start Date", value: (r) => r?.startDateRaw || "" },
    { header: "End Date", value: (r) => r?.endDateRaw || "" },
    { header: "Days Taken", value: (r) => calcDaysTaken(r?.startDateRaw, r?.endDateRaw) },
    { header: "Status", value: (r) => r?.status || "" },
    { header: "Reason", value: (r) => r?.reason || "—" },
    { header: "Date Requested", value: (r) => r?.dateRequested || "" },
    { header: "Updated By", value: (r) => r?.updatedBy || "" },
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "Leave History",
    title: "Leave History Report",
    summaryLines: [
      `Total Records: ${rows.length}`,
      `Status: ${cat}`,
      startDate && endDate ? `Date Range: ${startDate} to ${endDate}` : "",
    ].filter(Boolean),
    columns,
    rows,
  });
}

async function exportLeaveCreditsReport({ fileType, year, category }) {
  const reportYear = year ?? new Date().getFullYear();
  const res = await get(`/leave/credits?year=${reportYear}`);
  const apiRows = Array.isArray(res?.data) ? res.data : [];

  const byEmployee = new Map();
  const detailsMap = {};
  for (const r of apiRows) {
    const empId = r.employee_id;
    if (!empId) continue;
    if (!detailsMap[empId]) detailsMap[empId] = [];
    detailsMap[empId].push(r);
    const existing = byEmployee.get(empId) || {
      employee_id: empId,
      id: r.employee_code || empId,
      name: r.employee_name || "",
    };
    byEmployee.set(empId, existing);
  }

  const empRows = Array.from(byEmployee.values());
  const detailRows = empRows.flatMap((emp) => {
    const details = detailsMap[emp.employee_id];
    if (!Array.isArray(details) || details.length === 0) {
      return [{ employee_code: emp.id, employee_name: emp.name, leave_type_name: "Service Incentive Leave", current_balance: 0, used_leave: 0 }];
    }
    return details.map((d) => ({
      employee_code: emp.id,
      employee_name: emp.name,
      leave_type_name: d?.leave_type_name || "Leave",
      current_balance: d?.current_balance ?? 0,
      used_leave: d?.used_leave ?? 0,
    }));
  });

  const cat = category || "all";
  const rowsForExport = cat === "all" ? detailRows : detailRows.filter((r) => r.leave_type_name === cat);

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `leave-credits-report-${reportYear}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "Leave Credits Report",
    filename,
    start_date: null,
    end_date: null,
    row_count: rowsForExport.length,
    source: "leave-credits",
  }).catch(() => {});

  const columns = [
    { header: "Year", value: () => reportYear },
    { header: "Employee ID", value: (r) => r.employee_code },
    { header: "Employee Name", value: (r) => r.employee_name },
    { header: "Leave Type", value: (r) => r.leave_type_name },
    { header: "Leave Credit", value: (r) => r.current_balance },
    { header: "Used Leave", value: (r) => r.used_leave },
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "Leave Credits",
    title: "Leave Credits Report",
    summaryLines: [
      `Year: ${reportYear}`,
      `Leave Type: ${cat === "all" ? "All" : cat}`,
      `Total Records: ${rowsForExport.length}`,
      `Generated: ${stamp}`,
    ],
    columns,
    rows: rowsForExport,
  });
}

async function exportEvaluationHistoryReport({ startDate, endDate, fileType, category }) {
  const res = await get("/evaluations/summary?include_inactive=true");
  let rows = (Array.isArray(res?.data) ? res.data : []).map((e) => ({
    employeeCode: e?.employee_code || "",
    name: e?.name || "N/A",
    position: e?.position || "N/A",
    hireDateRaw: e?.hire_date || "",
    hireDate: e?.hire_date ? new Date(e.hire_date).toLocaleDateString() : "",
    type: e?.personnel_type || "N/A",
    employmentStatus: e?.employment_status || "N/A",
    latestEvalType: e?.latest_eval_type || null,
    latestEvalDate: e?.latest_eval_date || null,
    nextEvalDate: e?.next_eval_date || null,
    nextEvalType: e?.next_eval_type || null,
  }));

  if (startDate || endDate) {
    rows = filterRowsByDateRange(rows, (r) => r?.latestEvalDate, startDate, endDate);
  }

  const cat = String(category || "all").toLowerCase();
  if (cat === "next_quarter") {
    const now = new Date();
    const currentQuarter = Math.floor(now.getMonth() / 3);
    const nextQuarter = (currentQuarter + 1) % 4;
    const nextQuarterYear = nextQuarter === 0 ? now.getFullYear() + 1 : now.getFullYear();
    const nextQuarterStart = new Date(nextQuarterYear, nextQuarter * 3, 1);
    const nextQuarterEnd = new Date(nextQuarterYear, nextQuarter * 3 + 3, 0);
    rows = rows.filter((r) => {
      if (!r?.nextEvalDate) return false;
      const next = new Date(r.nextEvalDate);
      return next >= nextQuarterStart && next <= nextQuarterEnd;
    });
  } else if (cat !== "all") {
    rows = rows.filter((r) => {
      const pt = String(r?.type || "").toLowerCase();
      if (cat === "regular") return pt === "regular";
      if (cat === "probationary") return pt === "probationary";
      if (cat === "project_based") return pt.includes("project");
      return true;
    });
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `evaluation-history-${cat}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: "Evaluation Employees Table",
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: rows.length,
    source: "employees",
  }).catch(() => {});

  const columns = [
    { header: "Employee ID", value: (r) => r?.employeeCode || "" },
    { header: "Name", value: (r) => r?.name || "" },
    { header: "Position", value: (r) => r?.position || "" },
    { header: "Hire Date", value: (r) => r?.hireDate || "" },
    { header: "Personnel Type", value: (r) => r?.type || "" },
    { header: "Employment Status", value: (r) => r?.employmentStatus || "" },
    { header: "Last Evaluation Type", value: (r) => r?.latestEvalType || "—" },
    { header: "Last Evaluation Date", value: (r) => r?.latestEvalDate ? new Date(r.latestEvalDate).toLocaleDateString() : "—" },
    ...(cat === "next_quarter" ? [
      { header: "Next Evaluation Type", value: (r) => r?.nextEvalType || "—" },
      { header: "Next Evaluation Due", value: (r) => r?.nextEvalDate ? new Date(r.nextEvalDate).toLocaleDateString() : "—" },
    ] : []),
  ];

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: "Evaluation History",
    title: "Evaluation History Report",
    summaryLines: [
      `Total Records: ${rows.length}`,
      `Category: ${cat}`,
      startDate || endDate ? `Last Evaluation Date Range: ${startDate || "…"} to ${endDate || "…"}` : "",
    ].filter(Boolean),
    columns,
    rows,
  });
}

async function exportAuditReport(moduleKey, { startDate, endDate, fileType }) {
  const typeInfo = AUDIT_TYPE_MAP[moduleKey];
  if (!typeInfo) return;

  let leaveTypesById = {};
  if (moduleKey === "audit-leave") {
    try {
      const typesRes = await get("/leave/types");
      const list = Array.isArray(typesRes?.data) ? typesRes.data : [];
      leaveTypesById = list.reduce((acc, t) => {
        if (t?.leave_type_id) acc[String(t.leave_type_id)] = t.leave_type_name || "";
        return acc;
      }, {});
    } catch {}
  }

  const res = await get(`/audit-logs/table/${typeInfo.apiType}`);
  let logs = Array.isArray(res?.data) ? res.data : [];

  if (startDate || endDate) {
    logs = filterRowsByDateRange(logs, (l) => l?.timestamp, startDate, endDate);
  }

  const stamp = new Date().toISOString().slice(0, 10);
  const { filename, isCsv, isPdf } = buildFileVars(fileType, `audit-${typeInfo.source.replace("audit-", "")}-${stamp}`);

  post("/audit-logs/reports", {
    report_name: `Audit ${typeInfo.label} Report`,
    filename,
    start_date: startDate || null,
    end_date: endDate || null,
    row_count: logs.length,
    source: typeInfo.source,
  }).catch(() => {});

  let columns;

  if (moduleKey === "audit-employees") {
    const getTargetEmployee = (log) => {
      const table = String(log?.table_name || "").toLowerCase();
      const values = log?.new_values || log?.old_values;
      if (!values) return "N/A";
      if (table === "employees") {
        const name = [values.first_name, values.middle_name, values.last_name].filter(Boolean).join(" ");
        return `${name || "N/A"} (${values.employee_id || "N/A"})`;
      }
      if (table === "documents") {
        const file = values.file_name || values.document_name || values.file_path || "Document";
        return `${file} (${values.employee_id || "N/A"})`;
      }
      if (table === "onboarding_checklists") {
        const itemName = values.onboarding_items?.item_name || values.item_name || values.checklist_item_name || "Checklist Item";
        return `${itemName} (${values.employee_id || values.employeeId || "N/A"})`;
      }
      if (table === "onboarding_items") return values.item_name || "Onboarding Item";
      return "N/A";
    };
    const skipEmpFields = ["id", "user_id", "created_at", "updated_at", "deleted_at", "positions", "departments", "users"];
    const fmtEmpVal = (v) => {
      if (v === null || v === undefined) return "N/A";
      if (typeof v === "object") return "[Complex Data]";
      if (typeof v === "boolean") return v ? "Yes" : "No";
      return String(v);
    };
    const humanizeEmp = (f) => {
      const special = { position_id: "Position", department_id: "Department", employment_status: "Employment Status", personnel_type: "Personnel Type", hire_date: "Hire Date", birth_date: "Birth Date" };
      return special[f] || f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const formatEmployeeChanges = (log) => {
      const { action_type, old_values, new_values } = log;
      const table = String(log?.table_name || "").toLowerCase();
      if (table === "documents") {
        const v = new_values || old_values;
        if (!v) return "—";
        const file = v.file_name || v.document_name || v.file_path || "Document";
        if (action_type === "CREATE") return `Uploaded: ${file}`;
        if (action_type === "DELETE") return `Deleted: ${file}`;
        if (action_type === "UPDATE" && old_values && new_values) {
          const skip = ["id", "created_at", "updated_at", "uploaded_at", "uploaded_by", "employee_id"];
          const changes = [];
          for (const key in new_values) {
            if (skip.includes(key)) continue;
            const oldVal = old_values[key], newVal = new_values[key];
            if (oldVal === newVal) continue;
            changes.push(`${humanizeEmp(key)}: ${fmtEmpVal(oldVal)} → ${fmtEmpVal(newVal)}`);
          }
          return changes.length ? changes.join(", ") : `Updated: ${file}`;
        }
        return file;
      }
      if (table === "onboarding_checklists") {
        const v = new_values || old_values;
        if (!v) return "—";
        const itemName = v.onboarding_items?.item_name || v.item_name || "Checklist Item";
        if (action_type === "CREATE") return `Created checklist${v.items_count != null ? ` (${v.items_count} items)` : ""}`;
        if (action_type === "UPDATE" && old_values && new_values) {
          const fields = ["status", "remarks", "is_required", "document_id", "submitted_at", "reviewed_at", "reviewed_by"];
          const changes = [];
          for (const key of fields) {
            if (old_values?.[key] === undefined && new_values?.[key] === undefined) continue;
            if (old_values?.[key] === new_values?.[key]) continue;
            changes.push(`${humanizeEmp(key)}: ${fmtEmpVal(old_values?.[key])} → ${fmtEmpVal(new_values?.[key])}`);
          }
          return changes.length ? `${itemName}: ${changes.join(", ")}` : `${itemName}: Updated`;
        }
        return itemName;
      }
      if (table === "onboarding_items") {
        const v = new_values || old_values;
        if (!v) return "—";
        const name = v.item_name || "Onboarding Item";
        if (action_type === "CREATE") return `Created: ${name}`;
        if (action_type === "DELETE") return `Deleted: ${name}`;
        if (action_type === "UPDATE" && old_values && new_values) {
          const skip = ["id", "created_at", "updated_at"];
          const changes = [];
          for (const key in new_values) {
            if (skip.includes(key)) continue;
            const oldVal = old_values[key], newVal = new_values[key];
            if (oldVal === newVal) continue;
            changes.push(`${humanizeEmp(key)}: ${fmtEmpVal(oldVal)} → ${fmtEmpVal(newVal)}`);
          }
          return changes.length ? `${name}: ${changes.join(", ")}` : `${name}: Updated`;
        }
        return name;
      }
      if (action_type === "CREATE" && new_values) {
        const name = [new_values.first_name, new_values.middle_name, new_values.last_name].filter(Boolean).join(" ");
        return `${name} - ${new_values.department_name || "N/A"}, ${new_values.position_title || "N/A"}`;
      }
      if (action_type === "UPDATE" && old_values && new_values) {
        const changes = [];
        if (new_values.positions && old_values.positions && new_values.positions.id !== old_values.positions.id)
          changes.push(`Position: ${old_values.positions.position_title} → ${new_values.positions.position_title}`);
        if (new_values.departments && old_values.departments && new_values.departments.id !== old_values.departments.id)
          changes.push(`Department: ${old_values.departments.department_name} → ${new_values.departments.department_name}`);
        for (const key in new_values) {
          if (skipEmpFields.includes(key)) continue;
          const oldVal = old_values[key], newVal = new_values[key];
          if (typeof newVal === "object" || oldVal === newVal) continue;
          const fOld = fmtEmpVal(oldVal), fNew = fmtEmpVal(newVal);
          if (fOld !== fNew) changes.push(`${humanizeEmp(key)}: ${fOld} → ${fNew}`);
        }
        return changes.length > 0 ? changes.join(", ") : "No significant changes";
      }
      if (action_type === "DELETE" && old_values) {
        const name = [old_values.first_name, old_values.middle_name, old_values.last_name].filter(Boolean).join(" ");
        return `Deleted: ${name}`;
      }
      return "—";
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Employee", value: (log) => getTargetEmployee(log) },
      { header: "Action", value: (log) => log?.action_type || "" },
      { header: "Changes", value: (log) => formatEmployeeChanges(log) },
    ];

  } else if (moduleKey === "audit-departments") {
    const getTargetDepartment = (log) => {
      const values = log?.new_values || log?.old_values;
      if (!values) return "N/A";
      if (log.table_name === "positions") return values?.departments?.department_name || "N/A";
      return values.department_name || "N/A";
    };
    const formatDepartmentChanges = (log) => {
      const { action_type, old_values, new_values, table_name } = log;
      if (table_name === "positions") {
        if (action_type === "CREATE" && new_values) return `Position Created: ${new_values.position_title}`;
        if (action_type === "UPDATE" && old_values && new_values) {
          if (old_values.position_title !== new_values.position_title)
            return `Position Title: ${old_values.position_title} → ${new_values.position_title}`;
          return "No significant changes";
        }
        if (action_type === "DELETE" && old_values) return `Position Deleted: ${old_values.position_title}`;
        return "—";
      }
      if (action_type === "CREATE" && new_values) return `Created: ${new_values.department_name}`;
      if (action_type === "UPDATE" && old_values && new_values) {
        if (old_values.department_name !== new_values.department_name)
          return `Department Name: ${old_values.department_name} → ${new_values.department_name}`;
        return "No significant changes";
      }
      if (action_type === "DELETE" && old_values) return `Deleted: ${old_values.department_name}`;
      return "—";
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Department", value: (log) => getTargetDepartment(log) },
      { header: "Action", value: (log) => log?.action_type || "" },
      { header: "Changes", value: (log) => formatDepartmentChanges(log) },
    ];

  } else if (moduleKey === "audit-leave") {
    const fmtEmpName = (emp) => emp ? `${emp.first_name || ""} ${emp.last_name || ""}`.trim() : "";
    const fmtTargetEmp = (log, values) => {
      const tName = String(log?.target_employee?.name || "").trim();
      const tCode = String(log?.target_employee?.employee_code || "").trim();
      if (tName && tCode) return `${tName} (${tCode})`;
      if (tName) return tName;
      if (tCode) return tCode;
      const nestedName = fmtEmpName(values?.employees);
      const nestedCode = String(values?.employees?.employee_id || "").trim();
      if (nestedName && nestedCode) return `${nestedName} (${nestedCode})`;
      if (nestedName) return nestedName;
      if (nestedCode) return nestedCode;
      return String(values?.employee_id || "").trim();
    };
    const fmtActor = (log) => {
      const actorName = String(log?.actor?.name || "").trim();
      return actorName || String(log?.users?.email || "").trim() || "N/A";
    };
    const getLTName = (values) => {
      const nested = values?.leave_types;
      if (nested?.leave_type_name) return nested.leave_type_name;
      const direct = String(values?.leave_type_name || values?.leave_type || "").trim();
      if (direct) return direct;
      const fromMap = values?.leave_type_id ? leaveTypesById[String(values.leave_type_id)] : null;
      return fromMap || "";
    };
    const getLeaveAction = (log) => {
      const table = String(log.table_name || "").toLowerCase();
      const action = String(log.action_type || "").toUpperCase();
      const oldV = log.old_values, newV = log.new_values;
      if (table === "leave_requests") {
        if (action === "CREATE") return "Requested Leave";
        if (action === "UPDATE") {
          const oldStatus = String(oldV?.status || "").toUpperCase();
          const newStatus = String(newV?.status || "").toUpperCase();
          if (oldStatus && newStatus && oldStatus !== newStatus) return "Changed status of Leave";
          return "Updated Leave Request";
        }
        return action;
      }
      if (table === "leave_types") {
        if (action === "UPDATE") {
          const oldEnabled = oldV?.is_enabled ?? oldV?.enabled ?? null;
          const newEnabled = newV?.is_enabled ?? newV?.enabled ?? null;
          if (oldEnabled !== null && newEnabled !== null && oldEnabled !== newEnabled)
            return newEnabled ? "Enabled a Leave Type" : "Disabled a Leave Type";
          return "Updated Leave Type";
        }
        if (action === "CREATE") return "Created Leave Type";
        if (action === "DELETE") return "Deleted Leave Type";
        return action;
      }
      if (table === "employee_leave_balances") {
        if (action === "UPDATE") return "Updated Leave Credits";
        return action;
      }
      return action;
    };
    const fmtLeaveChanges = (log) => {
      const table = String(log.table_name || "").toLowerCase();
      const action = String(log.action_type || "").toUpperCase();
      const oldV = log.old_values, newV = log.new_values;
      if (table === "leave_requests") {
        const values = newV || oldV;
        const leaveType = getLTName(values);
        const start = values?.start_date ? String(values.start_date).slice(0, 10) : "N/A";
        const empLabel = fmtTargetEmp(log, values) || "N/A";
        if (action === "CREATE") {
          const label = [empLabel, leaveType].filter(Boolean).join(" - ");
          return `${label || "Leave"} - ${start}`;
        }
        if (action === "UPDATE") {
          const oldStatus = oldV?.status ? String(oldV.status) : null;
          const newStatus = newV?.status ? String(newV.status) : null;
          const label = [empLabel, leaveType].filter(Boolean).join(" - ");
          if (oldStatus && newStatus && oldStatus !== newStatus)
            return `${label || empLabel} - ${start} - ${oldStatus} to ${newStatus}`;
          return `${label || empLabel} - ${start}`;
        }
        return leaveType;
      }
      if (table === "leave_types") {
        const values = newV || oldV;
        const typeName = getLTName(values);
        const oldEnabled = oldV?.is_enabled ?? oldV?.enabled ?? null;
        const newEnabled = newV?.is_enabled ?? newV?.enabled ?? null;
        if (action === "UPDATE" && oldEnabled !== null && newEnabled !== null && oldEnabled !== newEnabled)
          return `${typeName} - ${newEnabled ? "Enabled" : "Disabled"}`;
        return typeName;
      }
      if (table === "employee_leave_balances") {
        const values = newV || oldV;
        const empLabel = fmtTargetEmp(log, values) || "N/A";
        const leaveType = getLTName(values);
        const oldBal = oldV?.current_balance, newBal = newV?.current_balance;
        if (oldBal !== undefined && newBal !== undefined && oldBal !== newBal) {
          const label = [empLabel, leaveType].filter(Boolean).join(" - ");
          return `${label || empLabel}: ${oldBal} → ${newBal}`;
        }
        return [empLabel, leaveType].filter(Boolean).join(" - ") || empLabel;
      }
      return "—";
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => fmtActor(log) },
      { header: "Action", value: (log) => getLeaveAction(log) },
      { header: "Changes", value: (log) => fmtLeaveChanges(log) },
    ];

  } else if (moduleKey === "audit-projects") {
    const getTargetProject = (log) => {
      if (log?.target_project?.name) return log.target_project.name;
      const values = log?.new_values || log?.old_values;
      return values?.project_name || values?.projects?.project_name || "N/A";
    };
    const humanizeProj = (f) => {
      const special = { project_name: "Project Name", site_location: "Site Location", start_date: "Start Date", end_date: "End Date" };
      return special[f] || f.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    };
    const formatProjectChanges = (log) => {
      const { action_type, table_name, old_values, new_values } = log;
      const skip = ["id", "created_at", "updated_at"];
      if (table_name === "project_assignments") {
        const values = new_values || old_values;
        const emp = log?.target_employee?.name
          || [values?.employees?.first_name, values?.employees?.middle_name, values?.employees?.last_name].filter(Boolean).join(" ")
          || "Unknown Employee";
        const proj = log?.target_project?.name || values?.projects?.project_name || "Unknown Project";
        if (action_type === "CREATE") return `Assigned ${emp} to ${proj}`;
        if (action_type === "DELETE") return `Removed ${emp} from ${proj}`;
        if (action_type === "UPDATE") return `Updated assignment of ${emp} in ${proj}`;
        return "—";
      }
      if (action_type === "CREATE" && new_values)
        return `Created: ${new_values.project_name} - ${new_values.site_location || "N/A"}`;
      if (action_type === "UPDATE" && old_values && new_values) {
        const changes = [];
        for (const key in new_values) {
          if (skip.includes(key)) continue;
          const oldVal = old_values[key], newVal = new_values[key];
          if (oldVal !== newVal) changes.push(`${humanizeProj(key)}: ${oldVal || "N/A"} → ${newVal || "N/A"}`);
        }
        return changes.length > 0 ? changes.join(", ") : "No significant changes";
      }
      if (action_type === "DELETE" && old_values) return `Deleted: ${old_values.project_name}`;
      return "—";
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Project", value: (log) => getTargetProject(log) },
      { header: "Action", value: (log) => log?.action_type || "" },
      { header: "Changes", value: (log) => formatProjectChanges(log) },
    ];

  } else if (moduleKey === "audit-evaluations") {
    const safeJsonParse = (value) => {
      if (value === null || value === undefined) return null;
      if (typeof value === "object") return value;
      if (typeof value !== "string" || !value.trim()) return null;
      try { return JSON.parse(value); } catch { return null; }
    };
    const parseNotesSummary = (notes) => {
      const raw = String(notes || "").trim();
      if (!raw) return { score: "", remarks: "" };
      const scoreMatch = raw.match(/^\s*Score\s*:\s*(.+)\s*$/im);
      const remarksMatch = raw.match(/^\s*Remarks\s*:\s*([\s\S]+?)(?:\n\s*\n|$)/im);
      return {
        score: scoreMatch ? String(scoreMatch[1] || "").trim() : "",
        remarks: remarksMatch ? String(remarksMatch[1] || "").trim() : "",
      };
    };
    const summarizeDocs = (rawDocs) => {
      const obj = safeJsonParse(rawDocs);
      if (!obj || typeof obj !== "object") return "";
      const names = [];
      if (obj.file?.fileName) names.push(String(obj.file.fileName));
      if (obj.breakdown?.fileName) names.push(`Breakdown: ${String(obj.breakdown.fileName)}`);
      if (obj.final?.fileName) names.push(`Final: ${String(obj.final.fileName)}`);
      if (!names.length && obj.file?.name) names.push(String(obj.file.name));
      return names.filter(Boolean).join(", ");
    };
    const fmtEvalDate = (value) => {
      if (!value) return "";
      const d = new Date(value);
      return Number.isNaN(d.getTime()) ? String(value) : d.toLocaleDateString();
    };
    const getEmpLabel = (log) => {
      const v = log?.new_values || log?.old_values;
      const empCode = v?.employees?.employee_id || v?.employee_code || v?.employee_id;
      const name = v?.employee_name || (v?.employees ? `${v?.employees?.first_name || ""} ${v?.employees?.last_name || ""}`.trim() : "") || "";
      const label = `${empCode || ""}${empCode && name ? " - " : ""}${name}`.trim();
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(label)) return "";
      return label;
    };
    const isTmplLog = (log) => String(log?.table_name || "").toLowerCase() === "evaluation_templates";
    const fmtTmplAction = (log) => {
      const v = log?.new_values || log?.old_values || {};
      const action = String(v?.action || "").toLowerCase();
      const name = v?.name || v?.template_name || "";
      if (action === "add_section") return `Added Section — ${v?.section_title || ""}`;
      if (action === "update_section") return `Updated Section — ${v?.title || v?.section_id || ""}`;
      if (action === "delete_section") return `Deleted Section — ${v?.section_title || ""}`;
      if (action === "add_item") return `Added Item — ${v?.question_text || ""}`;
      if (action === "update_item") return "Updated Item";
      if (action === "delete_item") return "Deleted Item";
      if (action === "assign_to_position") return `Assigned Template — ${v?.template_name || ""} → ${v?.position_title || ""}`;
      if (action === "unassign_from_position") return `Unassigned Template — ${v?.template_name || ""} from ${v?.position_title || ""}`;
      if (log?.action_type === "CREATE") return name ? `Created Template — ${name}` : "Created Template";
      if (log?.action_type === "UPDATE") {
        if (v?.is_active === false) return name ? `Deactivated Template — ${name}` : "Deactivated Template";
        if (v?.is_active === true && log?.old_values?.is_active === false) return name ? `Reactivated Template — ${name}` : "Reactivated Template";
        return name ? `Updated Template — ${name}` : "Updated Template";
      }
      if (log?.action_type === "DELETE") return name ? `Deleted Template — ${name}` : "Deleted Template";
      return `Template ${log?.action_type || "Activity"}`;
    };
    const fmtTmplChanges = (log) => {
      const oldV = log?.old_values, newV = log?.new_values;
      const v = newV || oldV || {};
      const action = String(v?.action || "").toLowerCase();
      if (action === "add_section") return [`section: ${v?.section_title || "—"}`, v?.items_count ? `items: ${v.items_count}` : null].filter(Boolean).join(", ");
      if (action === "update_section") return [v?.title ? `title: ${v.title}` : null, v?.description ? `description: ${v.description}` : null].filter(Boolean).join(", ") || "—";
      if (action === "delete_section") return `removed section: ${v?.section_title || "—"}`;
      if (action === "add_item") return `question: ${v?.question_text || "—"}`;
      if (action === "update_item") return v?.question_text ? `question: ${v.question_text}` : "—";
      if (action === "delete_item") return "removed item";
      if (action === "assign_to_position") return `${v?.position_title || "—"} → ${v?.template_name || "—"}`;
      if (action === "unassign_from_position") return `removed: ${v?.position_title || "—"} from ${v?.template_name || "—"}`;
      if (v?.is_active === false) return `deactivated: ${v?.template_name || "—"}`;
      if (v?.is_active === true && oldV?.is_active === false) return `reactivated: ${v?.template_name || "—"}`;
      if (log?.action_type === "UPDATE" && oldV && newV && !action) {
        const changes = [];
        if (oldV?.name !== newV?.name) changes.push(`name: ${oldV?.name || "—"} → ${newV?.name || "—"}`);
        if (oldV?.description !== newV?.description) changes.push(`description: ${oldV?.description || "—"} → ${newV?.description || "—"}`);
        return changes.length ? changes.join(", ") : "—";
      }
      return [v?.name ? `name: ${v.name}` : null, v?.description ? `description: ${v.description}` : null, v?.sections_count ? `sections: ${v.sections_count}` : null].filter(Boolean).join(", ") || "—";
    };
    const formatEvalAction = (log) => {
      if (isTmplLog(log)) return fmtTmplAction(log);
      const v = log?.new_values || log?.old_values;
      if (log?.action_type === "GENERATE_REPORT") {
        const name = v?.report_name || v?.reportName || "";
        return name ? `Generated Report — ${name}` : "Generated Report";
      }
      const employee = getEmpLabel(log);
      const bits = [employee, v?.evaluation_type || "", v?.evaluation_date ? new Date(v.evaluation_date).toLocaleDateString() : ""].filter(Boolean).join(" — ");
      if (log?.action_type === "CREATE") return bits ? `Scheduled Evaluation — ${bits}` : "Scheduled Evaluation";
      if (log?.action_type === "UPDATE") return bits ? `Updated Evaluation — ${bits}` : "Updated Evaluation";
      if (log?.action_type === "DELETE") return bits ? `Deleted Evaluation — ${bits}` : "Deleted Evaluation";
      return bits ? `${log?.action_type || "Activity"} — ${bits}` : `${log?.action_type || "Activity"}`;
    };
    const formatEvalChanges = (log) => {
      if (isTmplLog(log)) return fmtTmplChanges(log);
      const oldV = log?.old_values, newV = log?.new_values;
      const action = String(log?.action_type || "").toUpperCase();
      if (action === "GENERATE_REPORT") {
        const v = newV || oldV || {};
        const bits = [
          v?.report_name || v?.reportName ? `name: ${v?.report_name || v?.reportName}` : null,
          v?.filename ? `file: ${v.filename}` : null,
          (v?.start_date || v?.end_date) ? `range: ${v?.start_date || "—"} to ${v?.end_date || "—"}` : null,
          Number.isFinite(Number(v?.row_count)) ? `rows: ${Number(v.row_count)}` : null,
        ].filter(Boolean);
        return bits.length ? bits.join(", ") : "—";
      }
      if (!oldV && !newV) return "—";
      if (action !== "UPDATE" || !oldV || !newV) {
        const v = newV || oldV || {};
        const { score, remarks } = parseNotesSummary(v?.evaluation_notes);
        const docs = summarizeDocs(v?.evaluation_document_path);
        const bits = [
          v?.evaluation_type ? `type: ${v.evaluation_type}` : null,
          v?.evaluation_date ? `date: ${fmtEvalDate(v.evaluation_date)}` : null,
          score ? `score: ${score}` : null,
          remarks ? `remarks: ${remarks}` : null,
          docs ? `documents: ${docs}` : null,
        ].filter(Boolean);
        return bits.length ? bits.join(", ") : "—";
      }
      const changes = [];
      if (oldV?.evaluation_type !== newV?.evaluation_type)
        changes.push(`type: ${oldV?.evaluation_type ?? "—"} → ${newV?.evaluation_type ?? "—"}`);
      if (oldV?.evaluation_date !== newV?.evaluation_date)
        changes.push(`date: ${fmtEvalDate(oldV?.evaluation_date) || "—"} → ${fmtEvalDate(newV?.evaluation_date) || "—"}`);
      const oldNotes = parseNotesSummary(oldV?.evaluation_notes);
      const newNotes = parseNotesSummary(newV?.evaluation_notes);
      if (oldNotes.score !== newNotes.score) changes.push(`score: ${oldNotes.score || "—"} → ${newNotes.score || "—"}`);
      if (oldNotes.remarks !== newNotes.remarks) changes.push(`remarks: ${oldNotes.remarks || "—"} → ${newNotes.remarks || "—"}`);
      const oldDocs = summarizeDocs(oldV?.evaluation_document_path);
      const newDocs = summarizeDocs(newV?.evaluation_document_path);
      if (oldDocs !== newDocs) changes.push(`documents: ${oldDocs || "—"} → ${newDocs || "—"}`);
      return changes.length ? changes.join(", ") : "—";
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Action", value: (log) => formatEvalAction(log) },
      { header: "Changes", value: (log) => formatEvalChanges(log) },
    ];

  } else if (moduleKey === "audit-user-accounts") {
    const getTargetUser = (log) => {
      const actionType = String(log?.action_type || "").toUpperCase();
      if (actionType === "PASSWORD_RESET_REQUEST")
        return log?.new_values?.email || log?.old_values?.email || log?.record_id || "N/A";
      const values = log?.new_values || log?.old_values;
      return values ? (values.email || "N/A") : "N/A";
    };
    const fmtUserAction = (actionType) => {
      if (String(actionType || "").toUpperCase() === "PASSWORD_RESET_REQUEST") return "Password Reset Request";
      return actionType || "";
    };
    const fmtUserChanges = (newValues, actionType) => {
      if (String(actionType || "").toUpperCase() === "PASSWORD_RESET_REQUEST") return "Requested password reset (Forgot Password)";
      if (!newValues || ["LOGIN", "LOGOUT", "DELETE"].includes(actionType)) return "—";
      return Object.entries(newValues).map(([key, value]) => `${key}: ${value}`).join(", ");
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || log?.user_email || "N/A" },
      { header: "User Account", value: (log) => getTargetUser(log) },
      { header: "Action", value: (log) => fmtUserAction(log?.action_type) },
      { header: "Changes", value: (log) => fmtUserChanges(log?.new_values, log?.action_type) },
    ];

  } else if (moduleKey === "audit-reports") {
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Action", value: (log) => String(log?.action_type || "").toUpperCase() === "GENERATE_REPORT" ? "Generated Report" : (log?.action_type || "—") },
      { header: "Changes", value: (log) => log?.new_values?.report_name || log?.new_values?.reportName || log?.new_values?.report || "N/A" },
    ];

  } else if (moduleKey === "audit-calendar") {
    const getEvtTitle = (log) => log?.new_values?.title || log?.old_values?.title || "—";
    const getEvtType = (log) => {
      const raw = log?.new_values?.event_type || log?.old_values?.event_type || "";
      if (raw === "company_event") return "Company Event";
      if (raw === "holiday") return "Holiday";
      if (raw === "meeting") return "Meeting";
      return raw || "—";
    };
    const fmtCalAction = (actionType) => {
      if (actionType === "CREATE") return "Created Event";
      if (actionType === "UPDATE") return "Updated Event";
      if (actionType === "DELETE") return "Deleted Event";
      return actionType || "—";
    };
    const fmtCalChanges = (log) => {
      const action = String(log?.action_type || "").toUpperCase();
      const nv = log?.new_values || {}, ov = log?.old_values || {};
      if (action === "CREATE") {
        const parts = [`Title: ${nv.title || "—"}`];
        if (nv.event_type) parts.push(`Type: ${getEvtType(log)}`);
        if (nv.event_date) parts.push(`Date: ${nv.event_date}`);
        if (nv.end_date) parts.push(`End: ${nv.end_date}`);
        if (nv.description) parts.push(`Description: ${nv.description}`);
        return parts.join(" | ");
      }
      if (action === "DELETE") {
        const parts = [`Title: ${ov.title || "—"}`];
        if (ov.event_type) parts.push(`Type: ${getEvtType({ new_values: null, old_values: ov })}`);
        if (ov.event_date) parts.push(`Date: ${ov.event_date}`);
        return parts.join(" | ");
      }
      if (action === "UPDATE") {
        const changes = [];
        const fields = [
          { key: "title", label: "Title" }, { key: "event_type", label: "Type" },
          { key: "event_date", label: "Date" }, { key: "end_date", label: "End Date" },
          { key: "description", label: "Description" },
        ];
        for (const { key, label } of fields) {
          if (ov[key] !== undefined && nv[key] !== undefined && String(ov[key]) !== String(nv[key]))
            changes.push(`${label}: "${ov[key]}" → "${nv[key]}"`);
          else if (ov[key] === undefined && nv[key] !== undefined && nv[key] !== null && nv[key] !== "")
            changes.push(`${label} set to "${nv[key]}"`);
        }
        return changes.length ? changes.join(" | ") : "No changes detected";
      }
      return "—";
    };
    columns = [
      { header: "Date | Time", value: (log) => formatDateTimeStr(log?.timestamp) },
      { header: "User", value: (log) => log?.users?.email || "N/A" },
      { header: "Event Title", value: (log) => getEvtTitle(log) },
      { header: "Event Type", value: (log) => getEvtType(log) },
      { header: "Action", value: (log) => fmtCalAction(log?.action_type) },
      { header: "Changes", value: (log) => fmtCalChanges(log) },
    ];
  }

  await dispatchExport({
    fileType: isCsv ? "CSV" : isPdf ? "PDF" : "XLSX",
    filename,
    sheetName: `Audit ${typeInfo.label}`,
    title: `Audit — ${typeInfo.label}`,
    summaryLines: [
      startDate || endDate ? `Range: ${startDate || "…"} to ${endDate || "…"}` : "Range: All time",
      `Rows: ${logs.length}`,
    ],
    columns,
    rows: logs,
  });
}

function Chip({ label, value }) {
  return (
    <div className="flex items-center gap-2 bg-[#EDEDED] border border-gray-200 rounded-full px-4 py-2">
      <span className="text-xs text-gray-600">{label}</span>
      <span className="text-sm font-semibold text-[#990100]">{value}</span>
    </div>
  );
}

function SectionCard({ title, subtitle, children, right }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-md p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h2 className="text-lg font-semibold text-[#990100]">{title}</h2>
          {subtitle && <p className="text-sm text-gray-600 mt-1">{subtitle}</p>}
        </div>
        {right}
      </div>
      {children}
    </div>
  );
}

function ModuleCard({ title, description, onGenerate }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div>
        <h3 className="font-semibold text-gray-800">{title}</h3>
        {description && <p className="text-sm text-gray-500 mt-1">{description}</p>}
      </div>
      <div className="mt-auto pt-2">
        <button type="button" onClick={onGenerate} className="generate-report-button" >
          Export
        </button>
      </div>
    </div>
  );
}

function Analytics() {
  const navigate = useNavigate();
  const [summary, setSummary] = useState({
    totalEmployees: 0,
    activeProjects: 0,
    pendingLeaves: 0,
    onLeaveToday: null,
    pendingEvaluations: null,
  });
  const [employeesByDepartment, setEmployeesByDepartment] = useState([]);
  const [employeeStatusData, setEmployeeStatusData] = useState([]);
  const [employeesByPersonnelType, setEmployeesByPersonnelType] = useState([]);
  const [projectsByStatus, setProjectsByStatus] = useState([]);
  const [_loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [complianceData, setComplianceData] = useState({ compliant: 0, incomplete: 0, hasRejected: 0, total: 0 });
  const [complianceLoading, setComplianceLoading] = useState(true);
  const [evalsByType, setEvalsByType] = useState([]);
  const [evalsLoading, setEvalsLoading] = useState(true);

  const [activeModule, setActiveModule] = useState(null);
  const [moduleReportLoading, setModuleReportLoading] = useState(false);
  const [leaveTypeOptions, setLeaveTypeOptions] = useState([{ value: "all", label: "All Leave Types" }]);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      setError("");

      const [res, dashRes] = await Promise.all([
        get("/analytics/summary"),
        get("/dashboard/summary").catch(() => null),
      ]);
      if (!res?.success) throw new Error(res?.message || "Failed to load analytics");

      const data = res?.data || {};
      const dash = dashRes?.data || {};

      const s = data.summary || {};
      setSummary({
        totalEmployees: Number(s.totalEmployees) || 0,
        activeProjects: Number(s.activeProjects) || 0,
        pendingLeaves: Number(s.pendingLeaves) || 0,
        onLeaveToday: dash.onLeaveTodayCount ?? null,
        pendingEvaluations: dash.pendingEvaluationsCount ?? null,
      });

      setEmployeesByDepartment(Array.isArray(data.employeesByDepartment) ? data.employeesByDepartment : []);
      setEmployeeStatusData(Array.isArray(data.employeeStatusData) ? data.employeeStatusData : []);
      setEmployeesByPersonnelType(Array.isArray(data.employeesByPersonnelType) ? data.employeesByPersonnelType : []);
      setProjectsByStatus(Array.isArray(data.projectsByStatus) ? data.projectsByStatus : []);
    } catch (e) {
      setError(e?.message || "Failed to load data overview");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setComplianceLoading(true);
        const res = await get("/onboarding/checklists").catch(() => null);
        if (cancelled) return;

        const items = Array.isArray(res?.data) ? res.data : [];

        const byEmployee = new Map();
        for (const item of items) {
          const empId = item?.employee_id;
          if (!empId) continue;
          if (!byEmployee.has(empId)) byEmployee.set(empId, []);
          byEmployee.get(empId).push(item);
        }

        let compliant = 0, hasRejected = 0, incomplete = 0;
        for (const empItems of byEmployee.values()) {
          const required = empItems.filter((i) => i?.is_required);
          if (!required.length) { compliant++; continue; }
          const anyRejected = required.some((i) => i?.status === "rejected");
          const allApproved = required.every((i) => i?.status === "approved");
          if (allApproved) compliant++;
          else if (anyRejected) hasRejected++;
          else incomplete++;
        }

        if (!cancelled) setComplianceData({ compliant, hasRejected, incomplete, total: compliant + hasRejected + incomplete });
      } finally {
        if (!cancelled) setComplianceLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        setEvalsLoading(true);
        const res = await get("/evaluations").catch(() => null);
        if (cancelled) return;

        const now = new Date();
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        const mStart = monthStart.toISOString().split("T")[0];
        const mEnd = monthEnd.toISOString().split("T")[0];

        const allEvals = Array.isArray(res?.data) ? res.data : [];
        const pending = allEvals.filter((e) => {
          const hasDoc = !!e?.evaluation_document_path;
          const hasResult = /^\s*(score|remarks)\s*:/im.test(String(e?.evaluation_notes || ""));
          const date = String(e?.evaluation_date || "");
          return !hasDoc && !hasResult && date >= mStart && date <= mEnd;
        });
        const typeCounts = new Map();
        for (const e of pending) {
          const type = String(e?.evaluation_type || "Unknown").trim();
          typeCounts.set(type, (typeCounts.get(type) || 0) + 1);
        }
        const rows = Array.from(typeCounts.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value);

        if (!cancelled) setEvalsByType(rows);
      } finally {
        if (!cancelled) setEvalsLoading(false);
      }
    };
    run();
    return () => { cancelled = true; };
  }, []);

  const complianceChartData = useMemo(() => {
    const entries = [
      { name: "Complete", value: complianceData.compliant },
      { name: "Incomplete", value: complianceData.incomplete },
      { name: "Needs Resubmission", value: complianceData.hasRejected },
    ];
    return entries.filter((e) => e.value > 0);
  }, [complianceData]);

  useEffect(() => {
    if (activeModule !== "leave-credits") return;
    let cancelled = false;
    get(`/leave/credits?year=${new Date().getFullYear()}`).then((res) => {
      if (cancelled) return;
      const rows = Array.isArray(res?.data) ? res.data : [];
      const types = new Set();
      rows.forEach((r) => { if (r?.leave_type_name) types.add(r.leave_type_name); });
      setLeaveTypeOptions([
        { value: "all", label: "All Leave Types" },
        ...Array.from(types).sort().map((t) => ({ value: t, label: t })),
      ]);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [activeModule]);

  const handleModuleGenerate = async (moduleKey, options) => {
    setModuleReportLoading(true);
    try {
      switch (moduleKey) {
        case "employees":           await exportEmployeesReport(options); break;
        case "user-accounts":       await exportUserAccountsReport(options); break;
        case "201-files":           await export201FilesReport(options); break;
        case "departments":         await exportDepartmentsReport(options); break;
        case "projects":            await exportProjectsReport(options); break;
        case "leave-history":       await exportLeaveHistoryReport(options); break;
        case "leave-credits":       await exportLeaveCreditsReport(options); break;
        case "evaluation-history":  await exportEvaluationHistoryReport(options); break;
        case "audit-employees":
        case "audit-leave":
        case "audit-projects":
        case "audit-departments":
        case "audit-evaluations":
        case "audit-user-accounts":
        case "audit-reports":
        case "audit-calendar":
          await exportAuditReport(moduleKey, options); break;
        default:
          console.warn("Unknown module key:", moduleKey);
      }
      setActiveModule(null);
    } catch (err) {
      console.error("Report generation failed:", err);
    } finally {
      setModuleReportLoading(false);
    }
  };

  if (_loading) {
    return (
      <div className="flex min-h-screen items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#990100] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Data Overview...</p>
        </div>
      </div>
    );
  }

  const cfg = activeModule ? MODULE_CONFIGS[activeModule] : null;

  const HR_MODULES = [
    "employees",
    "user-accounts",
    "201-files",
    "departments",
    "projects",
    "leave-history",
    "leave-credits",
    "evaluation-history",
  ];

  const AUDIT_MODULES = [
    "audit-user-accounts",
    "audit-employees",
    "audit-departments",
    "audit-projects",
    "audit-leave",
    "audit-evaluations",
    "audit-reports",
    "audit-calendar",
  ];

  return (
    <div>
      <div className="p-7 lg:mx-[4.5rem] md:mx-10">
        <div>
          <h1 className="lg:text-3xl text-2xl text-[#990100] font-bold">
            Data Overview
          </h1>
        </div>

        <hr className="border-[#990100] my-6" />

        <div className="flex flex-wrap gap-3 mb-8">
          <Chip label="Active Employees" value={summary.totalEmployees} />
          <Chip label="Active Projects" value={summary.activeProjects} />
          <Chip label="Pending Leaves" value={summary.pendingLeaves} />
          <Chip label="On Leave Today" value={summary.onLeaveToday ?? "—"} />
          <Chip label="Pending Evaluations (This Month)" value={summary.pendingEvaluations ?? "—"} />
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid lg:grid-cols-2 gap-8">
          <SectionCard
            title="Employee Distribution by Department"
            subtitle="Headcount allocation across departments."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={employeesByDepartment} layout="vertical" margin={{ left: 10, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="department" type="category" width={160} />
                  <Tooltip />
                  <Bar dataKey="value" fill="#990100" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Employee Type Distribution"
            subtitle="Breakdown by personnel type (e.g. Regular, Project-Based)."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={employeesByPersonnelType}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={4}
                  >
                    {employeesByPersonnelType.map((_, index) => (
                      <Cell key={index} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend iconType="circle" iconSize={10} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="Projects Overview"
            subtitle="Ongoing vs completed projects."
          >
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={projectsByStatus}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                    {projectsByStatus.map((entry, index) => (
                      <Cell
                        key={index}
                        fill={PROJECT_STATUS_COLORS[entry.name] || "#6B7280"}
                      />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </SectionCard>

          <SectionCard
            title="201 File Compliance"
            subtitle="Required document completion status across all employees."
            right={
              <button type="button" onClick={() => navigate("/employees/201-files")} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 whitespace-nowrap" >
                View 201 Files
              </button>
            }
          >
            {complianceLoading ? (
              <p className="text-sm text-gray-500">Loading compliance data…</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={complianceChartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={90} paddingAngle={4} >
                      {complianceChartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={COMPLIANCE_COLORS[["Complete", "Incomplete", "Needs Resubmission"].indexOf(entry.name)]}
                        />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend iconType="circle" iconSize={10} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="mt-8">
          <SectionCard
            title="Evaluations by Type"
            subtitle="Pending evaluations this month, broken down by type."
            right={
              <button type="button" onClick={() => navigate("/evaluation/history")} className="text-sm px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 whitespace-nowrap" >
                View Evaluations
              </button>
            }
          >
            {evalsLoading ? (
              <p className="text-sm text-gray-500">Loading evaluations data…</p>
            ) : (
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={evalsByType} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                    <Tooltip />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                      {evalsByType.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </SectionCard>
        </div>

        <div className="mt-8">
          <SectionCard title="HR Data Exports" subtitle="Generate and export reports for any HR module." >
            <div className="grid lg:grid-cols-3 md:grid-cols-2 grid-cols-1 gap-4">
              {HR_MODULES.map((key) => {
                const c = MODULE_CONFIGS[key];
                return (
                  <ModuleCard key={key} title={c.title} description={c.description} onGenerate={() => setActiveModule(key)} />
                );
              })}
            </div>
          </SectionCard>
        </div>

        <div className="mt-8">
          <SectionCard title="Log Exports" subtitle="Export audit trail logs for any module." >
            <div className="grid lg:grid-cols-4 md:grid-cols-2 grid-cols-2 gap-3">
              {AUDIT_MODULES.map((key) => {
                const c = MODULE_CONFIGS[key];
                return (
                  <div key={key} className="flex items-center justify-between gap-2 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3" >
                    <span className="text-sm font-medium text-gray-700">{c.title}</span>
                    <button type="button" onClick={() => setActiveModule(key)} className="text-xs px-3 py-1.5 rounded-md bg-[#990100] text-white hover:bg-[#7a0100] whitespace-nowrap transition-colors" >
                      Export
                    </button>
                  </div>
                );
              })}
            </div>
          </SectionCard>
        </div>

        {activeModule && cfg && (
          <ReportModal
            open={true}
            title={cfg.modalTitle}
            onClose={() => setActiveModule(null)}
            onGenerate={(opts) => handleModuleGenerate(activeModule, opts)}
            loading={moduleReportLoading}
            enableDateRange={cfg.enableDateRange ?? false}
            dateRangeHint={cfg.dateRangeHint}
            fileTypes={cfg.fileTypes ?? ["XLSX", "CSV"]}
            categoryOptions={activeModule === "leave-credits" ? leaveTypeOptions : (cfg.categoryOptions ?? null)}
            defaultCategory={activeModule === "leave-credits" ? "all" : undefined}
            yearOptions={cfg.yearOptions ?? null}
          />
        )}
      </div>
    </div>
  );
}

export default Analytics;
