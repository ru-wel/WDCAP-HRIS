import { supabase } from "../config/supabase.js";
import { BadRequestError, InternalServerError, NotFoundError } from '../utils/errors.js';
import { AUDIT_ACTIONS, EMPLOYMENT_STATUSES, ROLES } from '../config/constants.js';
import logger from '../utils/logger.js';
import { sendEmail } from './mail.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_LEAVE_TYPES = [
  { leave_type_name: 'Service Incentive Leave', default_credits: 5 },
  { leave_type_name: 'Vacation Leave', default_credits: 5 },
  { leave_type_name: 'Sick Leave', default_credits: 5 },
  { leave_type_name: 'Leave Without Pay', default_credits: 0 }
];

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
    const logoPath = path.resolve(__dirname, '../../../frontend/public/icons/arise-logo-login.png');
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

const formatShortDate = (value) => {
  const iso = toIsoDate(value);
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00+08:00`);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    timeZone: 'Asia/Manila',
    month: 'short',
    day: '2-digit',
    year: 'numeric'
  });
};

const normalizeLeaveStatusLabel = (status) => {
  const s = String(status || '').trim().toUpperCase();
  if (s === 'REJECTED' || s === 'DISAPPROVED' || s === 'DECLINED') return 'DECLINED';
  if (s === 'APPROVED') return 'APPROVED';
  if (s === 'CANCELLED') return 'CANCELLED';
  if (s === 'PENDING') return 'PENDING';
  return s || 'PENDING';
};

const leaveStatusBadge = (status) => {
  const label = normalizeLeaveStatusLabel(status);
  const bg =
    label === 'PENDING'
      ? WEBSITE_COLORS.mustard
      : label === 'APPROVED'
        ? WEBSITE_COLORS.green
        : label === 'CANCELLED'
          ? WEBSITE_COLORS.gray
          : WEBSITE_COLORS.red;
  return { label, bg };
};

const getFrontendBaseUrl = () => {
  const raw = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
};

const leaveStatusEmailCopy = (status) => {
  const s = normalizeLeaveStatusLabel(status);
  if (s === 'PENDING') {
    return 'We have received your leave request and it is currently pending approval.';
  }
  if (s === 'APPROVED') {
    return 'Your leave request has been approved.';
  }
  if (s === 'CANCELLED') {
    return 'Your leave request has been cancelled.';
  }
  if (s === 'DECLINED') {
    return 'Your leave request has been declined.';
  }
  return 'Your leave request has been updated.';
};

const buildLeaveEmailHtml = ({ title, message, details, status, recipientName, date, logoSrc }) => {
  const safeDetails = (details || []).filter((row) => row && row.label);
  const safeRecipient = String(recipientName || 'Sir/Ma’am');
  const dateLine = formatLetterDate(date);
  const safeTitle = String(title || 'Leave Request');

  const { label: statusLabel, bg: statusBg } = leaveStatusBadge(status);
  const frontendBase = getFrontendBaseUrl();
  const logoUrl = frontendBase ? `${frontendBase}/icons/arise-logo-login.png` : '';
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
                        ${escapeHtml(safeTitle)}
                      </div>
                    </td>
                    <td align="right" style="padding:0;">
                      <div style="display:inline-block;background:${statusBg};color:#ffffff;font-weight:700;font-size:12px;letter-spacing:0.06em;border-radius:999px;padding:6px 10px;">
                        ${escapeHtml(statusLabel)}
                      </div>
                    </td>
                  </tr>
                </table>

                ${dateLine ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${escapeHtml(dateLine)}</div>` : ''}

                <div style="height:1px;background:#f3f4f6;margin:14px 0 14px;"></div>

                <p style="margin:0 0 10px;font-size:14px;color:#111827;">Dear <b>${escapeHtml(safeRecipient)}</b>,</p>

                ${message ? `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#111827;">${escapeHtml(message)}</p>` : ''}

                <div style="font-size:14px;line-height:1.7;color:#111827;margin:0 0 10px;">
                  ${safeDetails
                    .map(
                      ({ label, value }) =>
                        `<div style="margin:0 0 8px;"><span style="color:#374151;font-weight:700;">${escapeHtml(label)}:</span> ${escapeHtml(value ?? '—') || '—'}</div>`
                    )
                    .join('')}
                </div>

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

const statusTitle = (status) => {
  const s = String(status || '').trim().toUpperCase();
  const normalized = normalizeLeaveStatusLabel(s);
  if (normalized === 'PENDING') return 'Leave Request';
  if (normalized === 'APPROVED') return 'Leave Request';
  if (normalized === 'CANCELLED') return 'Leave Request';
  if (normalized === 'DECLINED') return 'Leave Request';
  return 'Leave Request';
};

