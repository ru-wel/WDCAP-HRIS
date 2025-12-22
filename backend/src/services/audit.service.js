import pool from "../config/db.js";

/**
 * Fetch audit logs with optional filters
 */
export const getAuditLogs = async ({
  table_name,
  user_id,
  action_type,
  limit = 50,
  offset = 0
}) => {
  let conditions = [];
  let values = [];

  if (table_name) {
    values.push(table_name);
    conditions.push(`table_name = $${values.length}`);
  }

  if (user_id) {
    values.push(user_id);
    conditions.push(`user_id = $${values.length}`);
  }

  if (action_type) {
    values.push(action_type);
    conditions.push(`action_type = $${values.length}`);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

  const query = `
    SELECT
      al.id AS log_id,
      al.action_type,
      al.table_name,
      al.record_id,
      al.old_values,
      al.new_values,
      al.created_at,
      u.email
    FROM audit_logs al
    LEFT JOIN users u ON u.id = al.user_id
    ${whereClause}
    ORDER BY al.created_at DESC
    LIMIT $${values.length + 1}
    OFFSET $${values.length + 2}
  `;

  values.push(limit, offset);

  const { rows } = await pool.query(query, values);
  return rows;
};
