import { supabase, createAnonSupabaseClient, supabaseAnonKey } from '../config/supabase.js';
import { UnauthorizedError, ConflictError, InternalServerError, NotFoundError } from '../utils/errors.js';
import { ROLES, AUDIT_ACTIONS, EMPLOYMENT_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';
import { sendEmail } from './mail.service.js';

const parseEmailList = (value) => {
  return String(value || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
};

const getResetRequestRecipients = () => {
  // Prefer a dedicated env var, but allow a generic one.
  return (
    parseEmailList(process.env.RESET_REQUEST_NOTIFY_EMAILS) ||
    parseEmailList(process.env.ADMIN_NOTIFICATION_EMAILS) ||
    []
  );
};

const getResetRequestCooldownMinutes = () => {
  const raw = process.env.RESET_REQUEST_COOLDOWN_MINUTES;
  const n = Number(raw);
  // Default: 15 minutes
  if (!Number.isFinite(n) || n <= 0) return 15;
  return Math.floor(n);
};

const getAuditFallbackActorUserId = async () => {
  // Use a real Admin/HR user id as a fallback so audit_logs inserts don't fail
  // when user_id has NOT NULL / FK constraints.
  try {
    const { data } = await supabase
      .from('users')
      .select('id, role')
      .in('role', [ROLES.ADMIN, ROLES.HR])
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  } catch {
    return null;
  }
};

// Register a new user
export const register = async ({ email, password, role = ROLES.EMPLOYEE }) => {
  try {
    // check if user already exists
    const { data: existingUser, error: checkError } = await supabase 
      .from('users')
      .select('id, email')
      .eq('email', email)
      .single();
    
    if (existingUser){
      throw new ConflictError('Email already registered');
    }

    // create user in Supabase Auth
    const { data: authData, error: signUpError } = await supabase.auth.signUp({
      email,
      password
    });

    if (signUpError){
      throw new InternalServerError('Failed to create user account');
    }

    if (!authData.user){
      throw new InternalServerError('Failed to create user account');
    }

    // insert user details into users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        {
          id: authData.user.id,
          email,
          role,
          employee_id: null, // Will be set when employee profile is created
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          last_login: null
        }
      ])
      .select()
      .single();
    
    if (insertError){
      // Rollback: delete the auth user if insert fails
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw new InternalServerError(insertError.message);
    }

    // log registration in audit_logs
    await supabase.from('audit_logs').insert({
      user_id: newUser.id,
      action_type: AUDIT_ACTIONS.CREATE, // constant from constants.js
      table_name: 'users',
      record_id: newUser.id,
      new_values: { email, role },
      timestamp: new Date().toISOString() 
    });

    logger.info(`New user registered: ${email} with role ${role}`);

    return {
      id: newUser.id,
      email: newUser.email,
      role: newUser.role
    }

  } catch (error) {
    logger.error('Registration error:', error)
    throw error;
  }
}