const statusSubject = (status) => {
  const normalized = normalizeLeaveStatusLabel(status);
  const label = normalized.charAt(0) + normalized.slice(1).toLowerCase();
  return `Leave Request — ${label}`;
};

const getFirstName = (fullName) => {
  const s = String(fullName || '').trim();
  if (!s) return '';
  return s.split(/\s+/)[0] || '';
};

const toIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const calcInclusiveDays = (startDateIso, endDateIso) => {
  const s = toIsoDate(startDateIso);
  const e = toIsoDate(endDateIso || startDateIso);
  if (!s) return 0;
  const start = new Date(`${s}T00:00:00Z`);
  const end = new Date(`${e}T00:00:00Z`);
  const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(1, diff + 1);
};

const getYearFromIso = (iso) => {
  const d = toIsoDate(iso);
  if (!d) return new Date().getUTCFullYear();
  return Number(d.slice(0, 4)) || new Date().getUTCFullYear();
};

const ensureAndDeductLeaveBalance = async ({ employeeId, leaveTypeId, year, days, userId }) => {
  if (!employeeId || !leaveTypeId) throw new BadRequestError('Invalid leave balance lookup');
  if (!days || days < 1) throw new BadRequestError('Invalid leave duration');

  const { data: leaveType, error: ltErr } = await supabase
    .from('leave_types')
    .select('leave_type_id, default_credits')
    .eq('leave_type_id', leaveTypeId)
    .single();

  if (ltErr || !leaveType) throw new BadRequestError('Leave type not found');

  let { data: balanceRow, error: balErr } = await supabase
    .from('employee_leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year)
    .maybeSingle();

  if (balErr) throw new InternalServerError(balErr.message);

  const now = new Date().toISOString();

  if (!balanceRow) {
    const starting = Number(leaveType.default_credits ?? 0);
    const { data: created, error: createErr } = await supabase
      .from('employee_leave_balances')
      .insert({
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        year,
        current_balance: starting,
        carried_over: 0,
        created_at: now,
        updated_at: now
      })
      .select('*')
      .single();

    if (createErr) throw new InternalServerError(createErr.message);
    balanceRow = created;
  }

  const current = Number(balanceRow.current_balance ?? 0);
  if (!Number.isFinite(current)) throw new InternalServerError('Invalid leave balance data');

  if (current < days) {
    throw new BadRequestError(`Insufficient leave credits (need ${days}, available ${current})`);
  }

  const nextBalance = current - days;
  const { data: updated, error: updErr } = await supabase
    .from('employee_leave_balances')
    .update({ current_balance: nextBalance, updated_at: now })
    .eq('leave_balance_id', balanceRow.leave_balance_id)
    .select('*')
    .single();

  if (updErr) throw new InternalServerError(updErr.message);

  // audit log (best-effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'employee_leave_balances',
      record_id: String(balanceRow.leave_balance_id),
      old_values: balanceRow,
      new_values: updated,
      timestamp: now
    });
  } catch (e) {
    logger.warn('Leave balance audit log failed:', e);
  }

  return updated;
};

const ensureAndAddLeaveBalance = async ({ employeeId, leaveTypeId, year, days, userId }) => {
  if (!employeeId || !leaveTypeId) throw new BadRequestError('Invalid leave balance lookup');
  if (!days || days < 1) throw new BadRequestError('Invalid leave duration');

  const { data: leaveType, error: ltErr } = await supabase
    .from('leave_types')
    .select('leave_type_id, default_credits')
    .eq('leave_type_id', leaveTypeId)
    .single();

  if (ltErr || !leaveType) throw new BadRequestError('Leave type not found');

  let { data: balanceRow, error: balErr } = await supabase
    .from('employee_leave_balances')
    .select('*')
    .eq('employee_id', employeeId)
    .eq('leave_type_id', leaveTypeId)
    .eq('year', year)
    .maybeSingle();

  if (balErr) throw new InternalServerError(balErr.message);

  const now = new Date().toISOString();

  if (!balanceRow) {
    const starting = Number(leaveType.default_credits ?? 0);
    const { data: created, error: createErr } = await supabase
      .from('employee_leave_balances')
      .insert({
        employee_id: employeeId,
        leave_type_id: leaveTypeId,
        year,
        current_balance: starting,
        carried_over: 0,
        created_at: now,
        updated_at: now
      })
      .select('*')
      .single();

    if (createErr) throw new InternalServerError(createErr.message);
    balanceRow = created;
  }

  const current = Number(balanceRow.current_balance ?? 0);
  if (!Number.isFinite(current)) throw new InternalServerError('Invalid leave balance data');

  const nextBalance = current + days;
  const { data: updated, error: updErr } = await supabase
    .from('employee_leave_balances')
    .update({ current_balance: nextBalance, updated_at: now })
    .eq('leave_balance_id', balanceRow.leave_balance_id)
    .select('*')
    .single();

  if (updErr) throw new InternalServerError(updErr.message);

  // audit log (best-effort)
  try {
    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'employee_leave_balances',
      record_id: String(balanceRow.leave_balance_id),
      old_values: balanceRow,
      new_values: updated,
      timestamp: now
    });
  } catch (e) {
    logger.warn('Leave balance audit log failed:', e);
  }

  return updated;
};

