import crypto from 'node:crypto';
import { supabase } from '../config/supabase.js';
import { NotFoundError, InternalServerError, ConflictError, BadRequestError } from '../utils/errors.js';
import { AUDIT_ACTIONS, DOCUMENT_TYPES, ONBOARDING_STATUSES } from '../config/constants.js';
import logger from '../utils/logger.js';
import { ROLES, PERSONNEL_TYPES } from '../config/constants.js';
import { driveFileExists, isDriveEnabled } from './googleDrive.service.js';
import { sendEmail } from './mail.service.js';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Fields to select for checklist items with relations
const checklistFields = `
  id,
  employee_id,
  checklist_item_id,
  is_required,
  status,
  remarks,
  document_id,
  submitted_at,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at,
  onboarding_items (id, item_name),
  documents (id, file_name, file_path),
  reviewed_by_user:users!onboarding_checklists_reviewed_by_fkey (id, email)
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

const getFrontendBaseUrl = () => {
  const raw = String(process.env.FRONTEND_URL || process.env.CLIENT_URL || '').trim();
  if (!raw) return '';
  return raw.replace(/\/$/, '');
};

const buildAccountCreatedEmailHtml = ({ recipientName, email, initialPassword, loginUrl, date, logoSrc }) => {
  const safeRecipient = String(recipientName || 'Sir/Ma\u2019am');
  const safeEmail = String(email || '');
  const safePassword = String(initialPassword || '');
  const safeLoginUrl = String(loginUrl || '');
  const dateLine = formatLetterDate(date);

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
                        ACCOUNT CREATED
                      </div>
                    </td>
                    <td align="right" style="padding:0;">
                      <div style="display:inline-block;background:${WEBSITE_COLORS.mustard};color:#ffffff;font-weight:700;font-size:12px;letter-spacing:0.06em;border-radius:999px;padding:6px 10px;">
                        ACTION REQUIRED
                      </div>
                    </td>
                  </tr>
                </table>

                ${dateLine ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${escapeHtml(dateLine)}</div>` : ''}

                <div style="height:1px;background:#f3f4f6;margin:14px 0 14px;"></div>

                <p style="margin:0 0 10px;font-size:14px;color:#111827;">Dear <b>${escapeHtml(safeRecipient)}</b>,</p>

                <p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#111827;">
                  Your WDCAP HRIS account has been created. Please use the details below to log in.
                </p>

                <div style="font-size:14px;line-height:1.7;color:#111827;margin:0 0 10px;">
                  <div style="margin:0 0 8px;"><span style="color:#374151;font-weight:700;">Email:</span> ${escapeHtml(safeEmail) || '—'}</div>
                  <div style="margin:0 0 8px;"><span style="color:#374151;font-weight:700;">Initial Password:</span> ${escapeHtml(safePassword) || '—'}</div>
                </div>

                <p style="margin:0 0 10px;font-size:13px;line-height:1.6;color:#374151;">
                  Please log in and change your password immediately.
                </p>

                ${safeLoginUrl ? `
                  <div style="text-align:center;margin:18px 0 18px;">
                    <a href="${escapeHtml(safeLoginUrl)}" style="display:inline-block;background:${WEBSITE_COLORS.red};color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 16px;font-size:14px;">
                      Log in to HRIS
                    </a>
                  </div>
                ` : ''}

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

const findAuthUserIdByEmail = async (email) => {
  const target = String(email || '').trim().toLowerCase();
  if (!target) return null;

  // Supabase Auth Admin API does not provide a direct get-by-email helper.
  // For onboarding (admin-only), paginating listUsers is acceptable.
  const perPage = 200;
  const maxPages = 20;

  for (let page = 1; page <= maxPages; page += 1) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) {
      throw new InternalServerError(`Failed to list Auth users: ${error.message}`);
    }

    const users = data?.users || [];
    const match = users.find(u => String(u?.email || '').trim().toLowerCase() === target);
    if (match?.id) return match.id;

    if (users.length < perPage) break;
  }

  return null;
};

