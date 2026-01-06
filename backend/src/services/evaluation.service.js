import { supabase } from '../config/supabase.js';
import { BadRequestError, InternalServerError, NotFoundError } from '../utils/errors.js';
import { AUDIT_ACTIONS } from '../config/constants.js';
import logger from '../utils/logger.js';
import { sendEmail } from './mail.service.js';
import { deleteFromDrive, downloadFromDrive, ensureDriveUserAccess, getOrCreateEmployeeFolder, getOrCreateFolder, isDriveEnabled, uploadToDrive } from './googleDrive.service.js';

const EVALUATION_FIELDS = `
  evaluation_id,
  employee_id,
  evaluation_type,
  evaluation_date,
  evaluation_notes,
  evaluation_document_path,
  created_at,
  updated_at,
  employees (id, employee_id, first_name, last_name, personnel_type, positions (position_title))
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

const toIsoDate = (value) => {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  try {
    return new Date(value).toISOString().slice(0, 10);
  } catch {
    return '';
  }
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

const buildEvaluationEmailHtml = ({ title, message, recipientName, details, statusPill }) => {
  const safeDetails = (details || []).filter((d) => d && d.label);
  const safeRecipient = String(recipientName || 'Sir/Ma’am');
  const safeTitle = String(title || 'Evaluation');

  const pillBg = statusPill?.bg || WEBSITE_COLORS.mustard;
  const pillLabel = statusPill?.label || 'NOTICE';

  return `
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background:${WEBSITE_COLORS.red};padding:24px 0;margin:0;font-family:ui-sans-serif,system-ui,-apple-system,'Segoe UI',Roboto,Arial,'Noto Sans';">
      <tr>
        <td align="center" style="padding:0 16px;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:720px;background:#ffffff;border-radius:14px;overflow:hidden;">
            <tr>
              <td style="padding:20px 22px 18px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="border-collapse:collapse;">
                  <tr>
                    <td align="left" style="padding:0;">
                      <div style="letter-spacing:0.04em;font-size:22px;color:${WEBSITE_COLORS.red};font-weight:800;margin:0;">
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
        </td>
      </tr>
    </table>
  `.trim();
};

const getEmployeeRecipientEmail = async (employee) => {
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

const ensureEvaluationFolder = async (employee) => {
  const employeeFolder = await getOrCreateEmployeeFolder({
    employeeCode: employee.employee_id,
    firstName: employee.first_name,
    lastName: employee.last_name
  });

  const evaluationFolder = await getOrCreateFolder({
    name: 'Evaluation',
    parentId: employeeFolder.folderId
  });

  return { employeeFolder, evaluationFolder };
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

    return (data || []).map((r) => ({
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
    .select('id, employee_id, first_name, last_name')
    .eq('id', payload.employee_id)
    .single();

  if (empErr || !employee) throw new NotFoundError('Employee not found');

  // Prepare Drive folder (best-effort) so employee has /Evaluation ready.
  try {
    if (isDriveEnabled()) {
      const { employeeFolder, evaluationFolder } = await ensureEvaluationFolder(employee);

      const recipientEmail = await getEmployeeRecipientEmail(employee);
      if (recipientEmail) {
        await ensureDriveUserAccess({ fileId: employeeFolder.folderId, email: recipientEmail, role: 'reader' });
        await ensureDriveUserAccess({ fileId: evaluationFolder.folderId, email: recipientEmail, role: 'reader' });
      }
    }
  } catch (e) {
    logger.warn('Evaluation Drive folder prep failed (continuing):', e?.message || e);
  }

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

  // notify employee (best-effort)
  try {
    const recipientEmail = await getEmployeeRecipientEmail(employee);
    if (recipientEmail) {
      const html = buildEvaluationEmailHtml({
        title: 'Evaluation Scheduled',
        message: 'Your performance evaluation has been scheduled. Please check the details below.',
        recipientName: employee.first_name || formatEmployeeName(employee) || 'Employee',
        statusPill: { label: 'SCHEDULED', bg: WEBSITE_COLORS.mustard },
        details: [
          { label: 'Type', value: created.evaluation_type },
          { label: 'Date', value: toIsoDate(created.evaluation_date) }
        ]
      });

      await sendEmail({
        to: recipientEmail,
        subject: 'Evaluation Scheduled',
        text: `Your evaluation has been scheduled.\nType: ${created.evaluation_type}\nDate: ${toIsoDate(created.evaluation_date)}`,
        html
      });
    }
  } catch (e) {
    logger.warn('Evaluation schedule email failed (continuing):', e?.message || e);
  }

  return {
    ...created,
    employee_name: formatEmployeeName(created.employees),
    employee_code: created.employees?.employee_id || null,
    position_title: created.employees?.positions?.position_title || null,
    personnel_type: created.employees?.personnel_type || null
  };
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

  // notify employee (best-effort)
  try {
    const { data: employee } = await supabase
      .from('employees')
      .select('id, employee_id, first_name, last_name')
      .eq('id', updated.employee_id)
      .maybeSingle();

    const recipientEmail = await getEmployeeRecipientEmail(employee);
    if (recipientEmail) {
      const html = buildEvaluationEmailHtml({
        title: 'Evaluation Schedule Updated',
        message: 'Your performance evaluation schedule has been updated.',
        recipientName: employee?.first_name || formatEmployeeName(employee) || 'Employee',
        statusPill: { label: 'UPDATED', bg: WEBSITE_COLORS.green },
        details: [
          { label: 'Type', value: updated.evaluation_type },
          { label: 'Date', value: toIsoDate(updated.evaluation_date) }
        ]
      });

      await sendEmail({
        to: recipientEmail,
        subject: 'Evaluation Schedule Updated',
        text: `Your evaluation schedule has been updated.\nType: ${updated.evaluation_type}\nDate: ${toIsoDate(updated.evaluation_date)}`,
        html
      });
    }
  } catch (e) {
    logger.warn('Evaluation reschedule email failed (continuing):', e?.message || e);
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

const putIntoNotes = ({ existingNotes, score, remarks }) => {
  const s = typeof score === 'string' ? score.trim() : score;
  const hasScore = s !== null && s !== undefined && String(s).trim() !== '';
  const hasRemarks = String(remarks || '').trim().length > 0;

  if (!hasScore && !hasRemarks) return existingNotes || null;

  const lines = [];
  if (hasScore) lines.push(`Score: ${String(s).trim()}`);
  if (hasRemarks) lines.push(`Remarks: ${String(remarks).trim()}`);

  // Keep older notes below for traceability.
  const prev = String(existingNotes || '').trim();
  const next = lines.join('\n');
  return prev ? `${next}\n\n${prev}` : next;
};

export const submitEvaluation = async (evaluationId, payload, user) => {
  const existing = await getEvaluationById(evaluationId);

  const now = new Date().toISOString();

  let documentPayload = existing.evaluation_document_path || null;
  let documentObj = safeJsonParse(existing.evaluation_document_path) || null;

  // Resolve employee for folder + notifications
  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_id, first_name, last_name')
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

    if (isDriveEnabled()) {
      const { evaluationFolder, employeeFolder } = await ensureEvaluationFolder(employee);

      const recipientEmail = await getEmployeeRecipientEmail(employee);
      if (recipientEmail) {
        await ensureDriveUserAccess({ fileId: employeeFolder.folderId, email: recipientEmail, role: 'reader' });
        await ensureDriveUserAccess({ fileId: evaluationFolder.folderId, email: recipientEmail, role: 'reader' });
      }

      const driveUpload = await uploadToDrive({
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        fileName: generatedName,
        parentFolderId: evaluationFolder.folderId
      });

      if (recipientEmail) {
        await ensureDriveUserAccess({ fileId: driveUpload.fileId, email: recipientEmail, role: 'reader' });
      }

      return { provider: 'google_drive', fileId: driveUpload.fileId, fileName: driveUpload.name, mimeType: driveUpload.mimeType };
    }

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

  const nextNotes = putIntoNotes({ existingNotes: existing.evaluation_notes, score: payload?.score, remarks: payload?.remarks });

  const patch = {
    evaluation_notes: nextNotes,
    evaluation_document_path: documentPayload,
    evaluation_type: payload?.evaluation_type ? String(payload.evaluation_type) : existing.evaluation_type,
    updated_at: now
  };

  const { data: updated, error } = await supabase
    .from('performance_evaluations')
    .update(patch)
    .eq('evaluation_id', evaluationId)
    .select(EVALUATION_FIELDS)
    .single();

  if (error) {
    // best-effort cleanup (Drive only for the just-uploaded files is hard to track here), so we just log.
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

  // notify employee that result is available (best-effort)
  try {
    const recipientEmail = await getEmployeeRecipientEmail(employee);
    if (recipientEmail) {
      const html = buildEvaluationEmailHtml({
        title: 'Evaluation Updated',
        message: 'Your performance evaluation has been updated. You can now view your score/remarks and attached document(s) in the HRIS.',
        recipientName: employee.first_name || formatEmployeeName(employee) || 'Employee',
        statusPill: { label: 'UPDATED', bg: WEBSITE_COLORS.green },
        details: [
          { label: 'Type', value: updated.evaluation_type },
          { label: 'Date', value: toIsoDate(updated.evaluation_date) }
        ]
      });

      await sendEmail({
        to: recipientEmail,
        subject: 'Evaluation Updated',
        text: `Your evaluation has been updated.\nType: ${updated.evaluation_type}\nDate: ${toIsoDate(updated.evaluation_date)}`,
        html
      });
    }
  } catch (e) {
    logger.warn('Evaluation updated email failed (continuing):', e?.message || e);
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

  const key = doc === 'breakdown' ? 'breakdown' : doc === 'final' ? 'final' : 'file';

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
  const handle = pickDocHandle({ evaluation, doc });
  if (!handle) throw new NotFoundError('Evaluation document not found');

  // Drive
  if (isDriveEnabled() && (handle.fileId || (typeof handle === 'string' && handle))) {
    const fileId = handle.fileId || String(handle);
    const dl = await downloadFromDrive(fileId);
    return { provider: 'google_drive', ...dl };
  }

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
  const handle = pickDocHandle({ evaluation, doc });
  if (!handle) throw new NotFoundError('Evaluation document not found');

  if (isDriveEnabled() && (handle.fileId || (typeof handle === 'string' && handle))) {
    // For UI we will stream via controller, but keep a webViewLink-friendly handle.
    return { provider: 'google_drive', url: null, fileId: handle.fileId || String(handle) };
  }

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

  const items = [obj.file, obj.breakdown, obj.final].filter(Boolean);
  for (const it of items) {
    try {
      if (isDriveEnabled() && it.fileId) await deleteFromDrive(it.fileId);
      // Supabase cleanup intentionally omitted (needs bucket + remove).
    } catch {
      // ignore
    }
  }
};