// Login user
export const login = async ({ email, password }) => {
  try {
    //authenticate with Supabase Auth
    const { data: authData, error: signInError } = await supabase.auth.signInWithPassword({
      email, password
    });

    if (signInError || !authData.user){
      throw new UnauthorizedError('Invalid email or password');
    }

    // get user role from users table
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, employee_id')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      throw new InternalServerError('User not found in database');
    }

    // Best-effort: if employee_id is missing, resolve it via employees.user_id
    let resolvedEmployeeId = userData.employee_id;
    if (!resolvedEmployeeId) {
      const { data: emp } = await supabase
        .from('employees')
        .select('employee_id')
        .eq('user_id', userData.id)
        .maybeSingle();

      if (emp?.employee_id) {
        resolvedEmployeeId = emp.employee_id;
        await supabase
          .from('users')
          .update({ employee_id: resolvedEmployeeId, updated_at: new Date().toISOString() })
          .eq('id', userData.id);
      }
    }

    // Block inactive employee accounts.
    // (Admins/HR without an employee profile are allowed through.)
    if (resolvedEmployeeId) {
      const { data: statusRow } = await supabase
        .from('employees')
        .select('employment_status')
        .eq('employee_id', resolvedEmployeeId)
        .maybeSingle();

      const normalizedStatus = String(statusRow?.employment_status || '').trim().toLowerCase();
      if (normalizedStatus && normalizedStatus === String(EMPLOYMENT_STATUSES.INACTIVE).trim().toLowerCase()) {
        throw new UnauthorizedError('This account is inactive. Contact administrator for more help.');
      }
    }

    // update last_login timestamp
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    // log the login in audit_logs
    await supabase.from('audit_logs').insert({
      user_id: userData.id,
      action_type: AUDIT_ACTIONS.LOGIN, // constant from constants.js
      table_name: 'users',
      record_id: userData.id,
      timestamp: new Date().toISOString()
    });

    // best-effort: fetch employee profile name for welcome header
    let employeeProfile = null;
    if (resolvedEmployeeId) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, employee_id, employment_status')
        .eq('employee_id', resolvedEmployeeId)
        .maybeSingle();
      employeeProfile = employee || null;
    }

    const fullName = employeeProfile
      ? [employeeProfile.first_name, employeeProfile.middle_name, employeeProfile.last_name]
          .filter(Boolean)
          .join(' ')
      : null;

    logger.info(`User logged in: ${email}`);
    return {
      user: {
        id: userData.id,
        email: userData.email,
        role: userData.role,
        employee_id: resolvedEmployeeId,
        employee_db_id: employeeProfile?.id ?? null,
        first_name: employeeProfile?.first_name || null,
        last_name: employeeProfile?.last_name || null,
        name: fullName || null
      },
      session: {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
        expires_in: authData.session.expires_in
      }
    }
  } catch (error) {
    logger.error('Login error:', error);
    throw error;
  }
};

export const refreshToken = async ({ refresh_token }) => {
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token });

    if (error || !data.session) {
      throw new UnauthorizedError('Invalid refresh token');
    }

    return {
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in
      }
    };
  } catch (error) {
    logger.error('Token refresh error:', error);
    throw error;
  }
};

export const getCurrentUser = async ({ id, email, role, employee_id, employee_db_id }) => {
  try {
    let employeeProfile = null;
    if (employee_db_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, employee_id')
        .eq('id', employee_db_id)
        .maybeSingle();
      employeeProfile = employee || null;
    } else if (employee_id) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id, first_name, middle_name, last_name, employee_id')
        .eq('employee_id', employee_id)
        .maybeSingle();
      employeeProfile = employee || null;
    }

    const fullName = employeeProfile
      ? [employeeProfile.first_name, employeeProfile.middle_name, employeeProfile.last_name]
          .filter(Boolean)
          .join(' ')
      : null;

    return {
      id,
      email,
      role,
      employee_id: employee_id || employeeProfile?.employee_id || null,
      employee_db_id: employee_db_id || employeeProfile?.id || null,
      first_name: employeeProfile?.first_name || null,
      last_name: employeeProfile?.last_name || null,
      name: fullName || null
    };
  } catch (error) {
    logger.error('Get current user error:', error);
    throw error;
  }
};

export const changePassword = async ({ userId, email, current_password, new_password }) => {
  try {
    if (!supabaseAnonKey) {
      throw new InternalServerError('SUPABASE_ANON_KEY is not configured; cannot verify current password');
    }

    const anon = createAnonSupabaseClient();
    if (!anon) {
      throw new InternalServerError('Supabase anon client is not available');
    }

    const { data: signInData, error: signInError } = await anon.auth.signInWithPassword({
      email,
      password: current_password
    });

    if (signInError || !signInData?.user) {
      throw new UnauthorizedError('Current password is incorrect');
    }

    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password
    });

    if (updateError || !updated?.user) {
      throw new InternalServerError('Failed to update password');
    }

    // best-effort audit log
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'users',
      record_id: userId,
      new_values: { password: 'updated' },
      timestamp: new Date().toISOString()
    });

    return { success: true };
  } catch (error) {
    logger.error('Change password error:', error);
    throw error;
  }
};

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const resolveUserLookup = (identifier) => {
  const value = String(identifier || '').trim();
  const key = UUID_REGEX.test(value) ? 'id' : 'employee_id';
  return { key, value };
};