// create user account and employee record together, so if employee creation fails, fail user creation
export const createEmployeeWithAccount = async (onboardingData, actorUserId = null) => {
  let authUserId = null;
  let createdUserId = null;
  let emailSend = { skipped: true };
  let createdPlaceholderUser = false;

  try {
    const {
      // account info
      email,
      role = ROLES.EMPLOYEE,
      // employee info
      first_name,
      middle_name,
      last_name,
      birth_date,
      phone_number,
      address,
      emergency_contact_name,
      emergency_contact_number,
      hire_date,
      position_id,
      department_id,
      employment_status,
      personnel_type
    } = onboardingData;

    const normalizedPersonnelType = String(personnel_type || '').trim().toLowerCase();
    const isProjectBased = normalizedPersonnelType === String(PERSONNEL_TYPES.PROJECT_BASED || '').trim().toLowerCase();
    const normalizedEmail = String(email || '').trim();

    // Project-based employees must not have a login account.
    if (isProjectBased) {
      // verify department and position exist
      const [deptResult, posResult] = await Promise.all([
        supabase.from('departments').select('id').eq('id', department_id).single(),
        supabase.from('positions').select('id').eq('id', position_id).single()
      ]);

      if (deptResult.error || !deptResult.data) {
        throw new InternalServerError('Department not found');
      }
      if (posResult.error || !posResult.data) {
        throw new InternalServerError('Position not found');
      }

      // Try creating the employee without a linked user_id.
      let newEmployee;
      {
        const { data, error } = await supabase
          .rpc('create_new_employee', {
            p_user_id: null,
            p_first_name: first_name,
            p_middle_name: middle_name || null,
            p_last_name: last_name,
            p_birth_date: birth_date,
            p_phone_number: phone_number,
            p_address: address,
            p_emergency_contact_name: emergency_contact_name,
            p_emergency_contact_number: emergency_contact_number,
            p_hire_date: hire_date,
            p_position_id: position_id,
            p_department_id: department_id,
            p_employment_status: employment_status,
            p_personnel_type: personnel_type
          })
          .single();

        if (!error && data?.id) {
          newEmployee = data;
        } else {
          // Fallback: if DB schema requires user_id, create a placeholder app user (no Supabase Auth user).
          // This user has no login access because it does not exist in Supabase Auth.
          const placeholderId = crypto.randomUUID();
          const nowIso = new Date().toISOString();

          const tryInsertPlaceholder = async (placeholderEmail) => {
            const { data: inserted, error: insertError } = await supabase
              .from('users')
              .insert([{
                id: placeholderId,
                email: placeholderEmail,
                role: ROLES.EMPLOYEE,
                employee_id: null,
                created_at: nowIso,
                updated_at: nowIso,
                last_login: null
              }])
              .select()
              .single();
            if (insertError) throw insertError;
            return inserted;
          };

          try {
            await tryInsertPlaceholder(null);
          } catch (insertErr) {
            // If email is NOT NULL, use an internal placeholder that is not used for login.
            const fallbackEmail = `contractor_${placeholderId}@no-email.local`;
            await tryInsertPlaceholder(fallbackEmail);
          }

          createdUserId = placeholderId;
          createdPlaceholderUser = true;

          const { data: empData, error: empError } = await supabase
            .rpc('create_new_employee', {
              p_user_id: createdUserId,
              p_first_name: first_name,
              p_middle_name: middle_name || null,
              p_last_name: last_name,
              p_birth_date: birth_date,
              p_phone_number: phone_number,
              p_address: address,
              p_emergency_contact_name: emergency_contact_name,
              p_emergency_contact_number: emergency_contact_number,
              p_hire_date: hire_date,
              p_position_id: position_id,
              p_department_id: department_id,
              p_employment_status: employment_status,
              p_personnel_type: personnel_type
            })
            .single();

          if (empError) {
            throw new InternalServerError(`Failed to create employee: ${empError.message}`);
          }
          newEmployee = empData;
        }
      }

      // fetch complete employee record
      const { data: completeEmployee, error: fetchError } = await supabase
        .from('employees')
        .select(`
          id, employee_id, user_id, first_name, middle_name, last_name,
          birth_date, phone_number, address, emergency_contact_name,
          emergency_contact_number, hire_date, employment_status, personnel_type,
          created_at, updated_at,
          departments (id, department_name),
          positions (id, position_title)
        `)
        .eq('id', newEmployee.id)
        .single();

      if (fetchError) {
        throw new InternalServerError('Employee created but failed to fetch details');
      }

      // If we had to create a placeholder user, sync its employee_id field for internal linking.
      if (createdPlaceholderUser && createdUserId) {
        await supabase
          .from('users')
          .update({ employee_id: completeEmployee.employee_id, updated_at: new Date().toISOString() })
          .eq('id', createdUserId);
      }

      // Audit + checklist creation should be attributed to the HR/Admin who performed onboarding.
      const auditActor = actorUserId || createdUserId || null;
      try {
        await supabase.from('audit_logs').insert([
          ...(createdPlaceholderUser ? [{
            user_id: auditActor,
            action_type: AUDIT_ACTIONS.CREATE,
            table_name: 'users',
            record_id: createdUserId,
            new_values: { email: createdPlaceholderUser ? null : undefined, role: ROLES.EMPLOYEE, placeholder: true },
            timestamp: new Date().toISOString()
          }] : []),
          {
            user_id: auditActor,
            action_type: AUDIT_ACTIONS.CREATE,
            table_name: 'employees',
            record_id: completeEmployee.id,
            new_values: completeEmployee,
            timestamp: new Date().toISOString()
          }
        ]);
      } catch {
        // best-effort
      }

      try {
        await createChecklistForEmployee(completeEmployee.id, auditActor);
      } catch (checklistError) {
        logger.error(`Failed to create checklist: ${checklistError.message}`);
      }

      logger.info(`Project-based employee onboarded successfully: ${completeEmployee.employee_id}`);

      emailSend = {
        skipped: true,
        reason: 'project-based'
      };

      return {
        user: null,
        employee: completeEmployee,
        email: emailSend
      };
    }

    // For non-project-based employees, email is required.
    if (!normalizedEmail) {
      throw new BadRequestError('Email is required');
    }

    // The initial password is automatically set to the generated employee_id.
    // We sign up with a temporary strong password first (employee_id isn't known until the employee record is created),
    // then update it via Supabase admin.
    const temporaryPassword = crypto.randomBytes(18).toString('base64url');

    // check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (existingUser) {
      throw new ConflictError('Email already registered');
    }

    // Create user in Supabase Auth using Admin API (best for Admin/HR-created accounts).
    // If the Auth user already exists (e.g., created manually in Supabase dashboard), reuse it.
    {
      const { data: authData, error: createAuthError } = await supabase.auth.admin.createUser({
        email: normalizedEmail,
        password: temporaryPassword,
        email_confirm: true
      });

      if (createAuthError || !authData?.user) {
        const msg = String(createAuthError?.message || '').toLowerCase();
        const alreadyExists = msg.includes('already') || msg.includes('registered') || msg.includes('exists');
        if (!alreadyExists) {
          throw new InternalServerError(`Failed to create user account in Auth: ${createAuthError?.message || 'Unknown error'}`);
        }

        const existingAuthId = await findAuthUserIdByEmail(normalizedEmail);
        if (!existingAuthId) {
          throw new InternalServerError('Auth user already exists, but could not resolve its ID by email');
        }

        authUserId = existingAuthId;
      } else {
        authUserId = authData.user.id;
      }
    }

    // Create/ensure the app user remember row exists
    let newUser = null;
    {
      const { data: userById, error: userByIdError } = await supabase
        .from('users')
        .select('id, email, role, employee_id')
        .eq('id', authUserId)
        .maybeSingle();

      if (userByIdError) {
        throw new InternalServerError(`Failed to check user record: ${userByIdError.message}`);
      }

      if (userById) {
        // If it exists already, keep it but ensure role/email are aligned.
        if (String(userById.email || '').toLowerCase() !== String(normalizedEmail).toLowerCase()) {
          throw new ConflictError('Auth user id is already linked to a different email in app users table');
        }

        const { data: updated, error: updateErr } = await supabase
          .from('users')
          .update({ email: normalizedEmail, role, updated_at: new Date().toISOString() })
          .eq('id', authUserId)
          .select()
          .single();

        if (updateErr) {
          throw new InternalServerError(`Failed to update existing user record: ${updateErr.message}`);
        }

        newUser = updated;
      } else {
        const { data: inserted, error: insertError } = await supabase
          .from('users')
          .insert([{
            id: authUserId,
            email: normalizedEmail,
            role,
            employee_id: null,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            last_login: null
          }])
          .select()
          .single();

        if (insertError) {
          throw new InternalServerError(`Failed to create user record: ${insertError.message}`);
        }

        newUser = inserted;
      }
    }

    createdUserId = newUser.id;

    // Prevent duplicate employee records for the same user.
    {
      const { data: existingEmployee, error: existingEmployeeError } = await supabase
        .from('employees')
        .select('id, employee_id, user_id')
        .eq('user_id', createdUserId)
        .maybeSingle();

      if (existingEmployeeError) {
        throw new InternalServerError(`Failed to check existing employee record: ${existingEmployeeError.message}`);
      }
      if (existingEmployee) {
        throw new ConflictError(`Employee already exists for this account (${existingEmployee.employee_id})`);
      }
    }

    // verify department and position exist
    const [deptResult, posResult] = await Promise.all([
      supabase.from('departments').select('id').eq('id', department_id).single(),
      supabase.from('positions').select('id').eq('id', position_id).single()
    ]);

    if (deptResult.error || !deptResult.data) {
      throw new InternalServerError('Department not found');
    }
    if (posResult.error || !posResult.data) {
      throw new InternalServerError('Position not found');
    }

    // create employee record using supabase RPC function
    const { data: newEmployee, error: employeeError } = await supabase
      .rpc('create_new_employee', {
        p_user_id: createdUserId,
        p_first_name: first_name,
        p_middle_name: middle_name || null,
        p_last_name: last_name,
        p_birth_date: birth_date,
        p_phone_number: phone_number,
        p_address: address,
        p_emergency_contact_name: emergency_contact_name,
        p_emergency_contact_number: emergency_contact_number,
        p_hire_date: hire_date,
        p_position_id: position_id,
        p_department_id: department_id,
        p_employment_status: employment_status,
        p_personnel_type: personnel_type
      })
      .single();

    if (employeeError) {
      throw new InternalServerError(`Failed to create employee: ${employeeError.message}`);
    }

    // fetch complete employee record
    const { data: completeEmployee, error: fetchError } = await supabase
      .from('employees')
      .select(`
          id, employee_id, user_id, first_name, middle_name, last_name,
          birth_date, phone_number, address, emergency_contact_name,
          emergency_contact_number, hire_date, employment_status, personnel_type,
          created_at, updated_at,
          departments (id, department_name),
          positions (id, position_title)
        `)
      .eq('id', newEmployee.id)
      .single();

    if (fetchError) {
      throw new InternalServerError('Employee created but failed to fetch details');
    }

    // update user with employee_id (AC-00001)
    await supabase
      .from('users')
      .update({ employee_id: completeEmployee.employee_id })
      .eq('id', createdUserId);

    // Set the initial password to the generated employee_id.
    // If this fails, treat onboarding as failed so we don't create an unusable account.
    {
      const initialPassword = String(completeEmployee.employee_id || '').trim();
      if (!initialPassword) {
        throw new InternalServerError('Failed to set initial password (missing employee_id)');
      }
      const { error: updateAuthError } = await supabase.auth.admin.updateUserById(authUserId, {
        password: initialPassword
      });
      if (updateAuthError) {
        throw new InternalServerError(`Failed to set initial password: ${updateAuthError.message}`);
      }

      // Best-effort: email the user their initial credentials.
      const frontendBase = getFrontendBaseUrl();
      const loginUrl = frontendBase ? `${frontendBase}/login` : '';
      const recipientName = `${String(completeEmployee.first_name || '').trim()} ${String(completeEmployee.last_name || '').trim()}`.trim();

      const logoAttachment = await getEmailLogoAttachment();
      const logoSrc = logoAttachment ? `cid:${LOGO_CID}` : undefined;
      const effectiveDate = new Date().toISOString();

      const subject = 'WDCAP HRIS — Account Created';
      const text = [
        `Dear ${recipientName || 'Sir/Ma\u2019am'},`,
        '',
        'Your WDCAP HRIS account has been created.',
        '',
        `Email: ${normalizedEmail}`,
        `Initial Password: ${initialPassword}`,
        '',
        'Please log in and change your password immediately.',
        loginUrl ? `Login: ${loginUrl}` : null,
      ].filter(Boolean).join('\n');

      const html = buildAccountCreatedEmailHtml({
        recipientName,
        email: normalizedEmail,
        initialPassword,
        loginUrl,
        date: effectiveDate,
        logoSrc
      });

      emailSend = await sendEmail({
        to: normalizedEmail,
        subject,
        text,
        html,
        attachments: logoAttachment ? [logoAttachment] : undefined
      });

      if (emailSend?.skipped) {
        logger.warn('Onboarding email skipped (SMTP not configured or no recipient).');
      } else if (emailSend?.error) {
        logger.warn(`Onboarding email returned error: ${emailSend.error}`);
      }
    }

    // log to audit_logs
    await supabase.from('audit_logs').insert([
      {
        user_id: createdUserId,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'users',
        record_id: createdUserId,
        new_values: { email: normalizedEmail, role },
        timestamp: new Date().toISOString()
      },
      {
        user_id: createdUserId,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'employees',
        record_id: completeEmployee.id,
        new_values: completeEmployee,
        timestamp: new Date().toISOString()
      }
    ]);

    // create onboarding checklist
    try {
      await createChecklistForEmployee(completeEmployee.id, createdUserId);
    } catch (checklistError) {
      logger.error(`Failed to create checklist: ${checklistError.message}`);
    }

    logger.info(`Employee onboarded successfully: ${completeEmployee.employee_id} - ${normalizedEmail}`);

    return {
      user: {
        id: newUser.id,
        email: newUser.email,
        role: newUser.role
      },
      employee: completeEmployee,
      email: emailSend
    };

  } catch (error) {
    // if anything fails, clean up what was created
    logger.error('Onboarding failed, attempting rollback:', error);

    // delete employee if it was created
    if (createdUserId) {
      try {
        await supabase.from('employees').delete().eq('user_id', createdUserId);
        logger.info('Rolled back employee record');
      } catch (rollbackError) {
        logger.error('Failed to rollback employee:', rollbackError);
      }
    }

    // rollback to delete user from users table
    if (createdUserId) {
      try {
        await supabase.from('users').delete().eq('id', createdUserId);
        logger.info('Rolled back user record');
      } catch (rollbackError) {
        logger.error('Failed to rollback user record:', rollbackError);
      }
    }

    // rollback to delete auth user
    if (authUserId) {
      try {
        await supabase.auth.admin.deleteUser(authUserId);
        logger.info('Rolled back auth user');
      } catch (rollbackError) {
        logger.error('Failed to rollback auth user:', rollbackError);
      }
    }

    throw error;
  }
};