const LEAVE_REQUEST_FIELDS = `
  leave_request_id,
  employee_id,
  leave_type_id,
  start_date,
  end_date,
  status,
  reason,
  approved_by,
  approved_date,
  created_at,
  updated_at,
  employees (employee_id, first_name, last_name, positions (position_title)),
  leave_types (leave_type_id, leave_type_name, default_credits)
`;

const LEAVE_TYPE_FIELDS = `leave_type_id, leave_type_name, default_credits, created_at, updated_at`;

const normalizeStatus = (value) => {
  if (!value) return null;
  return String(value).trim().toUpperCase();
};

const formatEmployeeName = (employee) => {
  if (!employee) return '';
  const first = employee.first_name || '';
  const last = employee.last_name || '';
  return `${first} ${last}`.trim();
};

const toUiLeaveRow = (r) => {
  const emp = r.employees || null;
  const pos = emp?.positions?.position_title || '';
  const type = r.leave_types?.leave_type_name || '';

  return {
    leave_request_id: r.leave_request_id,
    employee_id: r.employee_id,
    employee_code: emp?.employee_id || r.employee_id,
    employee_name: formatEmployeeName(emp),
    position_title: pos,
    leave_type_id: r.leave_type_id,
    leave_type_name: type,
    start_date: r.start_date,
    end_date: r.end_date,
    status: r.status,
    reason: r.reason,
    approved_by: r.approved_by,
    approved_date: r.approved_date,
    created_at: r.created_at,
    updated_at: r.updated_at
  };
};

const getLatestLeaveRequestUpdaters = async (leaveRequestIds) => {
  const ids = (leaveRequestIds || []).map((id) => String(id)).filter(Boolean);
  if (!ids.length) return new Map();

  const { data, error } = await supabase
    .from('audit_logs')
    .select(`
      record_id,
      timestamp,
      users (
        email,
        role
      )
    `)
    .eq('table_name', 'leave_requests')
    .eq('action_type', AUDIT_ACTIONS.UPDATE)
    .in('record_id', ids)
    .order('timestamp', { ascending: false });

  if (error) throw new InternalServerError(error.message);

  const map = new Map();
  for (const row of data || []) {
    const key = String(row.record_id || '').trim();
    if (!key || map.has(key)) continue;
    map.set(key, {
      email: row.users?.email || '',
      role: row.users?.role || '',
      timestamp: row.timestamp || null
    });
  }

  return map;
};

export const getLeaveTypes = async () => {
  try {
    let { data, error } = await supabase
      .from('leave_types')
      .select(LEAVE_TYPE_FIELDS)
      .order('leave_type_name', { ascending: true });

    if (error) throw new InternalServerError(error.message);

    // If there are no leave types yet, seed a minimal default set.
    if (!data || data.length === 0) {
      const now = new Date().toISOString();

      try {
        await supabase
          .from('leave_types')
          .insert(
            DEFAULT_LEAVE_TYPES.map((t) => ({
              leave_type_name: t.leave_type_name,
              default_credits: t.default_credits,
              created_at: now,
              updated_at: now
            }))
          );
      } catch (e) {
        logger.warn('Leave types seed failed (continuing):', e);
      }

      ({ data, error } = await supabase
        .from('leave_types')
        .select(LEAVE_TYPE_FIELDS)
        .order('leave_type_name', { ascending: true }));

      if (error) throw new InternalServerError(error.message);
    }

    return data || [];
  } catch (error) {
    logger.error('Error fetching leave types:', error);
    throw error;
  }
};

