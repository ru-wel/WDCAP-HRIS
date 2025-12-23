import { supabase } from "../config/supabase.js";
import { InternalServerError } from "../utils/errors.js";
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
    const { data, error } = await supabase
      .from("audit_logs")
      .select(auditLogFields)
      .eq("table_name", tableName)
      .order("timestamp", { ascending: false });

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