export const createChecklistForEmployee = async (employeeId, userId) => {
  try {
    const normalizeItemName = (v) => String(v || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

    // Ensure baseline onboarding items exist and have correct defaults.
    await ensureDefault201OnboardingItems();

    const { data: items, error: fetchError } = await supabase
      .from('onboarding_items')
      .select('id, item_name, is_required_by_default')
      .order('display_order', { ascending: true });

    if (fetchError) {
      throw new InternalServerError(fetchError.message);
    }

    const filteredItems = (items || []).filter((it) => normalizeItemName(it?.item_name) !== normalizeItemName('Others'));

    if (!filteredItems || filteredItems.length === 0) {
      logger.info(`No onboarding items found to create checklist for employee ${employeeId}`);
      return [];
    }

    const checklistItems = filteredItems.map(item => ({
      employee_id: employeeId,
      checklist_item_id: item.id,
      is_required: item.is_required_by_default,
      status: ONBOARDING_STATUSES.PENDING
    }));

    const { data: createdItems, error: insertError } = await supabase
      .from('onboarding_checklists')
      .insert(checklistItems)
      .select();

    if (insertError) {
      throw new InternalServerError(insertError.message);
    }

    if (userId) {
      await supabase.from('audit_logs').insert({
        user_id: userId,
        action_type: AUDIT_ACTIONS.CREATE,
        table_name: 'onboarding_checklists',
        record_id: employeeId,
        new_values: { employee_id: employeeId, items_count: createdItems.length },
        timestamp: new Date().toISOString()
      });
    }

    logger.info(`Onboarding checklist created for employee ${employeeId}: ${createdItems.length} items`);

    return createdItems;

  } catch (error) {
    logger.error(`Error creating checklist for employee ${employeeId}:`, error);
    throw error;
  }
};

const normalizeItemKey = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]+/g, '');