export const listLeaveRequests = async ({ status, employee_id } = {}) => {
  try {
    let query = supabase
      .from('leave_requests')
      .select(LEAVE_REQUEST_FIELDS)
      .order('created_at', { ascending: false });

    const normalizedStatus = normalizeStatus(status);
    if (normalizedStatus) {
      query = query.eq('status', normalizedStatus);
    }

    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    }

    const { data, error } = await query;
    if (error) throw new InternalServerError(error.message);

    return (data || []).map(toUiLeaveRow);
  } catch (error) {
    logger.error('Error fetching leave requests:', error);
    throw error;
  }
};

export const createLeaveRequest = async (payload, user) => {
  try {
    if (!payload?.employee_id) throw new BadRequestError('Employee id is required');

    const timestamp = new Date().toISOString();
    const insertPayload = {
      employee_id: payload.employee_id,
      leave_type_id: payload.leave_type_id,
      start_date: payload.start_date,
      end_date: payload.end_date,
      status: 'PENDING',
      reason: payload.reason,
      approved_by: null,
      approved_date: null,
      created_at: timestamp,
      updated_at: timestamp
    };

    const { data: created, error } = await supabase
      .from('leave_requests')
      .insert(insertPayload)
      .select(LEAVE_REQUEST_FIELDS)
      .single();

    if (error) throw new InternalServerError(error.message);

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'leave_requests',
      record_id: String(created.leave_request_id),
      new_values: created,
      timestamp
    });

    logger.info(`Leave request created: ${created.leave_request_id} by user ${user.email}`);

    // Email notification (best-effort)
    try {
      const override = String(process.env.LEAVE_NOTIFICATION_EMAILS || '').trim();
      const overrideList = override
        ? override.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      let to = overrideList;
      if (!to.length) {
        const { data: recipients } = await supabase
          .from('users')
          .select('email, role')
          .in('role', [ROLES.ADMIN, ROLES.HR]);
        to = (recipients || []).map((r) => r.email).filter(Boolean);
      }

      const body = toUiLeaveRow(created);

      const effectiveDate = new Date().toISOString();

      const logoAttachment = await getEmailLogoAttachment();
      const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;

      const html = buildLeaveEmailHtml({
        title: statusTitle(body.status),
        message: 'A new leave request has been submitted for your review.',
        recipientName: 'HR Team',
        date: effectiveDate,
        logoSrc,
        details: [
          { label: 'Employee', value: body.employee_name },
          { label: 'Type', value: body.leave_type_name },
          { label: 'Dates', value: `${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}` },
          { label: 'Reason', value: body.reason || '—' }
        ],
        status: body.status
      });

      const adminSendResult = await sendEmail({
        to,
        subject: statusSubject(body.status),
        text: [
          'A new leave request was submitted.',
          '',
          `Employee: ${body.employee_name}`,
          `Type: ${body.leave_type_name}`,
          `Dates: ${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}`,
          `Reason: ${body.reason || ''}`,
          `Status: ${normalizeLeaveStatusLabel(body.status)}`
        ].join('\n'),
        html,
        attachments: logoAttachment ? [logoAttachment] : undefined
      });

      if (adminSendResult?.skipped) {
        logger.warn('Leave create email notification skipped (SMTP not configured or no recipients).');
      } else if (adminSendResult?.error) {
        logger.warn(`Leave create email notification returned error: ${adminSendResult.error}`);
      }

      // Confirmation email to the employee who filed the request.
      // (Previously we only emailed HR/Admin; employees often expect an acknowledgement.)
      const employeeEmail = String(user?.email || '').trim();
      if (employeeEmail) {
        const employeeHtml = buildLeaveEmailHtml({
          title: statusTitle(body.status),
          message: leaveStatusEmailCopy(body.status),
          recipientName: getFirstName(body.employee_name) || body.employee_name,
          date: effectiveDate,
          logoSrc,
          details: [
            { label: 'Employee', value: body.employee_name },
            { label: 'Type', value: body.leave_type_name },
            { label: 'Dates', value: `${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}` },
            { label: 'Reason', value: body.reason || '—' }
          ],
          status: body.status
        });

        const employeeSendResult = await sendEmail({
          to: [employeeEmail],
          subject: statusSubject(body.status),
          text: [
            leaveStatusEmailCopy(body.status),
            '',
            `Employee: ${body.employee_name}`,
            `Type: ${body.leave_type_name}`,
            `Dates: ${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}`,
            `Reason: ${body.reason || ''}`,
            `Status: ${normalizeLeaveStatusLabel(body.status)}`
          ].join('\n'),
          html: employeeHtml,
          attachments: logoAttachment ? [logoAttachment] : undefined
        });

        if (employeeSendResult?.skipped) {
          logger.warn('Leave employee confirmation email skipped (SMTP not configured).');
        } else if (employeeSendResult?.error) {
          logger.warn(`Leave employee confirmation email returned error: ${employeeSendResult.error}`);
        }
      }
    } catch (mailErr) {
      logger.warn('Leave create email notification failed:', mailErr);
    }

    return toUiLeaveRow(created);
  } catch (error) {
    logger.error('Error creating leave request:', error);
    throw error;
  }
};

