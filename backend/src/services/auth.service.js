import { supabase, createAnonSupabaseClient, supabaseAnonKey } from '../config/supabase.js';
import { UnauthorizedError, ConflictError, InternalServerError, NotFoundError } from '../utils/errors.js';
import { ROLES, AUDIT_ACTIONS, EMPLOYMENT_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';
import { sendEmail } from './mail.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

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
  if (typeof raw === 'undefined') return 15;

  const n = Number(raw);
  // Default: 15 minutes (when unset). Allow 0 to disable throttling for local/dev.
  if (!Number.isFinite(n) || n < 0) return 15;
  if (n === 0) return 0;
  return Math.floor(n);
};

const escapeHtml = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const WEBSITE_COLORS = {
  red: '#990100',
  mustard: '#F59E0B',
  green: '#22C55E',
  gray: '#6B7280'
};

const LOGO_CID = 'arise-logo-login';
let cachedLogoAttachment = undefined;

const getEmailLogoAttachment = async () => {
  if (cachedLogoAttachment !== undefined) return cachedLogoAttachment;

  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const logoPath = path.resolve(__dirname, '../../../frontend/public/arise-logo-login.png');
    const content = await fs.readFile(logoPath);

    cachedLogoAttachment = {
      filename: 'arise-logo-login.png',
      content,
      cid: LOGO_CID,
      contentType: 'image/png'
    };

    return cachedLogoAttachment;
  } catch {
    cachedLogoAttachment = null;
    return null;
  }
};

const normalizeFrontendBaseUrl = (value) => {
  const raw = String(value || '').trim();
  if (!raw) return '';
  try {
    const u = new URL(raw);
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return '';
    return u.origin;
  } catch {
    return '';
  }
};

const getFrontendBaseUrl = ({ originBaseUrl } = {}) => {
  const envUrl = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim();
  const normalizedEnv = normalizeFrontendBaseUrl(envUrl);
  if (normalizedEnv) return normalizedEnv;

  const normalizedOrigin = normalizeFrontendBaseUrl(originBaseUrl);
  return normalizedOrigin;
};

const formatLetterDate = (value) => {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    day: '2-digit',
    month: 'long',
    year: 'numeric'
  });
};

