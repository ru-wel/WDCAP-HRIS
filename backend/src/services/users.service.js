import { supabase } from "../config/supabase.js";
import { InternalServerError, NotFoundError, ConflictError } from "../utils/errors.js";
import { AUDIT_ACTIONS, EMPLOYMENT_STATUSES, ROLES } from "../config/constants.js";
import logger from "../utils/logger.js";

const userFields = "id, employee_id, email, role, created_at";

const DELETED_EMAIL_PREFIX = 'deleted+';

const isSoftDeletedEmail = (email) => {
  const normalized = String(email || '').trim().toLowerCase();
  return normalized.startsWith(DELETED_EMAIL_PREFIX);
};

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

export const getAllUsers = async (requester) => {
  try {
    const requesterRole = requester?.role;
    const requesterId = requester?.id;

    let query = supabase.from("users").select(userFields);

    if (requesterRole === ROLES.ADMIN) {
      // no additional filtering
    } else if (requesterRole === ROLES.HR) {
      query = query.in("role", [ROLES.HR, ROLES.EMPLOYEE]);
    } else {
      // Employee (or any unexpected role): self-only
      query = query.eq("id", requesterId || "__no_user__");
    }

    const { data: users, error } = await query.order("employee_id", { ascending: true });

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

    const visibleUsers = (users || []).filter((u) => !isSoftDeletedEmail(u.email));

    return visibleUsers.map((u) => ({
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
        record_id: existingUser.id,
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
          old_values: {
            employee_id: employee.employee_id,
            employment_status: employee.employment_status,
          },
          new_values: {
            employee_id: employee.employee_id,
            employment_status: nextEmploymentStatus,
          },
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

    // Safety: never delete a user that still has an employee profile.
    // Deleting users can cascade into employees (and any employee-linked history) depending on DB FK rules.
    const { data: existingUser, error: fetchUserError } = await supabase
      .from('users')
      .select(userFields)
      .eq(key, value)
      .maybeSingle();

    // Idempotent delete: if the user no longer exists (or is already hidden/soft-deleted), treat as success.
    if (fetchUserError || !existingUser || isSoftDeletedEmail(existingUser.email)) {
      return {
        id: key === 'id' ? value : null,
        employee_id: key === 'employee_id' ? value : null,
        email: '',
        role: '',
        created_at: null,
        alreadyDeleted: true
      };
    }

    const { data: linkedEmployee, error: employeeLookupError } = await supabase
      .from('employees')
      .select('id, employee_id, employment_status')
      .eq('user_id', existingUser.id)
      .maybeSingle();

    if (employeeLookupError) throw new InternalServerError(employeeLookupError.message);

    if (linkedEmployee) {
      const normalized = String(linkedEmployee.employment_status || '').trim().toUpperCase();
      const isArchived = normalized === String(EMPLOYMENT_STATUSES.INACTIVE).trim().toUpperCase();

      if (!isArchived) {
        throw new ConflictError(
          'Cannot delete a user account that is linked to an ACTIVE employee profile. Archive the employee first (Employees page), then delete the user account (User Accounts page).'
        );
      }

      // NOTE: employees.user_id is NOT NULL in this DB, so we cannot unlink an employee profile.
      // To support the required flow (archive first, then delete), we do a *hard disable*:
      // - Delete Supabase Auth user (removes login access)
      // - Soft-delete app user row by changing email to a safe marker
      // - Hide soft-deleted users from User Accounts listing

      const markerEmail = `${DELETED_EMAIL_PREFIX}${linkedEmployee.employee_id || existingUser.employee_id || existingUser.id}@wdcap.invalid`;

      // Best-effort: delete the Supabase Auth identity first.
      try {
        const { error: authDeleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
        if (authDeleteError) {
          logger.warn(`Failed to delete Auth user (will still soft-delete app user): ${authDeleteError.message}`);
        }
      } catch (authDeleteErr) {
        logger.warn('Failed to delete Auth user (will still soft-delete app user):', authDeleteErr);
      }

      const { data: updated, error: updateError } = await supabase
        .from('users')
        .update({ email: markerEmail })
        .eq('id', existingUser.id)
        .select(userFields)
        .maybeSingle();

      if (updateError) {
        throw new InternalServerError(updateError.message);
      }

      const effectiveUpdated = updated || { ...existingUser, email: markerEmail };

      const { error: auditError } = await supabase.from('audit_logs').insert({
        user_id: actorId,
        action_type: AUDIT_ACTIONS.DELETE,
        table_name: 'users',
        record_id: existingUser.id,
        old_values: existingUser,
        new_values: { deleted: true, email: existingUser.email, deleted_email: markerEmail },
        timestamp: new Date().toISOString()
      });

      if (auditError) {
        throw new InternalServerError(`Failed to create audit log: ${auditError.message}`);
      }

      return effectiveUpdated;
    }

    const { data: deleted, error } = await supabase
      .from("users")
      .delete()
      .eq(key, value)
      .select(userFields)
      .maybeSingle();

    if (error) throw new InternalServerError(error.message);

    // Some environments may not return the deleted row representation; treat as success if no error.
    const effectiveDeleted = deleted || existingUser;

    const { error: auditError } = await supabase.from("audit_logs").insert({
      user_id: actorId,
      action_type: AUDIT_ACTIONS.DELETE,
      table_name: "users",
      record_id: effectiveDeleted.id,
      old_values: effectiveDeleted,
      timestamp: new Date().toISOString(),
    });

    if (auditError) {
      throw new InternalServerError(`Failed to create audit log: ${auditError.message}`);
    }

    // Best-effort: delete the Supabase Auth identity too.
    // This ensures the account can no longer log in.
    try {
      const { error: authDeleteError } = await supabase.auth.admin.deleteUser(existingUser.id);
      if (authDeleteError) {
        logger.warn(`Deleted app user but failed to delete Auth user: ${authDeleteError.message}`);
      }
    } catch (authDeleteErr) {
      logger.warn('Deleted app user but failed to delete Auth user:', authDeleteErr);
    }

    return effectiveDeleted;
  } catch (error) {
    logger.error("deleteUserByEmployeeId error:", error);
    throw error;
  }
};