export const updateLeaveRequestStatus = async (leaveRequestId, { status, reason }, user) => {
  try {
    const normalizedStatus = normalizeStatus(status);
    if (!normalizedStatus) throw new BadRequestError('Status is required');

    const { data: existing, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('leave_request_id', leaveRequestId)
      .single();

    if (fetchError || !existing) throw new NotFoundError('Leave request not found');

    if (user.role === ROLES.EMPLOYEE) {
      throw new BadRequestError('Employees cannot update leave request status');
    }

    // If reverting an approved request, restore credits.
    if (
      String(existing.status || '').toUpperCase() === 'APPROVED' &&
      normalizedStatus !== 'APPROVED'
    ) {
      const days = calcInclusiveDays(existing.start_date, existing.end_date);
      const year = getYearFromIso(existing.start_date);
      await ensureAndAddLeaveBalance({
        employeeId: existing.employee_id,
        leaveTypeId: existing.leave_type_id,
        year,
        days,
        userId: user.id
      });
    }

    // If approving for the first time, deduct leave credits first (so we can block approval if insufficient).
    // Note: This assumes simple inclusive day-counting; adjust if you later add half-days/weekends/holidays.
    if (normalizedStatus === 'APPROVED' && String(existing.status || '').toUpperCase() !== 'APPROVED') {
      const days = calcInclusiveDays(existing.start_date, existing.end_date);
      const year = getYearFromIso(existing.start_date);
      await ensureAndDeductLeaveBalance({
        employeeId: existing.employee_id,
        leaveTypeId: existing.leave_type_id,
        year,
        days,
        userId: user.id
      });
    }

    const timestamp = new Date().toISOString();
    const updatePayload = {
      status: normalizedStatus,
      updated_at: timestamp,
      approved_by: normalizedStatus === 'APPROVED' ? user.id : existing.approved_by,
      approved_date: normalizedStatus === 'APPROVED' ? timestamp : existing.approved_date
    };

    if (typeof reason !== 'undefined') {
      updatePayload.reason = reason || null;
    }

    const { data: updated, error: updateError } = await supabase
      .from('leave_requests')
      .update(updatePayload)
      .eq('leave_request_id', leaveRequestId)
      .select(LEAVE_REQUEST_FIELDS)
      .single();

    if (updateError) throw new InternalServerError(updateError.message);

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'leave_requests',
      record_id: String(leaveRequestId),
      old_values: existing,
      new_values: updated,
      timestamp
    });

    logger.info(`Leave request status updated: ${leaveRequestId} => ${normalizedStatus} by ${user.email}`);

    // Email notification to employee (best-effort)
    try {
      const { data: employeeUser } = await supabase
        .from('users')
        .select('email')
        .eq('employee_id', existing.employee_id)
        .single();

      const to = employeeUser?.email ? [employeeUser.email] : [];
      const body = toUiLeaveRow(updated);

      const remarks = typeof reason === 'string' ? reason.trim() : '';
      const effectiveDate = new Date().toISOString();

      const logoAttachment = await getEmailLogoAttachment();
      const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;

      const html = buildLeaveEmailHtml({
        title: statusTitle(body.status),
        message: leaveStatusEmailCopy(body.status),
        recipientName: getFirstName(body.employee_name) || body.employee_name,
        date: effectiveDate,
        logoSrc,
        details: [
          { label: 'Employee', value: body.employee_name },
          { label: 'Type', value: body.leave_type_name },
          { label: 'Dates', value: `${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}` },
          ...(remarks ? [{ label: 'Remarks', value: remarks }] : [])
        ],
        status: body.status
      });

      await sendEmail({
        to,
        subject: statusSubject(body.status),
        text: [
          leaveStatusEmailCopy(body.status),
          '',
          `Employee: ${body.employee_name}`,
          `Type: ${body.leave_type_name}`,
          `Dates: ${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}`,
          `Status: ${normalizeLeaveStatusLabel(body.status)}`,
          reason ? `Remarks: ${reason}` : null
        ].filter(Boolean).join('\n'),
        html,
        attachments: logoAttachment ? [logoAttachment] : undefined
      });
    } catch (mailErr) {
      logger.warn('Leave status email notification failed:', mailErr);
    }

    return toUiLeaveRow(updated);
  } catch (error) {
    logger.error(`Error updating leave request ${leaveRequestId}:`, error);
    throw error;
  }
};