const buildPasswordResetEmailHtml = ({ recipientName, resetUrl, logoSrc, date, originBaseUrl }) => {
  const safeRecipient = String(recipientName || 'Sir/Ma\u2019am');
  const safeUrl = String(resetUrl || '');
  const frontendBase = getFrontendBaseUrl({ originBaseUrl });
  const logoUrl = frontendBase ? `${frontendBase}/arise-logo-login.png` : '';
  const effectiveLogoSrc = logoSrc || logoUrl;

  const confidentiality =
    'Confidentiality Notice: This e-mail communication and any attachments may contain confidential and privileged information for the use of the designated recipient(s). If you are not the intended recipient, any review, disclosure, dissemination, distribution, or copying of this message is prohibited. If you have received this communication in error, please notify the sender immediately by replying to this message and delete it from your computer.';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${WEBSITE_COLORS.red};padding:24px 0;margin:0;font-family:'Overused Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,'Noto Sans';">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:20px 22px 12px;">
                <div style="text-align:center;margin:2px 0 12px;">
                  ${effectiveLogoSrc ? `<img src="${escapeHtml(effectiveLogoSrc)}" alt="ARISE" style="max-width:170px;height:auto;display:inline-block;" />` : ''}
                </div>

                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" style="padding:0;">
                      <div style="font-family:'Bebas Neue','Overused Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial;letter-spacing:0.04em;font-size:24px;color:${WEBSITE_COLORS.red};margin:0;">
                        PASSWORD RESET
                      </div>
                    </td>
                    <td align="right" style="padding:0;">
                      <div style="display:inline-block;background:${WEBSITE_COLORS.mustard};color:#ffffff;font-weight:700;font-size:12px;letter-spacing:0.06em;border-radius:999px;padding:6px 10px;">
                        ACTION REQUIRED
                      </div>
                    </td>
                  </tr>
                </table>

                <div style="font-size:12px;color:#6b7280;margin-top:6px;">${escapeHtml(formatLetterDate(date))}</div>

                <div style="height:1px;background:#f3f4f6;margin:14px 0 14px;"></div>

                <p style="margin:0 0 10px;font-size:14px;color:#111827;">Dear <b>${escapeHtml(safeRecipient)}</b>,</p>

                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#111827;">
                  We received a request to reset your HRIS password. Click the button below to set a new password.
                </p>

                <div style="text-align:center;margin:18px 0 18px;">
                  <a href="${escapeHtml(safeUrl)}" style="display:inline-block;background:${WEBSITE_COLORS.red};color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 16px;font-size:14px;">
                    Reset Password
                  </a>
                </div>

                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#374151;">
                  If you did not request this, you can ignore this email.
                </p>

                <div style="height:1px;background:#f3f4f6;margin:14px 0 14px;"></div>

                <p style="margin:0;font-size:14px;color:#111827;">Sincerely,</p>
                <p style="margin:8px 0 0;font-size:14px;font-weight:700;color:#111827;">WDCAP HR Department</p>
                <p style="margin:2px 0 0;font-size:12px;color:#374151;">WDCAP HRIS</p>

              </td>
            </tr>
          </table>

          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;margin-top:14px;">
            <tr>
              <td style="padding:0 6px;font-size:11px;line-height:1.5;color:#fef2f2;opacity:0.9;font-family:'Overused Grotesk',ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,'Noto Sans';">
                <i>${escapeHtml(confidentiality)}</i>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  `.trim();
};

const getAuditFallbackActorUserId = async () => {
  // Use a real Admin/HR user id as a fallback so audit_logs inserts don't fail
  // when user_id has NOT NULL / FK constraints.
  try {
    const { data } = await supabase
      .from('users')
      .select('id, role')
      .in('role', [ROLES.EXECUTIVE, ROLES.HR])
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

// Google Login (Supabase Auth + Google ID token)
// Frontend sends the Google ID token (credential). We exchange it for a Supabase session.
export const googleLogin = async ({ googleToken }) => {
  try {
    const anon = createAnonSupabaseClient();
    if (!anon) {
      throw new InternalServerError('Supabase anon client not configured');
    }

    const { data: authData, error: signInError } = await anon.auth.signInWithIdToken({
      provider: 'google',
      token: googleToken
    });

    if (signInError || !authData?.user || !authData?.session) {
      const rawMessage = String(signInError?.message || '').trim();
      const rawCode = String(signInError?.code || '').trim();
      const diagnostic = [rawCode, rawMessage].filter(Boolean).join(': ');

      // Map common Supabase/GoTrue failures to actionable messages.
      const lowered = `${rawCode} ${rawMessage}`.toLowerCase();
      let userMessage = 'Google authentication failed';
      if (lowered.includes('provider') && lowered.includes('not') && lowered.includes('enabled')) {
        userMessage = 'Google login is not enabled in Supabase. Enable the Google provider in Supabase Auth settings.';
      } else if (lowered.includes('invalid api key') || lowered.includes('apikey')) {
        userMessage = 'Server auth is misconfigured (invalid Supabase anon key). Please check SUPABASE_ANON_KEY on the backend.';
      } else if (lowered.includes('audience') || lowered.includes('aud')) {
        userMessage = 'Google token audience mismatch. Make sure the Google OAuth Client ID in Supabase matches the one used by the frontend.';
      } else if (lowered.includes('token') && lowered.includes('expired')) {
        userMessage = 'Google token expired. Please try again.';
      } else if (rawMessage) {
        // Fall back to upstream message so we don't hide the real error.
        userMessage = rawMessage;
      }

      logger.warn(`Google sign-in token exchange failed${diagnostic ? ` (${diagnostic})` : ''}`);
      throw new UnauthorizedError(userMessage);
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email, role, employee_id')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      // Keep behavior strict: only users created by Admin/HR can log in.
      throw new UnauthorizedError('Account not found. Please contact administrator.');
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

    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', userData.id);

    await supabase.from('audit_logs').insert({
      user_id: userData.id,
      action_type: AUDIT_ACTIONS.LOGIN,
      table_name: 'users',
      record_id: userData.id,
      timestamp: new Date().toISOString()
    });

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
    };
  } catch (error) {
    logger.error('Google login error:', error);
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
      logger.error('Update password failed:', {
        error: updateError,
        errorMessage: updateError?.message,
        errorCode: updateError?.code,
        userId,
        hasUpdatedUser: !!updated?.user
      });
      throw new InternalServerError(`Failed to update password: ${updateError?.message || 'Unknown error'}`);
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
      logger.error('Admin reset password failed:', {
        error: updateError,
        errorMessage: updateError?.message,
        errorCode: updateError?.code,
        userId: userRow.id,
        employeeId
      });
      throw new InternalServerError(`Failed to reset password: ${updateError?.message || 'Unknown error'}`);
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
export const requestPasswordReset = async ({ email, ip = null, userAgent = null, originBaseUrl = '' }) => {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const nowIso = new Date().toISOString();

  const debug = {
    normalizedEmail,
    throttled: false,
    attemptedLinkGeneration: false,
    linkGenerated: false,
    attemptedEmailSend: false,
    emailSent: false,
    emailSkipped: false,
    linkError: null,
    emailError: null
  };

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
    if (cooldownMinutes > 0) {
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
        debug.throttled = true;
        return { success: true };
      }
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

    // Self-service: send a recovery link to the user via SMTP (best-effort).
    // If FRONTEND_URL/CLIENT_URL is NOT configured, Supabase will typically fall back to the project's Site URL.
    try {
      console.log('[PASSWORD RESET] Starting email recovery flow for:', normalizedEmail);

      const frontendBase = getFrontendBaseUrl({ originBaseUrl });
      console.log('[PASSWORD RESET] Frontend base URL:', frontendBase || 'NOT SET');
      const redirectTo = frontendBase ? `${frontendBase}/reset-password` : '';

      const options = redirectTo ? { redirectTo } : undefined;

      debug.attemptedLinkGeneration = true;
      console.log('[PASSWORD RESET] Generating recovery link via Supabase...');
      const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
        type: 'recovery',
        email: normalizedEmail,
        ...(options ? { options } : {})
      });

      console.log('[PASSWORD RESET] Link generation result:', {
        hasLink: !!linkData?.properties?.action_link,
        error: linkError?.message || null
      });

      const actionLink = linkData?.properties?.action_link;
      if (linkError) {
        debug.linkError = linkError.message || String(linkError);
        logger.warn(`Password reset generateLink failed for ${normalizedEmail}: ${linkError.message || linkError}`);
      }

      if (!linkError && !actionLink) {
        debug.linkError = debug.linkError || 'No action_link returned';
        logger.warn(`Password reset generateLink returned no action_link for ${normalizedEmail}`);
      }

      if (!linkError && actionLink) {
        debug.linkGenerated = true;
        let recipientName = normalizedEmail;
        try {
          if (resolvedUserId) {
            const { data: emp } = await supabase
              .from('employees')
              .select('first_name')
              .eq('user_id', resolvedUserId)
              .maybeSingle();
            if (emp?.first_name) recipientName = emp.first_name;
          }
        } catch {
          // ignore
        }

        const logoAttachment = await getEmailLogoAttachment();
        const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;

        const html = buildPasswordResetEmailHtml({
          recipientName,
          resetUrl: actionLink,
          logoSrc,
          date: nowIso,
          originBaseUrl
        });

        debug.attemptedEmailSend = true;
        console.log('[PASSWORD RESET] Calling sendEmail() to:', normalizedEmail);
        const emailResult = await sendEmail({
          to: [normalizedEmail],
          subject: 'WDCAP HRIS — Password Reset',
          text: `We received a request to reset your HRIS password.\n\nReset link: ${actionLink}\n\nIf you did not request this, ignore this email.`,
          html,
          attachments: logoAttachment ? [logoAttachment] : undefined
        });

        console.log('[PASSWORD RESET] Email result:', {
          skipped: emailResult?.skipped,
          error: emailResult?.error,
          messageId: emailResult?.messageId
        });

        if (emailResult?.skipped) {
          debug.emailSkipped = true;
          logger.warn(`Password reset email skipped for ${normalizedEmail} (SMTP not configured)`);
        } else if (emailResult?.error) {
          debug.emailError = emailResult.error;
          logger.warn(`Password reset email send error for ${normalizedEmail}: ${emailResult.error}`);
        } else {
          debug.emailSent = true;
          logger.info(`Password reset email sent to ${normalizedEmail}`);
        }
      }
    } catch (e) {
      debug.linkError = debug.linkError || (e?.message || String(e));
      logger.warn('Failed to generate/send password reset email (continuing):', e?.message || e);
    }

    // Optional email notification to Admin/HR
    const recipients = getResetRequestRecipients();
    if (recipients.length) {
      await sendEmail({
        to: recipients,
        subject: 'WDCAP HRIS — Password Reset Request',
        text: `A password reset request was submitted for: ${normalizedEmail}\n\nTime: ${nowIso}\nIP: ${ip || 'n/a'}\nUser-Agent: ${userAgent || 'n/a'}\n\nAction: User may receive a reset link email (if configured). Admin/HR can reset via the User Accounts panel.`
      });
    }

    return { success: true, debug };
  } catch (error) {
    logger.error('Password reset request error:', error);
    // Never leak details / never fail the request.
    return { success: true, debug };
  }
};

// Completes reset by verifying the recovery access token and setting a new password.
export const resetPasswordWithToken = async ({ access_token, new_password, ip = null, userAgent = null }) => {
  try {
    const token = String(access_token || '').trim();
    if (!token) throw new UnauthorizedError('Invalid or expired reset link');

    const { data: userData, error: userErr } = await supabase.auth.getUser(token);
    if (userErr || !userData?.user?.id) {
      throw new UnauthorizedError('Invalid or expired reset link');
    }

    const userId = userData.user.id;
    const accountEmail = userData.user.email || null;

    const { data: updated, error: updateError } = await supabase.auth.admin.updateUserById(userId, {
      password: new_password
    });

    if (updateError || !updated?.user) {
      logger.error('Reset password with token failed:', {
        error: updateError,
        errorMessage: updateError?.message,
        errorCode: updateError?.code,
        userId,
        accountEmail
      });
      throw new InternalServerError(`Failed to reset password: ${updateError?.message || 'Unknown error'}`);
    }

    try {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: AUDIT_ACTIONS.UPDATE,
        table_name: 'users',
        record_id: userId,
        new_values: {
          password: 'reset_via_email',
          ip: ip || null,
          user_agent: userAgent || null
        },
        timestamp: new Date().toISOString()
      });
    } catch (e) {
      logger.warn('Reset password audit log failed (continuing):', e?.message || e);
    }

    return { success: true, email: accountEmail };
  } catch (error) {
    logger.error('Reset password with token error:', error);
    throw error;
  }
};