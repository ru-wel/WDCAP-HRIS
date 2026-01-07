import { supabase } from "../config/supabase.js";
import { BadRequestError, InternalServerError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const toFullName = (firstName, lastName) => {
  const fn = String(firstName || '').trim();
  const ln = String(lastName || '').trim();
  return `${fn} ${ln}`.trim();
};

const normalizeJsonObject = (value) => {
  if (!value || typeof value !== 'object') return null;
  return value;
};

const resolveActorLabel = ({ email, role, employee }) => {
  const employeeName = toFullName(employee?.first_name, employee?.last_name);
  if (employeeName) return employeeName;
  const normalizedRole = String(role || '').trim();
  if (normalizedRole) return normalizedRole;
  return String(email || '').trim() || 'Unknown user';
};

const extractTargetEmployeeHint = (log) => {
  const table = String(log?.table_name || '').trim().toLowerCase();
  const preferred = normalizeJsonObject(log?.new_values);
  const fallback = normalizeJsonObject(log?.old_values);
  const values = preferred || fallback || {};

  // When the audit row is about an employee record itself, it commonly already
  // includes the human-readable fields.
  if (table === 'employees') {
    const code = String(values?.employee_id || '').trim();
    const name = toFullName(values?.first_name, values?.last_name);
    return {
      employeeDbId: null,
      employeeCode: code || null,
      employeeName: name || null,
    };
  }

  const directEmployeeId = values?.employee_id ?? values?.employeeId ?? null;
  const directEmployeeCode = values?.employee_code ?? values?.employeeCode ?? null;

  const asString = (v) => (typeof v === 'string' ? v.trim() : '');
  const maybeId = asString(directEmployeeId);
  const maybeCode = asString(directEmployeeCode);

  return {
    employeeDbId: UUID_REGEX.test(maybeId) ? maybeId : null,
    employeeCode: !UUID_REGEX.test(maybeId) && maybeId ? maybeId : (maybeCode || null),
    employeeName: null,
  };
};

export const enrichAuditLogs = async (logs) => {
  const rows = Array.isArray(logs) ? logs : [];
  if (rows.length === 0) return [];

  const actorUserIds = Array.from(
    new Set(rows.map((r) => r?.user_id).filter((id) => UUID_REGEX.test(String(id || ''))))
  );

  const targetHints = rows.map(extractTargetEmployeeHint);
  const targetEmployeeDbIds = Array.from(
    new Set(targetHints.map((h) => h?.employeeDbId).filter((id) => UUID_REGEX.test(String(id || ''))))
  );
  const targetEmployeeCodes = Array.from(
    new Set(targetHints.map((h) => String(h?.employeeCode || '').trim()).filter(Boolean))
  );

  let employeesByUserId = {};
  let employeesById = {};
  let employeesByCode = {};

  if (actorUserIds.length > 0) {
    const { data: actorEmployees, error: actorEmployeesError } = await supabase
      .from('employees')
      .select('user_id, employee_id, first_name, last_name')
      .in('user_id', actorUserIds);

    if (!actorEmployeesError && Array.isArray(actorEmployees)) {
      employeesByUserId = actorEmployees.reduce((acc, e) => {
        if (!e?.user_id) return acc;
        acc[e.user_id] = e;
        return acc;
      }, {});
    }
  }

  if (targetEmployeeDbIds.length > 0) {
    const { data: targetEmployees, error: targetEmployeesError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .in('id', targetEmployeeDbIds);

    if (!targetEmployeesError && Array.isArray(targetEmployees)) {
      employeesById = targetEmployees.reduce((acc, e) => {
        if (!e?.id) return acc;
        acc[e.id] = e;
        return acc;
      }, {});
    }
  }

  if (targetEmployeeCodes.length > 0) {
    const { data: targetEmployeesByCode, error: targetEmployeesByCodeError } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .in('employee_id', targetEmployeeCodes);

    if (!targetEmployeesByCodeError && Array.isArray(targetEmployeesByCode)) {
      employeesByCode = targetEmployeesByCode.reduce((acc, e) => {
        const code = String(e?.employee_id || '').trim();
        if (!code) return acc;
        acc[code] = e;
        return acc;
      }, {});
    }
  }

  return rows.map((log, idx) => {
    const user = log?.users || {};
    const actorEmployee = employeesByUserId[log?.user_id] || null;
    const actorName = resolveActorLabel({
      email: user?.email,
      role: user?.role,
      employee: actorEmployee,
    });

    const hint = targetHints[idx] || {};
    let targetEmployee = null;

    if (hint?.employeeName || hint?.employeeCode) {
      targetEmployee = {
        id: hint?.employeeDbId || null,
        employee_code: hint?.employeeCode || null,
        name: hint?.employeeName || null,
      };
    } else if (hint?.employeeDbId && employeesById[hint.employeeDbId]) {
      const e = employeesById[hint.employeeDbId];
      targetEmployee = {
        id: e.id,
        employee_code: e.employee_id || null,
        name: toFullName(e.first_name, e.last_name) || null,
      };
    } else if (hint?.employeeCode && employeesByCode[hint.employeeCode]) {
      const e = employeesByCode[hint.employeeCode];
      targetEmployee = {
        id: e.id,
        employee_code: e.employee_id || null,
        name: toFullName(e.first_name, e.last_name) || null,
      };
    }

    return {
      ...log,
      actor: {
        name: actorName,
        email: user?.email || '',
        role: user?.role || '',
        employee_code: actorEmployee?.employee_id || user?.employee_id || null,
      },
      target_employee: targetEmployee,
    };
  });
};

// fields to display (can be changed later)
const auditLogFields = `
  id,
  user_id,
  action_type,
  table_name,
  record_id,
  old_values,
  new_values,
  timestamp,
  users (
    id,
    email,
    role,
    employee_id
  )
`;

// get all audit logs
export const getAllAuditLogs = async () => {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(auditLogFields)
      .order("timestamp", { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return enrichAuditLogs(data || []);
  } catch (error) {
    logger.error("Error fetching audit logs:", error);
    throw error;
  }
};

// get audit logs by table name (employees, users, etc.)
export const getAuditLogsByTable = async (tableName) => {
  try {
    const normalized = String(tableName || '').trim().toLowerCase();
    const leaveTables = ['leave_requests', 'leave_types', 'employee_leave_balances'];
    const employeesTables = ['employees', 'documents', 'onboarding_checklists', 'onboarding_items'];

    let query = supabase.from("audit_logs").select(auditLogFields);
    if (normalized === 'leave') query = query.in("table_name", leaveTables);
    else if (normalized === 'employees') query = query.in('table_name', employeesTables);
    else if (normalized === 'reports') query = query.eq('action_type', AUDIT_ACTIONS.GENERATE_REPORT);
    else query = query.eq("table_name", tableName);

    const { data, error } = await query.order("timestamp", { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return enrichAuditLogs(data || []);
  } catch (error) {
    logger.error(`Error fetching audit logs for table ${tableName}:`, error);
    throw error;
  }
};

// get audit logs by user
export const getAuditLogsByUser = async (userId) => {
  try {
    const { data, error } = await supabase
      .from("audit_logs")
      .select(auditLogFields)
      .eq("user_id", userId)
      .order("timestamp", { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    return enrichAuditLogs(data || []);
  } catch (error) {
    logger.error(`Error fetching audit logs for user ${userId}:`, error);
    throw error;
  }
};

export const createReportAuditLog = async ({
  userId,
  reportName,
  filename = null,
  startDate = null,
  endDate = null,
  rowCount = null,
  source = null,
}) => {
  try {
    if (!userId) throw new BadRequestError("User ID is required");

    const normalizedReportName = String(reportName || "").trim();
    if (!normalizedReportName) throw new BadRequestError("Report name is required");

    const normalizedSource = String(source || '').trim();
    const payload = {
      user_id: userId,
      action_type: AUDIT_ACTIONS.GENERATE_REPORT,
      // Store under the report source table (users/employees/projects/etc) when available.
      // This makes "Generate Report" show up in that table's audit logs.
      table_name: normalizedSource || "reports",
      // Keep record_id non-null in case the DB schema enforces it.
      record_id: userId,
      new_values: {
        report_name: normalizedReportName,
        filename: filename || null,
        start_date: startDate || null,
        end_date: endDate || null,
        row_count: Number.isFinite(Number(rowCount)) ? Number(rowCount) : null,
        source: normalizedSource || null,
      },
      timestamp: new Date().toISOString(),
    };

    const { error } = await supabase.from("audit_logs").insert(payload);
    if (error) throw new InternalServerError(error.message);

    return true;
  } catch (error) {
    logger.error("Error creating report audit log:", error);
    throw error;
  }
};
