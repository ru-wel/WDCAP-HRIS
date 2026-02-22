import { supabase } from '../config/supabase.js';
import { BadRequestError, InternalServerError, NotFoundError } from '../utils/errors.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import logger from '../utils/logger.js';
import { sendEmail } from './mail.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const EVALUATION_FIELDS = `
  evaluation_id,
  employee_id,
  template_id,
  evaluation_type,
  evaluation_date,
  evaluation_notes,
  evaluation_document_path,
  created_at,
  updated_at,
  employees (id, employee_id, first_name, last_name, personnel_type, positions (position_title)),
  evaluation_templates (id, name)
`;

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

const getFrontendBaseUrl = () => {
  const raw = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
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

const toIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
};

const toUtcIsoDate = (dt) => {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
};

const parseIsoDateUtc = (iso) => {
  const s = String(iso || '').slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  return new Date(`${s}T00:00:00Z`);
};

const addMonthsUtcClamped = (dt, months) => {
  if (!(dt instanceof Date) || Number.isNaN(dt.getTime())) return null;
  const baseY = dt.getUTCFullYear();
  const baseM = dt.getUTCMonth();
  const baseD = dt.getUTCDate();

  const targetMonthStart = new Date(Date.UTC(baseY, baseM + Number(months || 0), 1));
  const y = targetMonthStart.getUTCFullYear();
  const m = targetMonthStart.getUTCMonth();
  const maxDay = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();
  const d = Math.min(baseD, maxDay);
  return new Date(Date.UTC(y, m, d));
};

const hasScoreOrRemarks = (notes) => {
  const s = String(notes || '').trim();
  if (!s) return false;
  return /^\s*(score|remarks)\s*:/im.test(s);
};

const isEmptyDoc = (docPath) => {
  if (docPath === null || typeof docPath === 'undefined') return true;
  if (typeof docPath === 'object') return Object.keys(docPath || {}).length === 0;
  return String(docPath).trim().length === 0;
};

const buildQuarterRangeUtc = ({ year, quarter }) => {
  const y = Number(year);
  const q = Number(quarter);
  const startMonth = (q - 1) * 3;
  const start = new Date(Date.UTC(y, startMonth, 1));
  const end = new Date(Date.UTC(y, startMonth + 3, 0));
  return { startIso: toUtcIsoDate(start), endIso: toUtcIsoDate(end) };
};

const formatEmployeeName = (employee) => {
  if (!employee) return '';
  const first = employee.first_name || '';
  const last = employee.last_name || '';
  return `${first} ${last}`.trim();
};

const safeJsonParse = (value) => {
  if (!value) return null;
  const s = String(value);
  if (!s.trim().startsWith('{')) return null;
  try {
    return JSON.parse(s);
  } catch {
    return null;
  }
};

const buildEvaluationEmailHtml = ({ title, message, recipientName, details, statusPill, logoSrc, date }) => {
  const safeDetails = (details || []).filter((d) => d && d.label);
  const safeRecipient = String(recipientName || 'Sir/Ma’am');
  const dateLine = formatLetterDate(date);
  const safeTitle = String(title || 'Evaluation');

  const pillBg = statusPill?.bg || WEBSITE_COLORS.mustard;
  const pillLabel = statusPill?.label || 'NOTICE';

  const frontendBase = getFrontendBaseUrl();
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
                        ${escapeHtml(safeTitle)}
                      </div>
                    </td>
                    <td align="right" style="padding:0;">
                      <div style="display:inline-block;background:${pillBg};color:#ffffff;font-weight:700;font-size:12px;letter-spacing:0.06em;border-radius:999px;padding:6px 10px;">
                        ${escapeHtml(pillLabel)}
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
                    .map(({ label, value }) => `<div style="margin:0 0 8px;"><span style="color:#374151;font-weight:700;">${escapeHtml(label)}:</span> ${escapeHtml(value ?? '—') || '—'}</div>`)
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

const getEmployeeRecipientEmail = async (employee) => {
  const userId = employee?.user_id;
  if (userId) {
    try {
      const { data } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .maybeSingle();
      if (data?.email) return data.email;
    } catch {
      // fall through
    }
  }

  const employeeCode = employee?.employee_id;
  if (!employeeCode) return '';

  try {
    const { data } = await supabase
      .from('users')
      .select('email')
      .eq('employee_id', employeeCode)
      .maybeSingle();
    return data?.email || '';
  } catch {
    return '';
  }
};

export const listEvaluations = async ({ employee_id, from, to } = {}) => {
  try {
    let query = supabase
      .from('performance_evaluations')
      .select(EVALUATION_FIELDS)
      .order('evaluation_date', { ascending: true })
      .order('created_at', { ascending: false });

    if (employee_id) query = query.eq('employee_id', employee_id);

    const fromIso = toIsoDate(from);
    const toIso = toIsoDate(to);
    if (fromIso) query = query.gte('evaluation_date', fromIso);
    if (toIso) query = query.lte('evaluation_date', toIso);

    const { data, error } = await query;
    if (error) throw new InternalServerError(error.message);

    const rows = Array.isArray(data) ? data : [];

    // Defensive de-dupe: some schemas/joins can yield duplicate evaluation rows.
    // Keep the first occurrence per evaluation_id.
    const byId = new Map();
    for (const r of rows) {
      const key = String(r?.evaluation_id ?? '');
      if (!key) continue;
      if (!byId.has(key)) byId.set(key, r);
    }

    return Array.from(byId.values()).map((r) => ({
      ...r,
      employee_name: formatEmployeeName(r.employees),
      employee_code: r.employees?.employee_id || null,
      position_title: r.employees?.positions?.position_title || null,
      personnel_type: r.employees?.personnel_type || null
    }));
  } catch (e) {
    logger.error('Error listing evaluations:', e);
    throw e;
  }
};

export const getEvaluationById = async (evaluationId) => {
  const { data, error } = await supabase
    .from('performance_evaluations')
    .select(EVALUATION_FIELDS)
    .eq('evaluation_id', evaluationId)
    .maybeSingle();

  if (error) throw new InternalServerError(error.message);
  if (!data) throw new NotFoundError('Evaluation not found');

  return {
    ...data,
    employee_name: formatEmployeeName(data.employees),
    employee_code: data.employees?.employee_id || null,
    position_title: data.employees?.positions?.position_title || null,
    personnel_type: data.employees?.personnel_type || null
  };
};

export const createSchedule = async (payload, user) => {
  if (!payload?.employee_id) throw new BadRequestError('Employee is required');
  if (!payload?.evaluation_type) throw new BadRequestError('Evaluation type is required');
  if (!payload?.evaluation_date) throw new BadRequestError('Evaluation date is required');

  const now = new Date().toISOString();

  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, user_id, employee_id, first_name, last_name')
    .eq('id', payload.employee_id)
    .single();

  if (empErr || !employee) throw new NotFoundError('Employee not found');

  const insertPayload = {
    employee_id: payload.employee_id,
    evaluation_type: payload.evaluation_type,
    evaluation_date: toIsoDate(payload.evaluation_date),
    evaluation_notes: payload.evaluation_notes || null,
    evaluation_document_path: null,
    created_at: now,
    updated_at: now
  };

  const { data: created, error } = await supabase
    .from('performance_evaluations')
    .insert(insertPayload)
    .select(EVALUATION_FIELDS)
    .single();

  if (error) throw new InternalServerError(error.message);

  // audit log
  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: AUDIT_ACTIONS.CREATE,
      table_name: 'performance_evaluations',
      record_id: String(created.evaluation_id),
      new_values: created,
      timestamp: now
    });
  } catch (e) {
    logger.warn('Evaluation audit log failed:', e?.message || e);
  }

  return {
    ...created,
    employee_name: formatEmployeeName(created.employees),
    employee_code: created.employees?.employee_id || null,
    position_title: created.employees?.positions?.position_title || null,
    personnel_type: created.employees?.personnel_type || null
  };
};

export const ensureSchedule = async (payload, user) => {
  if (!payload?.employee_id) throw new BadRequestError('Employee is required');
  if (!payload?.evaluation_type) throw new BadRequestError('Evaluation type is required');
  if (!payload?.evaluation_date) throw new BadRequestError('Evaluation date is required');

  const now = new Date().toISOString();
  const evalDate = toIsoDate(payload.evaluation_date);

  // If a schedule already exists for this employee/type/date, reuse it.
  const { data: existing, error: existingErr } = await supabase
    .from('performance_evaluations')
    .select(EVALUATION_FIELDS)
    .eq('employee_id', payload.employee_id)
    .eq('evaluation_type', payload.evaluation_type)
    .eq('evaluation_date', evalDate)
    .maybeSingle();

  if (existingErr) throw new InternalServerError(existingErr.message);
  if (existing) {
    return {
      ...existing,
      employee_name: formatEmployeeName(existing.employees),
      employee_code: existing.employees?.employee_id || null,
      position_title: existing.employees?.positions?.position_title || null,
      personnel_type: existing.employees?.personnel_type || null,
      alreadyExists: true
    };
  }

  // Ensure employee exists.
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id')
    .eq('id', payload.employee_id)
    .maybeSingle();

  if (empErr) throw new InternalServerError(empErr.message);
  if (!employee) throw new NotFoundError('Employee not found');

  const insertPayload = {
    employee_id: payload.employee_id,
    evaluation_type: payload.evaluation_type,
    evaluation_date: evalDate,
    evaluation_notes: null,
    evaluation_document_path: null,
    created_at: now,
    updated_at: now
  };

  const { data: created, error } = await supabase
    .from('performance_evaluations')
    .insert(insertPayload)
    .select(EVALUATION_FIELDS)
    .single();

  if (error) throw new InternalServerError(error.message);

  // audit log (best-effort)
  try {
    if (user?.id) {
      await supabase.from('audit_logs').insert({
        user_id: user.id,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'performance_evaluations',
        record_id: String(created.evaluation_id),
        new_values: created,
        timestamp: now
      });
    }
  } catch (e) {
    logger.warn('Evaluation ensureSchedule audit log failed:', e?.message || e);
  }

  return {
    ...created,
    employee_name: formatEmployeeName(created.employees),
    employee_code: created.employees?.employee_id || null,
    position_title: created.employees?.positions?.position_title || null,
    personnel_type: created.employees?.personnel_type || null,
    alreadyExists: false
  };
};

// auto-schedules initial evaluation when employee is created

export const autoScheduleInitialEvaluation = async (employee, user) => {
  if (!employee?.id || !employee?.hire_date) {
    logger.warn('Cannot auto-schedule evaluation: missing employee data');
    return null;
  }

  const personnelType = String(employee?.personnel_type || '').trim();

  let evaluationDate = null;
  let evaluationType = null;

  if (personnelType === 'Probationary') {
    // Probationary: hire_date + 4 months
    const hireDateObj = parseIsoDateUtc(employee.hire_date);
    evaluationDate = addMonthsUtcClamped(hireDateObj, 4);
    evaluationType = 'Probationary';

  } else if (personnelType === 'Regular') {
    // Regular: regularization_date + 10 months (fallback to hire_date if not set)
    const baseDate = employee.regularization_date || employee.hire_date;
    const baseDateObj = parseIsoDateUtc(baseDate);
    evaluationDate = addMonthsUtcClamped(baseDateObj, 10);
    evaluationType = 'Annual';
  }

  if (!evaluationDate || !evaluationType) {
    logger.warn(`Cannot determine evaluation schedule for personnel_type: ${personnelType}`);
    return null;
  }

  const evalDateIso = toUtcIsoDate(evaluationDate);

  // Use ensureSchedule to prevent duplicates
  try {
    const scheduled = await ensureSchedule({
      employee_id: employee.id,
      evaluation_type: evaluationType,
      evaluation_date: evalDateIso
    }, user);

    logger.info(`Auto-scheduled ${evaluationType} evaluation for employee ${employee.employee_id} on ${evalDateIso}`);
    return scheduled;

  } catch (error) {
    logger.error('Failed to auto-schedule evaluation:', error);
    return null;
  }
};

export const listPendingDueEvaluations = async ({ year, quarter } = {}) => {
  if (!Number.isInteger(Number(year))) throw new BadRequestError('Year is required');
  if (!Number.isInteger(Number(quarter)) || Number(quarter) < 1 || Number(quarter) > 4) {
    throw new BadRequestError('Quarter must be between 1 and 4');
  }

  const { EMPLOYMENT_STATUSES } = await import('../config/constants.js');
  const { startIso, endIso } = buildQuarterRangeUtc({ year: Number(year), quarter: Number(quarter) });
  const startUtc = parseIsoDateUtc(startIso);
  const endUtc = parseIsoDateUtc(endIso);
  if (!startUtc || !endUtc) throw new InternalServerError('Failed to compute quarter range');

  // Fetch active employees with hire date.
  const { data: employees, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_id, first_name, last_name, hire_date, personnel_type, employment_status, positions ( position_title )')
    .eq('employment_status', EMPLOYMENT_STATUSES.ACTIVE)
    .not('hire_date', 'is', null);

  if (empErr) throw new InternalServerError(empErr.message);

  const list = Array.isArray(employees) ? employees : [];

  const dueCandidates = [];
  for (const e of list) {
    const hireIso = e?.hire_date ? String(e.hire_date).slice(0, 10) : '';
    const hireDate = parseIsoDateUtc(hireIso);
    if (!hireDate) continue;

    const personnel = String(e?.personnel_type || '').trim();

    const employeeBase = {
      employee_db_id: e.id,
      employee_code: e.employee_id || '',
      employee_name: `${e.first_name || ''} ${e.last_name || ''}`.trim(),
      position_title: e.positions?.position_title || '',
      personnel_type: personnel,
      hire_date: hireIso,
    };

    // 6-month probationary evaluation (hire_date + 6 months)
    const probationDue = addMonthsUtcClamped(hireDate, 6);
    const probationIso = toUtcIsoDate(probationDue);
    if (probationIso && probationIso >= startIso && probationIso <= endIso) {
      dueCandidates.push({
        ...employeeBase,
        due_date: probationIso,
        evaluation_type: 'Probationary',
      });
    }

    // Annual evaluation on the hire-date anniversary for this year (and beyond)
    // Show it only if it's at least 12 months after hire.
    const annualGate = addMonthsUtcClamped(hireDate, 12);
    const hireMonth = hireDate.getUTCMonth();
    const hireDay = hireDate.getUTCDate();
    const y = startUtc.getUTCFullYear();
    const maxDay = new Date(Date.UTC(y, hireMonth + 1, 0)).getUTCDate();
    const annDay = Math.min(hireDay, maxDay);
    const anniversary = new Date(Date.UTC(y, hireMonth, annDay));
    if (annualGate && anniversary.getTime() >= annualGate.getTime()) {
      const annIso = toUtcIsoDate(anniversary);
      if (annIso && annIso >= startIso && annIso <= endIso) {
        dueCandidates.push({
          ...employeeBase,
          due_date: annIso,
          evaluation_type: `ANNUAL (${y})`,
        });
      }
    }
  }

  if (!dueCandidates.length) return [];

  // Check existing evaluations (scheduled or completed) for these employees/types.
  const employeeIds = Array.from(new Set(dueCandidates.map((d) => d.employee_db_id)));
  const types = Array.from(new Set(dueCandidates.map((d) => d.evaluation_type)));

  const { data: evals, error: evalErr } = await supabase
    .from('performance_evaluations')
    .select('employee_id, evaluation_type, evaluation_notes, evaluation_document_path')
    .in('employee_id', employeeIds)
    .in('evaluation_type', types)
    .limit(2000);

  if (evalErr) throw new InternalServerError(evalErr.message);

  const existingKey = new Set();
  for (const r of Array.isArray(evals) ? evals : []) {
    const key = `${String(r?.employee_id || '')}::${String(r?.evaluation_type || '')}`;
    existingKey.add(key);
  }

  return dueCandidates
    .filter((d) => !existingKey.has(`${String(d.employee_db_id)}::${String(d.evaluation_type)}`))
    .sort((a, b) => {
      if (a.due_date !== b.due_date) return String(a.due_date).localeCompare(String(b.due_date));
      return String(a.employee_name).localeCompare(String(b.employee_name));
    });
};

export const updateSchedule = async (evaluationId, payload, user) => {
  const existing = await getEvaluationById(evaluationId);

  const now = new Date().toISOString();
  const patch = {
    evaluation_date: payload?.evaluation_date ? toIsoDate(payload.evaluation_date) : existing.evaluation_date,
    evaluation_type: payload?.evaluation_type ? String(payload.evaluation_type) : existing.evaluation_type,
    updated_at: now
  };

  const { data: updated, error } = await supabase
    .from('performance_evaluations')
    .update(patch)
    .eq('evaluation_id', evaluationId)
    .select(EVALUATION_FIELDS)
    .single();

  if (error) throw new InternalServerError(error.message);

  // NOTE: PostgREST may not always return nested relations on UPDATE.
  // Re-fetch to ensure employees relation + derived fields exist for audit logs/UI.
  const hydrated = await getEvaluationById(updated.evaluation_id);

  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'performance_evaluations',
      record_id: String(hydrated.evaluation_id),
      old_values: existing,
      new_values: hydrated,
      timestamp: now
    });
  } catch (e) {
    logger.warn('Evaluation audit log failed:', e?.message || e);
  }

  return {
    ...hydrated,
    employee_name: hydrated.employee_name || formatEmployeeName(hydrated.employees),
    employee_code: hydrated.employee_code || hydrated.employees?.employee_id || null,
    position_title: hydrated.position_title || hydrated.employees?.positions?.position_title || null,
    personnel_type: hydrated.personnel_type || hydrated.employees?.personnel_type || null
  };
};

const sanitizeForFileName = (value) => String(value || '').replace(/[^a-zA-Z0-9]+/g, ' ').trim().replace(/\s+/g, '_');

const getExtension = (fileName) => {
  const raw = String(fileName || '');
  const dot = raw.lastIndexOf('.');
  if (dot <= 0 || dot === raw.length - 1) return '';
  return raw.slice(dot + 1).toLowerCase();
};

const buildEvaluationFileName = ({ kind, employee, evaluationType, evaluationDate, originalName }) => {
  const prefix = kind === 'breakdown'
    ? 'Evaluation_Breakdown'
    : kind === 'final'
      ? 'Evaluation_Final'
      : kind === 'form'
        ? 'Evaluation_Form'
        : 'Evaluation';

  const safeType = sanitizeForFileName(String(evaluationType || ''));
  const typePart = safeType ? `_${safeType}` : '';

  const empName =
    sanitizeForFileName(`${employee?.first_name || ''} ${employee?.last_name || ''}`.trim()) ||
    sanitizeForFileName(employee?.employee_id) ||
    'Employee';

  const isoDate = toIsoDate(evaluationDate) || new Date().toISOString().slice(0, 10);
  const ext = getExtension(originalName);

  return ext
    ? `${prefix}${typePart}_${empName}_${isoDate}.${ext}`
    : `${prefix}${typePart}_${empName}_${isoDate}`;
};

const putIntoNotes = ({ existingNotes, score, remarks, evaluationForm }) => {
  const s = typeof score === 'string' ? score.trim() : score;
  const hasScore = s !== null && s !== undefined && String(s).trim() !== '';
  const hasRemarks = String(remarks || '').trim().length > 0;
  if (!hasScore && !hasRemarks) return existingNotes || null;

  const lines = [];

  if (hasScore) lines.push(`Score: ${String(s).trim()}`);
  if (hasRemarks) lines.push(`Remarks: ${String(remarks).trim()}`);

  // Keep this field short/clean for the table view.
  return lines.join('\n');
};

export const submitEvaluation = async (evaluationId, payload, user) => {
  const existing = await getEvaluationById(evaluationId);

  const now = new Date().toISOString();

  let documentPayload = existing.evaluation_document_path || null;
  let documentObj = safeJsonParse(existing.evaluation_document_path) || null;

  // Always persist filled form inputs when provided (so it can be regenerated later)
  const hasFormPayload = payload?.evaluation_form && typeof payload.evaluation_form === 'object';
  if (hasFormPayload) {
    const nextDocObj = documentObj && typeof documentObj === 'object' ? { ...documentObj } : {};
    nextDocObj.form_data = payload.evaluation_form;
    documentObj = nextDocObj;
    documentPayload = JSON.stringify(nextDocObj);
  }

  // Resolve employee for folder + notifications
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, user_id, employee_id, first_name, last_name')
    .eq('id', existing.employee_id)
    .single();

  if (empErr || !employee) throw new NotFoundError('Employee not found');

  const uploads = [];

  const doUpload = async ({ kind, file }) => {
    if (!file) return null;

    const generatedName = buildEvaluationFileName({
      kind,
      employee,
      evaluationType: payload?.evaluation_type || existing?.evaluation_type,
      evaluationDate: existing?.evaluation_date,
      originalName: file.originalname
    });

    const bucket = String(process.env.STORAGE_BUCKET_DOCUMENTS || '').trim();
    if (!bucket) throw new InternalServerError('Storage bucket is not configured');

    const timestamp = Date.now();
    const empCode = employee.employee_id || 'employee';
    const isoDate = toIsoDate(existing?.evaluation_date) || new Date().toISOString().slice(0, 10);
    // Keep a timestamp prefix to avoid filename collisions in storage.
    const filePath = `${empCode}/evaluation/${isoDate}/${timestamp}_${generatedName}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(filePath, file.buffer, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.mimetype
      });

    if (uploadError) throw new InternalServerError('Failed to upload file to storage: ' + uploadError.message);

    return { provider: 'supabase', path: uploadData.path, fileName: generatedName, mimeType: file.mimetype };
  };

  if (payload?.file) {
    uploads.push(
      doUpload({ kind: 'file', file: payload.file }).then((u) => {
        if (!u) return;
        documentPayload = JSON.stringify({ file: u });
      })
    );
  }

  if (payload?.breakdown_file || payload?.final_file) {
    if (!documentObj) documentObj = {};

    uploads.push(
      doUpload({ kind: 'breakdown', file: payload.breakdown_file }).then((u) => {
        if (u) documentObj.breakdown = u;
      })
    );

    uploads.push(
      doUpload({ kind: 'final', file: payload.final_file }).then((u) => {
        if (u) documentObj.final = u;
      })
    );

    await Promise.all(uploads);
    documentPayload = JSON.stringify(documentObj);
  } else {
    await Promise.all(uploads);
  }

  const nextNotes = putIntoNotes({ existingNotes: existing.evaluation_notes, score: payload?.score, remarks: payload?.remarks, evaluationForm: payload?.evaluation_form });

  const patch = {
    evaluation_notes: nextNotes,
    evaluation_document_path: documentPayload,
    evaluation_type: payload?.evaluation_type ? String(payload.evaluation_type) : existing.evaluation_type,
    updated_at: now
  };

  // Store template_id if provided (from dynamic form submission)
  if (payload?.template_id) {
    patch.template_id = payload.template_id;
  }

  const { data: updated, error } = await supabase
    .from('performance_evaluations')
    .update(patch)
    .eq('evaluation_id', evaluationId)
    .select(EVALUATION_FIELDS)
    .single();

  if (error) {
    // Note: uploaded files are not cleaned up on failure (would require tracking all uploaded paths).
    logger.error('Evaluation submit failed after uploads:', error);
    throw new InternalServerError(error.message);
  }

  // Same issue as updateSchedule: ensure relations/derived fields are present.
  const hydrated = await getEvaluationById(updated.evaluation_id);

  try {
    await supabase.from('audit_logs').insert({
      user_id: user.id,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'performance_evaluations',
      record_id: String(hydrated.evaluation_id),
      old_values: existing,
      new_values: hydrated,
      timestamp: now
    });
  } catch (e) {
    logger.warn('Evaluation audit log failed:', e?.message || e);
  }

  // auto-schedule next year's annual evaluation (recurring)
  try {
    if (hydrated.evaluation_type === 'Annual') {
      const currentEvalDate = parseIsoDateUtc(hydrated.evaluation_date);
      const nextYearDate = addMonthsUtcClamped(currentEvalDate, 12);
      const nextYearIso = toUtcIsoDate(nextYearDate);

      await ensureSchedule({
        employee_id: hydrated.employee_id,
        evaluation_type: 'Annual',
        evaluation_date: nextYearIso
      }, user);

      logger.info(`Auto-scheduled next Annual evaluation for employee ${hydrated.employees?.employee_id || hydrated.employee_id} on ${nextYearIso}`);
    }
  } catch (e) {
    logger.warn('Failed to schedule next annual evaluation:', e?.message || e);
  }

  return {
    ...hydrated,
    employee_name: hydrated.employee_name || formatEmployeeName(hydrated.employees),
    employee_code: hydrated.employee_code || hydrated.employees?.employee_id || null,
    position_title: hydrated.position_title || hydrated.employees?.positions?.position_title || null,
    personnel_type: hydrated.personnel_type || hydrated.employees?.personnel_type || null
  };
};