export const cancelLeaveRequest = async (leaveRequestId, user) => {
  try {
    if (!leaveRequestId) throw new BadRequestError('Leave request id is required');
    if (!user?.employee_id) throw new BadRequestError('You do not have an associated employee profile');

    const { data: existing, error: fetchError } = await supabase
      .from('leave_requests')
      .select('*')
      .eq('leave_request_id', leaveRequestId)
      .single();

    if (fetchError || !existing) throw new NotFoundError('Leave request not found');

    // Only the owning employee can cancel their own request.
    if (String(existing.employee_id) !== String(user.employee_id)) {
      throw new BadRequestError('You can only cancel your own leave request');
    }

    if (String(existing.status || '').toUpperCase() !== 'PENDING') {
      throw new BadRequestError('Only pending leave requests can be cancelled');
    }

    const timestamp = new Date().toISOString();
    const updatePayload = {
      status: 'CANCELLED',
      updated_at: timestamp
    };

    const { data: updated, error: updateError } = await supabase
      .from('leave_requests')
      .update(updatePayload)
      .eq('leave_request_id', leaveRequestId)
      .select(LEAVE_REQUEST_FIELDS)
      .single();

    if (updateError) throw new InternalServerError(updateError.message);

    // audit log
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'leave_requests',
      record_id: String(leaveRequestId),
      old_values: existing,
      new_values: updated,
      timestamp
    });

    // Email notifications (best-effort)
    try {
      const body = toUiLeaveRow(updated);
      const effectiveDate = new Date().toISOString();

      const override = String(process.env.LEAVE_NOTIFICATION_EMAILS || '').trim();
      const overrideList = override
        ? override.split(',').map((s) => s.trim()).filter(Boolean)
        : [];

      // Notify HR/Admin
      let toHr = overrideList;
      if (!toHr.length) {
        const { data: recipients } = await supabase
          .from('users')
          .select('email, role')
          .in('role', [ROLES.ADMIN, ROLES.HR]);
        toHr = (recipients || []).map((r) => r.email).filter(Boolean);
      }

      if (toHr.length) {
        const logoAttachment = await getEmailLogoAttachment();
        const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;

        const htmlHr = buildLeaveEmailHtml({
          title: statusTitle(body.status),
          message: 'A leave request has been cancelled.',
          recipientName: 'HR Team',
          date: effectiveDate,
          logoSrc,
          details: [
            { label: 'Employee', value: body.employee_name },
            { label: 'Type', value: body.leave_type_name },
            { label: 'Dates', value: `${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}` },
            { label: 'Reason', value: body.reason || '—' }
          ],
          status: body.status
        });

        await sendEmail({
          to: toHr,
          subject: statusSubject(body.status),
          text: [
            'A leave request has been cancelled.',
            '',
            `Employee: ${body.employee_name}`,
            `Type: ${body.leave_type_name}`,
            `Dates: ${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}`,
            `Reason: ${body.reason || ''}`,
            `Status: ${normalizeLeaveStatusLabel(body.status)}`
          ].join('\n'),
          html: htmlHr,
          attachments: logoAttachment ? [logoAttachment] : undefined
        });
      }

      // Notify employee (confirmation)
      const { data: employeeUser } = await supabase
        .from('users')
        .select('email')
        .eq('employee_id', existing.employee_id)
        .single();

      const toEmployee = employeeUser?.email ? [employeeUser.email] : [];
      if (toEmployee.length) {
        const logoAttachment = await getEmailLogoAttachment();
        const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;

        const htmlEmp = buildLeaveEmailHtml({
          title: statusTitle(body.status),
          message: leaveStatusEmailCopy(body.status),
          recipientName: getFirstName(body.employee_name) || body.employee_name,
          date: effectiveDate,
          logoSrc,
          details: [
            { label: 'Employee', value: body.employee_name },
            { label: 'Type', value: body.leave_type_name },
            { label: 'Dates', value: `${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}` }
          ],
          status: body.status
        });

        await sendEmail({
          to: toEmployee,
          subject: statusSubject(body.status),
          text: [
            leaveStatusEmailCopy(body.status),
            '',
            `Employee: ${body.employee_name}`,
            `Type: ${body.leave_type_name}`,
            `Dates: ${formatShortDate(body.start_date)} to ${formatShortDate(body.end_date)}`,
            `Status: ${normalizeLeaveStatusLabel(body.status)}`
          ].join('\n'),
          html: htmlEmp,
          attachments: logoAttachment ? [logoAttachment] : undefined
        });
      }
    } catch (mailErr) {
      logger.warn('Leave cancel email notification failed:', mailErr);
    }

    return toUiLeaveRow(updated);
  } catch (error) {
    logger.error(`Error cancelling leave request ${leaveRequestId}:`, error);
    throw error;
  }
};