// Map common DB variants to the canonical key used by DOCUMENT_TYPES.
const ITEM_KEY_ALIASES = new Map([
  // Some DB rows use "Sinumpaang Salaysay" while the canonical type is "Sumpaang Salaysay".
  [normalizeItemKey('Sinumpaang Salaysay'), normalizeItemKey(DOCUMENT_TYPES.SUMPAANG_SALAYSAY)],
]);

const canonicalizeItemKey = (value) => ITEM_KEY_ALIASES.get(normalizeItemKey(value)) || normalizeItemKey(value);

// Default 201 checklist items (both Regular and Project-Based share these).
// Note: business rule here is "lahat kailangan" (everything listed is required).
const DEFAULT_201_ONBOARDING_ITEMS = [
  { name: DOCUMENT_TYPES.EMPLOYEE_CONTRACT, requiredByDefault: true },
  { name: DOCUMENT_TYPES.APPLICATION_FOR_EMPLOYMENT, requiredByDefault: true },
  { name: DOCUMENT_TYPES.PERSONAL_DATA_SHEET, requiredByDefault: true },
  { name: DOCUMENT_TYPES.EMPLOYEE_PHOTO, requiredByDefault: true },
  { name: DOCUMENT_TYPES.SUMPAANG_SALAYSAY, requiredByDefault: true },
  { name: DOCUMENT_TYPES.WAIVER_OF_MEDICAL_EXAMINATION, requiredByDefault: true },
  { name: DOCUMENT_TYPES.SSS, requiredByDefault: true },
  { name: DOCUMENT_TYPES.PHILHEALTH, requiredByDefault: true },
  { name: DOCUMENT_TYPES.PAG_IBIG, requiredByDefault: true },
  { name: DOCUMENT_TYPES.RESUME_CV, requiredByDefault: true },
  { name: DOCUMENT_TYPES.DIPLOMA, requiredByDefault: true },
  { name: DOCUMENT_TYPES.TOR, requiredByDefault: true },
  { name: DOCUMENT_TYPES.NDA, requiredByDefault: true },
  { name: DOCUMENT_TYPES.DRIVERS_LICENSE, requiredByDefault: true },
  { name: DOCUMENT_TYPES.PRC_ID, requiredByDefault: true },
];