const pickDocHandle = ({ evaluation, doc }) => {
  const raw = evaluation?.evaluation_document_path;
  const obj = safeJsonParse(raw);

  const key = doc === 'breakdown' ? 'breakdown' : doc === 'final' ? 'final' : doc === 'form' ? 'form' : 'file';

  if (obj && typeof obj === 'object') {
    const handle = obj[key] || obj.file || null;
    return handle;
  }

  if (!raw) return null;

  // legacy string (assume drive fileId or supabase path)
  return { fileId: raw, path: raw };
};

export const downloadEvaluationDocument = async ({ evaluationId, doc } = {}) => {
  const evaluation = await getEvaluationById(evaluationId);
  const obj = safeJsonParse(evaluation?.evaluation_document_path) || null;

  const handle = pickDocHandle({ evaluation, doc });
  if (!handle) throw new NotFoundError('Evaluation document not found');

  // Supabase storage
  const bucket = String(process.env.STORAGE_BUCKET_DOCUMENTS || '').trim();
  if (!bucket) throw new InternalServerError('Storage bucket is not configured');

  const path = handle.path || handle.file_path || handle.fileId;
  if (!path) throw new NotFoundError('Evaluation document not found');

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error) throw new InternalServerError(error.message);

  return { provider: 'supabase', signedUrl: data?.signedUrl || data?.signedURL || data?.signed_url || null };
};