export const listLeaveHistory = async ({ employee_id } = {}) => {
  try {
    // For admin/HR views, hide inactive employees.
    let activeEmployeeIds = null;
    if (!employee_id) {
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('employee_id, employment_status')
        .neq('employment_status', EMPLOYMENT_STATUSES.INACTIVE);

      if (empErr) throw new InternalServerError(empErr.message);
      activeEmployeeIds = (employees || []).map((e) => e.employee_id).filter(Boolean);
      if (!activeEmployeeIds.length) return [];
    }

    let query = supabase
      .from('leave_requests')
      .select(LEAVE_REQUEST_FIELDS)
      .neq('status', 'PENDING')
      .order('updated_at', { ascending: false });

    if (employee_id) {
      query = query.eq('employee_id', employee_id);
    } else if (activeEmployeeIds) {
      query = query.in('employee_id', activeEmployeeIds);
    }

    const { data, error } = await query;
    if (error) throw new InternalServerError(error.message);

    const baseRows = (data || []).map(toUiLeaveRow);
    const updaterMap = await getLatestLeaveRequestUpdaters(baseRows.map((r) => r.leave_request_id));

    return baseRows.map((r) => {
      const info = updaterMap.get(String(r.leave_request_id));
      return {
        ...r,
        updated_by_email: info?.email || '',
        updated_by_role: info?.role || '',
        updated_by_timestamp: info?.timestamp || null
      };
    });
  } catch (error) {
    logger.error('Error fetching leave history:', error);
    throw error;
  }
};