// Admin/HR-assisted password reset (safe alternative to security questions).
export const adminResetPassword = async ({ employeeId, new_password, actorId }) => {
  try {
    const { key, value } = resolveUserLookup(employeeId);

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, email, employee_id')
      .eq(key, value)
      .maybeSingle();

    if (userError) throw new InternalServerError(userError.message);
    if (!userRow?.id) throw new NotFoundError('User not found');

    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(userRow.id, {
      password: new_password
    });

    if (updateError || !updated?.user) {
      throw new InternalServerError('Failed to reset password');
    }

    await supabase.from('audit_logs').insert({
      user_id: actorId || userRow.id,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'users',
      record_id: userRow.employee_id || userRow.id,
      new_values: { password: 'reset_by_admin' },
      timestamp: new Date().toISOString()
    });

    return { user_id: userRow.id, email: userRow.email };
  } catch (error) {
    logger.error('Admin reset password error:', error);
    throw error;
  }
};

// Public password reset request (creates a notification trail for Admin/HR)
// Note: Always returns success to avoid account enumeration.
export const requestPasswordReset = async ({ email, ip = null, userAgent = null }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();

  try {
    if (!normalizedEmail) return { success: true };

    // Best-effort resolve user_id for audit log (in case audit_logs.user_id is NOT NULL)
    let resolvedUserId = null;
    try {
      const { data: userRow } = await supabase
        .from('users')
        .select('id')
        .eq('email', normalizedEmail)
        .maybeSingle();
      resolvedUserId = userRow?.id || null;
    } catch {
      resolvedUserId = null;
    }

    const fallbackActorId = await getAuditFallbackActorUserId();
    const actorUserId = resolvedUserId || fallbackActorId;

    // Throttle by email to prevent spam (persists because it checks DB, not memory).
    const cooldownMinutes = getResetRequestCooldownMinutes();
    const cutoffIso = new Date(Date.now() - cooldownMinutes * 60 * 1000).toISOString();
    let recentlyRequested = false;
    try {
      const { data: recent } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('action_type', AUDIT_ACTIONS.PASSWORD_RESET_REQUEST)
        .eq('table_name', 'users')
        .eq('new_values->>email', normalizedEmail)
        .gte('timestamp', cutoffIso)
        .limit(1);
      recentlyRequested = Array.isArray(recent) && recent.length > 0;
    } catch (e) {
      // If filtering on JSON path isn't supported in this DB/view, fail open.
      logger.warn('Reset request cooldown check failed (continuing without throttle):', e);
      recentlyRequested = false;
    }

    if (recentlyRequested) {
      // Do not create more audit rows / do not send more emails within cooldown.
      return { success: true };
    }

    // Best-effort audit log (should never block the request)
    try {
      await supabase.from('audit_logs').insert({
        user_id: actorUserId,
        action_type: AUDIT_ACTIONS.PASSWORD_RESET_REQUEST,
        // Store under users so Admin/HR can view it in User Accounts and existing audit views.
        table_name: 'users',
        record_id: resolvedUserId || actorUserId,
        new_values: {
          email: normalizedEmail,
          ip: ip || null,
          user_agent: userAgent || null,
          requested_at: nowIso
        },
        timestamp: nowIso
      });
    } catch (e) {
      logger.warn('Failed to write PASSWORD_RESET_REQUEST audit log (continuing):', e);
    }

    // Optional email notification to Admin/HR
    const recipients = getResetRequestRecipients();
    if (recipients.length) {
      await sendEmail({
        to: recipients,
        subject: '[HRIS] Password reset request',
        text: `A password reset request was submitted for: ${normalizedEmail}\n\nTime: ${nowIso}\nIP: ${ip || 'n/a'}\nUser-Agent: ${userAgent || 'n/a'}\n\nAction: Admin/HR can reset via the User Accounts panel.`
      });
    }

    return { success: true };
  } catch (error) {
    logger.error('Password reset request error:', error);
    // Never leak details / never fail the request.
    return { success: true };
  }
};