export const previewEvaluationDocument = async ({ evaluationId, doc } = {}) => {
  const evaluation = await getEvaluationById(evaluationId);
  const obj = safeJsonParse(evaluation?.evaluation_document_path) || null;

  const handle = pickDocHandle({ evaluation, doc });
  if (!handle) throw new NotFoundError('Evaluation document not found');

  const bucket = String(process.env.STORAGE_BUCKET_DOCUMENTS || '').trim();
  if (!bucket) throw new InternalServerError('Storage bucket is not configured');

  const path = handle.path || handle.file_path || handle.fileId;
  if (!path) throw new NotFoundError('Evaluation document not found');

  const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 5);
  if (error) throw new InternalServerError(error.message);

  return { provider: 'supabase', url: data?.signedUrl || data?.signedURL || null };
};

// Optional cleanup helper for future deletions
export const deleteEvaluationDocumentsBestEffort = async (evaluation) => {
  const obj = safeJsonParse(evaluation?.evaluation_document_path);
  if (!obj) return;

  // Supabase cleanup intentionally omitted (needs bucket + remove).
  // Can be implemented when needed.
};

// gets emails of Executives, Managers, and HR for notifications

const getNotificationRecipients = async () => {
  // TEST MODES
  const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS;

  if (adminEmails && adminEmails.trim().length > 0) {
    const emails = adminEmails
      .split(',')
      .map(email => email.trim())
      .filter(email => email.length > 0);

    logger.info(`[TEST MODE] Using ADMIN_NOTIFICATION_EMAILS: ${emails.join(', ')}`);

    return emails.map(email => ({ email, role: 'TEST' }));
  }

  // for production,, query database for actual recipients
  const { ROLES, EMPLOYMENT_STATUSES } = await import('../config/constants.js');

  const { data: users, error } = await supabase
    .from('users')
    .select('email, role, employees!inner(employment_status)')
    .in('role', [ROLES.EXECUTIVE, ROLES.MANAGER, ROLES.HR])
    .eq('employees.employment_status', EMPLOYMENT_STATUSES.ACTIVE)
    .not('email', 'is', null);

  if (error) {
    logger.error('Failed to get notification recipients:', error);
    return [];
  }

  logger.info(`[PRODUCTION MODE] Found ${users?.length || 0} active recipients from database`);
  return Array.isArray(users) ? users : [];
};