export const listLeaveCredits = async ({ year, employee_id } = {}) => {
  try {
    const effectiveYear = year || new Date().getUTCFullYear();

    // For admin/HR views, hide inactive employees.
    let activeEmployeeIds = null;
    if (!employee_id) {
      const { data: employees, error: empErr } = await supabase
        .from('employees')
        .select('employee_id, employment_status')
        .neq('employment_status', EMPLOYMENT_STATUSES.INACTIVE);

      if (empErr) throw new InternalServerError(empErr.message);
      activeEmployeeIds = (employees || []).map((e) => e.employee_id).filter(Boolean);
      if (!activeEmployeeIds.length) return [];
    }

    // Ensure there is a balance row per leave type for the effective year.
    // - For employee self-service: seed missing rows for that employee.
    // - For admin/HR: seed missing rows for ALL employees (so all employees appear in the credits list).
    if (employee_id) {
      const types = await getLeaveTypes();

      if (types.length) {
        const { data: existing, error: existingErr } = await supabase
          .from('employee_leave_balances')
          .select('leave_type_id')
          .eq('employee_id', employee_id)
          .eq('year', effectiveYear);

        if (existingErr) throw new InternalServerError(existingErr.message);

        const existingTypeIds = new Set((existing || []).map((r) => r.leave_type_id));
        const now = new Date().toISOString();

        const missing = types
          .filter((t) => !existingTypeIds.has(t.leave_type_id))
          .map((t) => ({
            employee_id,
            leave_type_id: t.leave_type_id,
            year: effectiveYear,
            current_balance: Number(t.default_credits ?? 0),
            carried_over: 0,
            created_at: now,
            updated_at: now
          }));

        if (missing.length) {
          const { error: insErr } = await supabase
            .from('employee_leave_balances')
            .insert(missing);
          if (insErr) throw new InternalServerError(insErr.message);
        }
      }
    }

    if (!employee_id) {
      const types = await getLeaveTypes();
      if (types.length) {
        const employeeIds = (activeEmployeeIds || []).filter(Boolean);
        if (employeeIds.length) {
          const { data: existing, error: existingErr } = await supabase
            .from('employee_leave_balances')
            .select('employee_id, leave_type_id')
            .eq('year', effectiveYear)
            .in('employee_id', employeeIds);

          if (existingErr) throw new InternalServerError(existingErr.message);

          const existingKeys = new Set((existing || []).map((r) => `${r.employee_id}:${r.leave_type_id}`));
          const now = new Date().toISOString();

          const missing = [];
          for (const employeeId of employeeIds) {
            for (const t of types) {
              const key = `${employeeId}:${t.leave_type_id}`;
              if (existingKeys.has(key)) continue;
              missing.push({
                employee_id: employeeId,
                leave_type_id: t.leave_type_id,
                year: effectiveYear,
                current_balance: Number(t.default_credits ?? 0),
                carried_over: 0,
                created_at: now,
                updated_at: now
              });
            }
          }

          if (missing.length) {
            const chunkSize = 500;
            for (let i = 0; i < missing.length; i += chunkSize) {
              const chunk = missing.slice(i, i + chunkSize);
              const { error: insErr } = await supabase
                .from('employee_leave_balances')
                .insert(chunk);
              if (insErr) throw new InternalServerError(insErr.message);
            }
          }
        }
      }
    }

    let query = supabase
      .from('employee_leave_balances')
      .select(`
        leave_balance_id,
        employee_id,
        leave_type_id,
        year,
        current_balance,
        carried_over,
        created_at,
        updated_at,
        employees (employee_id, first_name, last_name),
        leave_types (leave_type_id, leave_type_name, default_credits)
      `)
      .order('year', { ascending: false });

    // Employee self-service defaults to current year if no year is specified.
    if (employee_id) query = query.eq('year', effectiveYear);
    else if (year) query = query.eq('year', year);
    if (employee_id) query = query.eq('employee_id', employee_id);
    else if (activeEmployeeIds) query = query.in('employee_id', activeEmployeeIds);

    const { data, error } = await query;
    if (error) throw new InternalServerError(error.message);

    const rows = data || [];

    return rows.map((r) => ({
      leave_balance_id: r.leave_balance_id,
      employee_id: r.employee_id,
      employee_code: r.employees?.employee_id || r.employee_id,
      employee_name: formatEmployeeName(r.employees),
      leave_type_id: r.leave_type_id,
      leave_type_name: r.leave_types?.leave_type_name || '',
      default_credits: r.leave_types?.default_credits ?? null,
      year: r.year,
      current_balance: r.current_balance,
      carried_over: r.carried_over,
      used_leave: (() => {
        const base = Number(r.leave_types?.default_credits ?? 0);
        const carried = Number(r.carried_over ?? 0);
        const balance = Number(r.current_balance ?? 0);
        const used = base + carried - balance;
        return Number.isFinite(used) ? used : null;
      })(),
      created_at: r.created_at,
      updated_at: r.updated_at
    }));
  } catch (error) {
    logger.error('Error fetching leave credits:', error);
    throw error;
  }
};

export const updateLeaveCreditBalance = async (leaveBalanceId, { current_balance, carried_over }, user) => {
  try {
    if (!leaveBalanceId) throw new BadRequestError('Leave balance id is required');
    if (!user?.id) throw new BadRequestError('User is required');

    const nextBalance = Number(current_balance);
    if (!Number.isFinite(nextBalance) || nextBalance < 0) {
      throw new BadRequestError('Current balance must be a non-negative number');
    }

    let nextCarried = null;
    if (carried_over !== undefined) {
      nextCarried = Number(carried_over);
      if (!Number.isFinite(nextCarried) || nextCarried < 0) {
        throw new BadRequestError('Carried over must be a non-negative number');
      }
    }

    const { data: existing, error: fetchErr } = await supabase
      .from('employee_leave_balances')
      .select('*')
      .eq('leave_balance_id', leaveBalanceId)
      .single();

    if (fetchErr || !existing) throw new NotFoundError('Leave balance not found');

    const now = new Date().toISOString();
    const updatePayload = {
      current_balance: nextBalance,
      updated_at: now
    };
    if (nextCarried !== null) updatePayload.carried_over = nextCarried;

    const { data: updated, error: updErr } = await supabase
      .from('employee_leave_balances')
      .update(updatePayload)
      .eq('leave_balance_id', leaveBalanceId)
      .select('*')
      .single();

    if (updErr) throw new InternalServerError(updErr.message);

    // audit log (best-effort)
    try {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: AUDIT_ACTIONS.UPDATE,
        table_name: 'employee_leave_balances',
        record_id: String(leaveBalanceId),
        old_values: existing,
        new_values: updated,
        timestamp: now
      });
    } catch (e) {
      logger.warn('Leave credit update audit log failed:', e);
    }

    return updated;
  } catch (error) {
    logger.error(`Error updating leave balance ${leaveBalanceId}:`, error);
    throw error;
  }
};