async function ensureDefault201OnboardingItems() {
  const { data: items, error } = await supabase
    .from('onboarding_items')
    .select('id, item_name, is_required_by_default, display_order')
    .order('display_order', { ascending: true });

  if (error) {
    throw new InternalServerError(error.message);
  }

  const existingByKey = new Map();
  let maxDisplayOrder = 0;

  for (const item of items || []) {
    const key = canonicalizeItemKey(item?.item_name);
    if (!existingByKey.has(key)) existingByKey.set(key, item);
    const order = Number(item?.display_order || 0);
    if (order > maxDisplayOrder) maxDisplayOrder = order;
  }

  const inserts = [];
  const updates = [];

  for (const def of DEFAULT_201_ONBOARDING_ITEMS) {
    const key = canonicalizeItemKey(def.name);
    const existing = existingByKey.get(key);
    if (!existing) {
      maxDisplayOrder += 1;
      inserts.push({
        item_name: def.name,
        is_required_by_default: def.requiredByDefault,
        display_order: maxDisplayOrder
      });
      continue;
    }

    const patch = {};
    if (String(existing.item_name || '') !== String(def.name || '')) patch.item_name = def.name;
    if (existing.is_required_by_default !== def.requiredByDefault) patch.is_required_by_default = def.requiredByDefault;
    if (existing.display_order === null || existing.display_order === undefined) {
      maxDisplayOrder += 1;
      patch.display_order = maxDisplayOrder;
    }

    if (Object.keys(patch).length) updates.push({ id: existing.id, patch });
  }

  // Ensure "Others" is not required by default.
  const othersExisting = existingByKey.get(canonicalizeItemKey(DOCUMENT_TYPES.OTHERS));
  if (othersExisting && othersExisting.is_required_by_default) {
    updates.push({ id: othersExisting.id, patch: { is_required_by_default: false } });
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from('onboarding_items').insert(inserts);
    if (insertError) throw new InternalServerError(insertError.message);
  }

  if (updates.length) {
    const results = await Promise.all(
      updates.map(({ id, patch }) => supabase.from('onboarding_items').update(patch).eq('id', id))
    );
    const firstError = results.find(r => r?.error)?.error;
    if (firstError) throw new InternalServerError(firstError.message);
  }

  // Enforce the rule: everything (except Others) is required-by-default.
  {
    const { error: requireAllError } = await supabase
      .from('onboarding_items')
      .update({ is_required_by_default: true })
      .neq('item_name', DOCUMENT_TYPES.OTHERS);

    if (requireAllError) throw new InternalServerError(requireAllError.message);
  }

  const { data: refreshedItems, error: refreshError } = await supabase
    .from('onboarding_items')
    .select('id, item_name, is_required_by_default, display_order')
    .order('display_order', { ascending: true });

  if (refreshError) {
    throw new InternalServerError(refreshError.message);
  }

  const byKey = new Map();
  for (const item of refreshedItems || []) {
    const key = canonicalizeItemKey(item?.item_name);
    if (!byKey.has(key)) byKey.set(key, item);
  }

  return { items: refreshedItems || [], byKey };
}

const ensureEmployeeChecklistUpToDateWithItems = async (employeeId, actorUserId, onboardingItems) => {
  const { data: existing, error } = await supabase
    .from('onboarding_checklists')
    .select(`
      id,
      employee_id,
      checklist_item_id,
      is_required,
      status,
      document_id,
      onboarding_items (
        id,
        item_name,
        display_order,
        is_required_by_default
      )
    `)
    .eq('employee_id', employeeId);

  if (error) throw new InternalServerError(error.message);

  const rows = existing || [];
  if (rows.length === 0) {
    await createChecklistForEmployee(employeeId, actorUserId);
    return { created: true, inserted: 0, updated: 0 };
  }

  const rowsByChecklistItemId = new Map();
  for (const row of rows) {
    const key = row?.checklist_item_id;
    if (!key) continue;
    if (!rowsByChecklistItemId.has(key)) rowsByChecklistItemId.set(key, []);
    rowsByChecklistItemId.get(key).push(row);
  }

  const inserts = [];
  const updates = [];

  const allItems = onboardingItems || [];
  for (const item of allItems) {
    if (!item?.id) continue;

    const isOthers = canonicalizeItemKey(item?.item_name) === canonicalizeItemKey(DOCUMENT_TYPES.OTHERS);
    const matchingRows = rowsByChecklistItemId.get(item.id) || [];

    if (matchingRows.length === 0) {
      // Always create missing rows so progress includes newly added onboarding items.
      inserts.push({
        employee_id: employeeId,
        checklist_item_id: item.id,
        is_required: !isOthers,
        status: ONBOARDING_STATUSES.PENDING
      });
      continue;
    }

    if (isOthers) {
      for (const r of matchingRows) {
        if (r?.is_required !== false) updates.push({ id: r.id, patch: { is_required: false } });
      }
      continue;
    }

    // Everything else is required.
    const sorted = [...matchingRows].sort((a, b) => {
      const aHasDoc = a?.document_id ? 0 : 1;
      const bHasDoc = b?.document_id ? 0 : 1;
      if (aHasDoc !== bHasDoc) return aHasDoc - bHasDoc;
      const ao = Number(a?.onboarding_items?.display_order || 0);
      const bo = Number(b?.onboarding_items?.display_order || 0);
      if (ao !== bo) return ao - bo;
      return String(a?.id || '').localeCompare(String(b?.id || ''));
    });

    const keep = sorted[0];
    if (keep?.id && keep.is_required === false) updates.push({ id: keep.id, patch: { is_required: true } });

    for (const dupe of sorted.slice(1)) {
      if (!dupe?.id) continue;
      if (dupe.is_required !== false) updates.push({ id: dupe.id, patch: { is_required: false } });
    }
  }

  if (inserts.length) {
    const { error: insertError } = await supabase.from('onboarding_checklists').insert(inserts);
    if (insertError) throw new InternalServerError(insertError.message);
  }

  if (updates.length) {
    const results = await Promise.all(
      updates.map(({ id, patch }) => supabase.from('onboarding_checklists').update(patch).eq('id', id))
    );
    const firstError = results.find(r => r?.error)?.error;
    if (firstError) throw new InternalServerError(firstError.message);
  }

  return { created: false, inserted: inserts.length, updated: updates.length };
};

