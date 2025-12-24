import { supabase } from "../config/supabase.js";
import { InternalServerError, NotFoundError } from "../utils/errors.js";
import { AUDIT_ACTIONS, EMPLOYMENT_STATUSES } from "../config/constants.js";
import logger from "../utils/logger.js";

const userFields = "id, employee_id, email, role, created_at";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveUserLookup = (identifier) => {
  const value = String(identifier || "").trim();
  const key = UUID_REGEX.test(value) ? "id" : "employee_id";
  return { key, value };
};

const toUiStatus = (employmentStatus) => {
  if (!employmentStatus) return "ACTIVE";
  const normalized = String(employmentStatus).trim().toLowerCase();
  if (normalized === "inactive") return "INACTIVE";
  return "ACTIVE";
};

const toEmploymentStatus = (uiStatus) => {
  const normalized = String(uiStatus || "").trim().toUpperCase();
  return normalized === "INACTIVE"
    ? EMPLOYMENT_STATUSES.INACTIVE
    : EMPLOYMENT_STATUSES.ACTIVE;
};

export const getAllUsers = async () => {
  try {
    const { data: users, error } = await supabase
      .from("users")
      .select(userFields)
      .order("employee_id", { ascending: true });

    if (error) throw new InternalServerError(error.message);

    const userIds = (users || []).map((u) => u.id).filter(Boolean);
    let statusByUserId = {};

    if (userIds.length > 0) {
      const { data: employees, error: employeesError } = await supabase
        .from("employees")
        .select("user_id, employment_status")
        .in("user_id", userIds);

      if (!employeesError && Array.isArray(employees)) {
        statusByUserId = employees.reduce((acc, e) => {
          acc[e.user_id] = toUiStatus(e.employment_status);
          return acc;
        }, {});
      }
    }

    return (users || []).map((u) => ({
      ...u,
      status: statusByUserId[u.id] || "ACTIVE",
    }));
  } catch (error) {
    logger.error("getAllUsers error:", error);
    throw error;
  }
};

export const updateUserByEmployeeId = async (employeeId, { role, status }, actorId) => {
  try {
    const { key, value } = resolveUserLookup(employeeId);

    const { data: existingUser, error: fetchError } = await supabase
      .from("users")
      .select(userFields)
      .eq(key, value)
      .single();

    if (fetchError || !existingUser) throw new NotFoundError("User not found");

    const newValues = {};
    if (role !== undefined) newValues.role = role;

    let updatedUser = existingUser;
    if (Object.keys(newValues).length > 0) {
      const { data: updated, error: updateError } = await supabase
        .from("users")
        .update(newValues)
        .eq(key, value)
        .select(userFields)
        .single();

      if (updateError) throw new InternalServerError(updateError.message);
      updatedUser = updated;

      await supabase.from("audit_logs").insert({
        user_id: actorId,
        action_type: AUDIT_ACTIONS.UPDATE,
        table_name: "users",
        record_id: existingUser.employee_id || existingUser.id,
        old_values: { role: existingUser.role },
        new_values: { role: updatedUser.role },
        timestamp: new Date().toISOString(),
      });
    }

    // Optional: map UI status to employees.employment_status
    if (status !== undefined) {
      const { data: employee, error: employeeFetchError } = await supabase
        .from("employees")
        .select("id, employee_id, user_id, employment_status")
        .eq("user_id", existingUser.id)
        .single();

      if (!employeeFetchError && employee) {
        const nextEmploymentStatus = toEmploymentStatus(status);

        const { error: employeeUpdateError } = await supabase
          .from("employees")
          .update({ employment_status: nextEmploymentStatus })
          .eq("id", employee.id);

        if (employeeUpdateError) throw new InternalServerError(employeeUpdateError.message);

        await supabase.from("audit_logs").insert({
          user_id: actorId,
          action_type: AUDIT_ACTIONS.UPDATE,
          table_name: "employees",
          record_id: employee.id,
          old_values: { employment_status: employee.employment_status },
          new_values: { employment_status: nextEmploymentStatus },
          timestamp: new Date().toISOString(),
        });
      }
    }

    // recompute status
    const { data: employeeForStatus } = await supabase
      .from("employees")
      .select("employment_status")
      .eq("user_id", existingUser.id)
      .maybeSingle();

    return {
      ...updatedUser,
      status: toUiStatus(employeeForStatus?.employment_status),
    };
  } catch (error) {
    logger.error("updateUserByEmployeeId error:", error);
    throw error;
  }
};

export const deleteUserByEmployeeId = async (employeeId, actorId) => {
  try {
    const { key, value } = resolveUserLookup(employeeId);

    const { data: deleted, error } = await supabase
      .from("users")
      .delete()
      .eq(key, value)
      .select(userFields)
      .single();

    if (error || !deleted) throw new NotFoundError("User not found");

    await supabase.from("audit_logs").insert({
      user_id: actorId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: "users",
      record_id: deleted.employee_id || deleted.id,
      old_values: deleted,
      timestamp: new Date().toISOString(),
    });

    return deleted;
  } catch (error) {
    logger.error("deleteUserByEmployeeId error:", error);
    throw error;
  }
};