// sends reminder email to Executives, Managers, and HR
const sendReminderEmail = async (evaluation) => {
  const employee = evaluation.employees;
  const employeeName = formatEmployeeName(employee);
  const evalType = evaluation.evaluation_type;

  // get HR/Executive/Manager emails
  const recipients = await getNotificationRecipients();

  if (recipients.length === 0) {
    logger.warn('No notification recipients found for evaluation reminder');
    return;
  }

  const logoAttachment = await getEmailLogoAttachment();
  const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;

  const html = buildEvaluationEmailHtml({
    title: 'Evaluation Reminder',
    message: `This is a reminder that ${employeeName}'s ${evalType} evaluation is due in 7 days (1 week).`,
    recipientName: 'Team',
    statusPill: { label: 'REMINDER', bg: WEBSITE_COLORS.mustard },
    logoSrc,
    date: evaluation.evaluation_date,
    details: [
      { label: 'Employee', value: employeeName },
      { label: 'Employee ID', value: employee?.employee_id || '—' },
      { label: 'Position', value: employee?.positions?.position_title || '—' },
      { label: 'Evaluation Type', value: evalType },
      { label: 'Due Date', value: toIsoDate(evaluation.evaluation_date) }
    ]
  });

  // send to all recipients
  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: `WDCAP HRIS — Evaluation Reminder: ${employeeName}`,
        text: `Reminder: ${employeeName}'s ${evalType} evaluation is due on ${formatLetterDate(evaluation.evaluation_date)}`,
        html,
        attachments: logoAttachment ? [logoAttachment] : undefined
      });
      logger.info(`Sent evaluation reminder to ${recipient.email} for employee ${employeeName}`);
    } catch (e) {
      logger.error(`Failed to send reminder email to ${recipient.email}:`, e);
    }
  }
};

 // sends reminders for evaluations due in 7 days (1 week)
 // called by cron job daily