export const ensureEmployeeChecklistUpToDate = async (employeeId, actorUserId = null) => {
  const { items } = await ensureDefault201OnboardingItems();
  return ensureEmployeeChecklistUpToDateWithItems(employeeId, actorUserId, items);
};

export const getEmployeeChecklist = async (employeeId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
          employee_id,
          id,
          is_required,
          status,
          remarks,
          submitted_at,
          reviewed_at,
          onboarding_items (
            id,
            item_name,
            display_order
          ),
          documents (
            id,
            file_name,
            file_path,
            uploaded_at
          ),
          reviewed_by:users!onboarding_checklists_reviewed_by_fkey (
            id,
            email
          )
        `)
      .eq('employee_id', employeeId)
      .order('onboarding_items(display_order)', { ascending: true });

    if (error) {
      throw new InternalServerError(error.message);
    }

    const checklist = data || [];

    // Reconcile: if user deleted the Drive file externally, reset the item to pending.
    // Note: we only do this when Drive is the active provider to avoid unexpected Drive API calls.
    if (isDriveEnabled()) {
      const candidates = [];
      for (const item of checklist) {
        const filePath = item?.documents?.file_path;
        if (!filePath) continue;

        // Supabase Storage paths typically contain '/'. Drive file IDs typically do not.
        if (String(filePath).includes('/')) continue;
        if (!item?.documents?.id) continue;

        candidates.push({ checklistId: item.id, driveFileId: String(filePath) });
      }

      if (candidates.length) {
        const missingChecklistIds = [];
        // small concurrency cap to avoid hammering Drive
        const concurrency = 5;
        let idx = 0;
        const workers = new Array(Math.min(concurrency, candidates.length)).fill(null).map(async () => {
          while (idx < candidates.length) {
            const current = candidates[idx++];
            try {
              const exists = await driveFileExists(current.driveFileId);
              if (!exists) missingChecklistIds.push(current.checklistId);
            } catch (e) {
              logger.warn(`Drive existence check failed for checklist ${current.checklistId}: ${e?.message || e}`);
            }
          }
        });
        await Promise.all(workers);

        if (missingChecklistIds.length) {
          const nowIso = new Date().toISOString();
          await supabase
            .from('onboarding_checklists')
            .update({
              status: ONBOARDING_STATUSES.PENDING,
              document_id: null,
              submitted_at: null,
              reviewed_at: null,
              reviewed_by: null,
              updated_at: nowIso
            })
            .in('id', missingChecklistIds);

          for (const item of checklist) {
            if (!missingChecklistIds.includes(item.id)) continue;
            item.status = ONBOARDING_STATUSES.PENDING;
            item.document_id = null;
            item.submitted_at = null;
            item.reviewed_at = null;
            item.reviewed_by = null;
            item.documents = null;
          }
        }
      }
    }

    return checklist;

  } catch (error) {
    logger.error(`Error fetching checklist for employee ${employeeId}:`, error);
    throw error;
  }
};

export const getAllChecklists = async (actorUserId = null) => {
  try {
    const { items } = await ensureDefault201OnboardingItems();

    // Ensure checklists exist and include any newly added baseline items.
    // This keeps progress totals consistent for older employees.
    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('id');

    if (employeesError) {
      throw new InternalServerError(employeesError.message);
    }

    const employeeIds = (employees || []).map(e => e?.id).filter(Boolean);
    const concurrency = 10;
    let idx = 0;
    const workers = new Array(Math.min(concurrency, employeeIds.length)).fill(null).map(async () => {
      while (idx < employeeIds.length) {
        const id = employeeIds[idx++];
        try {
          await ensureEmployeeChecklistUpToDateWithItems(id, actorUserId, items);
        } catch (e) {
          logger.warn(`Checklist reconcile failed for employee ${id}: ${e?.message || e}`);
        }
      }
    });
    await Promise.all(workers);

    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
        id,
        employee_id,
        is_required,
        status,
        remarks,
        submitted_at,
        reviewed_at,
        employees (
          id,
          employee_id,
          first_name,
          last_name,
          hire_date,
          personnel_type
        ),
        onboarding_items (
          id,
          item_name
        ),
        documents (
          id,
          file_name,
          file_path,
          uploaded_at
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw new InternalServerError(error.message);
    }

    const checklists = data || [];

    // Same reconciliation for the admin/HR list.
    // Capped to reduce latency: only check a limited number of Drive-backed items per request.
    if (isDriveEnabled()) {
      const candidates = [];
      for (const item of checklists) {
        const filePath = item?.documents?.file_path;
        if (!filePath) continue;
        if (String(filePath).includes('/')) continue;
        if (!item?.documents?.id) continue;
        candidates.push({ checklistId: item.id, driveFileId: String(filePath) });
        if (candidates.length >= 50) break;
      }

      if (candidates.length) {
        const missingChecklistIds = [];
        const concurrency = 5;
        let idx = 0;
        const workers = new Array(Math.min(concurrency, candidates.length)).fill(null).map(async () => {
          while (idx < candidates.length) {
            const current = candidates[idx++];
            try {
              const exists = await driveFileExists(current.driveFileId);
              if (!exists) missingChecklistIds.push(current.checklistId);
            } catch (e) {
              logger.warn(`Drive existence check failed for checklist ${current.checklistId}: ${e?.message || e}`);
            }
          }
        });
        await Promise.all(workers);

        if (missingChecklistIds.length) {
          const nowIso = new Date().toISOString();
          await supabase
            .from('onboarding_checklists')
            .update({
              status: ONBOARDING_STATUSES.PENDING,
              document_id: null,
              submitted_at: null,
              reviewed_at: null,
              reviewed_by: null,
              updated_at: nowIso
            })
            .in('id', missingChecklistIds);

          for (const item of checklists) {
            if (!missingChecklistIds.includes(item.id)) continue;
            item.status = ONBOARDING_STATUSES.PENDING;
            item.document_id = null;
            item.submitted_at = null;
            item.reviewed_at = null;
            item.reviewed_by = null;
            item.documents = null;
          }
        }
      }
    }

    return checklists;

  } catch (error) {
    logger.error('Error fetching all checklists:', error);
    throw error;
  }
};

export const getChecklistItemById = async (checklistId) => {
  try {
    const { data, error } = await supabase
      .from('onboarding_checklists')
      .select(`
          id,
          employee_id,
          is_required,
          status,
          remarks,
          submitted_at,
          reviewed_at,
          onboarding_items (
            id,
            item_name
          ),
          documents (
            id,
            file_name,
            file_url
          )
        `)
      .eq('id', checklistId)
      .single();

    if (error || !data) {
      throw new NotFoundError('Checklist item not found');
    }

    return data;

  } catch (error) {
    logger.error(`Error fetching checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const updateChecklistItem = async (checklistId, updates, userId) => {
  try {
    // fetch existing checklist item with relations
    const { data: existingItem, error: fetchError } = await supabase
      .from('onboarding_checklists')
      .select(checklistFields)
      .eq('id', checklistId)
      .single();

    if (fetchError || !existingItem) {
      throw new NotFoundError('Checklist item not found');
    }

    const { data, error } = await supabase
      .from('onboarding_checklists')
      .update({
        ...updates,
        updated_at: new Date().toISOString()
      })
      .eq('id', checklistId)
      .select(checklistFields)
      .single();

    if (error) {
      throw new InternalServerError(error.message);
    }

    await supabase.from('audit_logs').insert({
      user_id: userId,
      action_type: AUDIT_ACTIONS.UPDATE,
      table_name: 'onboarding_checklists',
      record_id: checklistId,
      old_values: existingItem,
      new_values: data,
      timestamp: new Date().toISOString()
    });

    logger.info(`Checklist item updated: ${checklistId}`);

    return data;

  } catch (error) {
    logger.error(`Error updating checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const submitDocument = async (checklistId, documentId, userId) => {
  try {
    const { data: document, error: docError } = await supabase
      .from('documents')
      .select('id')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      throw new NotFoundError('Document not found');
    }

    const updates = {
      document_id: documentId,
      status: ONBOARDING_STATUSES.SUBMITTED,
      submitted_at: new Date().toISOString()
    };

    return await updateChecklistItem(checklistId, updates, userId);

  } catch (error) {
    logger.error(`Error submitting document for checklist item ${checklistId}:`, error);
    throw error;
  }
};

export const reviewSubmission = async (checklistId, status, remarks, reviewerId) => {
  try {
    const updates = {
      status,
      remarks: remarks || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: reviewerId
    };

    return await updateChecklistItem(checklistId, updates, reviewerId);

  } catch (error) {
    logger.error(`Error reviewing checklist item ${checklistId}:`, error);
    throw error;
  }
};

const buildMissingDocsReminderEmailHtml = ({ recipientName, employeeCode, missing = [], needsReupload = [], checklistUrl, date, logoSrc }) => {
  const safeRecipient = String(recipientName || 'Sir/Ma\u2019am');
  const safeEmployeeCode = String(employeeCode || '').trim();
  const dateLine = formatLetterDate(date);

  const frontendBase = getFrontendBaseUrl();
  const logoUrl = frontendBase ? `${frontendBase}/arise-logo-login.png` : '';
  const effectiveLogoSrc = logoSrc || logoUrl;

  const safeChecklistUrl = String(checklistUrl || '').trim();
  const safeMissing = Array.isArray(missing) ? missing.filter(Boolean) : [];
  const safeNeedsReupload = Array.isArray(needsReupload) ? needsReupload.filter(Boolean) : [];

  const confidentiality =
    'Confidentiality Notice: This e-mail communication and any attachments may contain confidential and privileged information for the use of the designated recipient(s). If you are not the intended recipient, any review, disclosure, dissemination, distribution, or copying of this message is prohibited. If you have received this communication in error, please notify the sender immediately by replying to this message and delete it from your computer.';

  const listBlock = (title, items) => {
    const safeTitle = escapeHtml(title);
    if (!items.length) {
      return `
        <div style="margin:10px 0 0;">
          <div style="font-weight:700;color:#111827;margin:0 0 4px;">${safeTitle}</div>
          <div style="color:${WEBSITE_COLORS.gray};font-size:13px;">None</div>
        </div>
      `;
    }

    const li = items.map(x => `<li style="margin:4px 0;">${escapeHtml(x)}</li>`).join('');
    return `
      <div style="margin:10px 0 0;">
        <div style="font-weight:700;color:#111827;margin:0 0 6px;">${safeTitle}</div>
        <ul style="margin:0;padding-left:18px;color:#111827;font-size:13px;line-height:1.6;">${li}</ul>
      </div>
    `;
  };

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
                        201 FILES REMINDER
                      </div>
                    </td>
                    <td align="right" style="padding:0;">
                      <div style="display:inline-block;background:${WEBSITE_COLORS.mustard};color:#ffffff;font-weight:700;font-size:12px;letter-spacing:0.06em;border-radius:999px;padding:6px 10px;">
                        ACTION REQUIRED
                      </div>
                    </td>
                  </tr>
                </table>

                ${dateLine ? `<div style="font-size:12px;color:#6b7280;margin-top:6px;">${escapeHtml(dateLine)}</div>` : ''}

                <div style="height:1px;background:#f3f4f6;margin:14px 0 14px;"></div>

                <p style="margin:0 0 10px;font-size:14px;color:#111827;">Dear <b>${escapeHtml(safeRecipient)}</b>,</p>

                <p style="margin:0 0 12px;font-size:14px;line-height:1.6;color:#111827;">
                  This is a reminder regarding your required 201 files${safeEmployeeCode ? ` for <b>${escapeHtml(safeEmployeeCode)}</b>` : ''}. Please upload the missing documents and re-upload any rejected documents.
                </p>

                ${listBlock('Missing Required Documents', safeMissing)}
                ${listBlock('Needs Re-upload (Rejected)', safeNeedsReupload)}

                ${safeChecklistUrl ? `
                  <div style="text-align:center;margin:18px 0 18px;">
                    <a href="${escapeHtml(safeChecklistUrl)}" style="display:inline-block;background:${WEBSITE_COLORS.red};color:#ffffff;text-decoration:none;font-weight:700;border-radius:10px;padding:12px 16px;font-size:14px;">
                      Open 201 Files Checklist
                    </a>
                  </div>
                ` : ''}

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

export const sendMissingDocumentsReminder = async (employeeId, actorUserId = null) => {
  const empId = String(employeeId || '').trim();
  if (!empId) throw new BadRequestError('Employee id is required');

  const { data: employee, error: empErr } = await supabase
    .from('employees')
    .select('id, employee_id, first_name, last_name, user_id')
    .eq('id', empId)
    .maybeSingle();

  if (empErr) throw new InternalServerError(empErr.message);
  if (!employee?.id) throw new NotFoundError('Employee not found');

  let checklist = await getEmployeeChecklist(employee.id);
  if (!checklist || checklist.length === 0) {
    await createChecklistForEmployee(employee.id, actorUserId);
    checklist = await getEmployeeChecklist(employee.id);
  }

  const required = (checklist || []).filter((it) => Boolean(it?.is_required));
  const missing = required
    .filter((it) => !it?.document_id && !it?.documents?.file_path)
    .map((it) => it?.onboarding_items?.item_name)
    .filter(Boolean);

  const needsReupload = required
    .filter((it) => String(it?.status) === ONBOARDING_STATUSES.REJECTED)
    .map((it) => it?.onboarding_items?.item_name)
    .filter(Boolean);

  let recipientEmail = '';
  if (employee?.user_id) {
    const { data: userRow } = await supabase
      .from('users')
      .select('email')
      .eq('id', employee.user_id)
      .maybeSingle();
    recipientEmail = String(userRow?.email || '').trim();
  }

  const checklistUrl = (() => {
    const base = getFrontendBaseUrl();
    if (!base) return '';
    return `${base}/employees/201-files`;
  })();

  const recipientName = [employee?.first_name, employee?.last_name].filter(Boolean).join(' ').trim();
  const subject = `WDCAP HRIS: 201 Files Reminder${employee?.employee_id ? ` (${employee.employee_id})` : ''}`;

  if (!recipientEmail) {
    return {
      employee: { id: employee.id, employee_id: employee.employee_id },
      missing,
      needsReupload,
      email: { skipped: true, reason: 'No employee email on file' }
    };
  }

  if (!missing.length && !needsReupload.length) {
    return {
      employee: { id: employee.id, employee_id: employee.employee_id, email: recipientEmail },
      missing,
      needsReupload,
      email: { skipped: true, reason: 'No missing documents to remind' }
    };
  }

  const html = buildMissingDocsReminderEmailHtml({
    recipientName,
    employeeCode: employee.employee_id,
    missing,
    needsReupload,
    checklistUrl,
    date: new Date(),
  });

  const emailResult = await sendEmail({
    to: recipientEmail,
    subject,
    html,
    text: `Please upload missing 201 files. Missing: ${missing.join(', ')}. Needs re-upload: ${needsReupload.join(', ')}.`
  });

  const normalizedEmailResult = emailResult?.skipped
    ? { ...emailResult, reason: emailResult?.reason || 'SMTP not configured' }
    : emailResult;

  return {
    employee: { id: employee.id, employee_id: employee.employee_id, email: recipientEmail },
    missing,
    needsReupload,
    email: normalizedEmailResult
  };
};
