import { supabase } from "../config/supabase.js";
import { BadRequestError, InternalServerError } from "../utils/errors.js";
import { AUDIT_ACTIONS } from "../config/constants.js";
import logger from "../utils/logger.js";

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
    role
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

    return data || [];
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

    return data || [];
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

    return data || [];
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