export const sendEvaluationReminders = async () => {
  try {
    const today = new Date();
    const targetDate = new Date(today);
    targetDate.setDate(today.getDate() + 7);
    const targetIso = toUtcIsoDate(targetDate);

    logger.info(`Checking for evaluations due on ${targetIso} (7 days from now)`);

    // find evaluations due in exactly 7 days that haven't been reminded
    const { data: evaluations, error } = await supabase
      .from('performance_evaluations')
      .select(`
        evaluation_id,
        employee_id,
        evaluation_type,
        evaluation_date,
        reminder_sent_at,
        employees (
          id,
          user_id,
          employee_id,
          first_name,
          last_name,
          positions (position_title)
        )
      `)
      .eq('evaluation_date', targetIso)
      .is('reminder_sent_at', null);

    if (error) throw new InternalServerError(error.message);

    const evaluationList = Array.isArray(evaluations) ? evaluations : [];
    const results = { sent: 0, failed: 0, total: evaluationList.length };

    if (evaluationList.length === 0) {
      logger.info('No evaluations due in 7 days - no reminders to send');
      return results;
    }

    logger.info(`Found ${evaluationList.length} evaluation(s) due in 7 days`);

    for (const evaluation of evaluationList) {
      try {
        await sendReminderEmail(evaluation);

        // mark reminder as sent
        await supabase
          .from('performance_evaluations')
          .update({ reminder_sent_at: new Date().toISOString() })
          .eq('evaluation_id', evaluation.evaluation_id);

        results.sent++;
      } catch (e) {
        logger.error(`Failed to send reminder for evaluation ${evaluation.evaluation_id}:`, e);
        results.failed++;
      }
    }

    logger.info(`Evaluation reminders complete: ${results.sent} sent, ${results.failed} failed out of ${results.total} total`);
    return results;

  } catch (error) {
    logger.error('Error sending evaluation reminders:', error);
    throw error;
  }
};
