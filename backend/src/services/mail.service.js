import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';
import { supabase } from '../config/supabase.js';
import { EMPLOYMENT_STATUSES } from '../config/constants.js';

const toBool = (v) => {
  if (typeof v === 'boolean') return v;
  if (!v) return false;
  return String(v).trim().toLowerCase() === 'true';
};

const getSmtpConfig = () => {
  // Primary: generic SMTP_* variables
  let host = process.env.SMTP_HOST;
  let port = Number(process.env.SMTP_PORT || 587);
  let user = process.env.SMTP_USER;
  let pass = process.env.SMTP_PASS;
  let secure = typeof process.env.SMTP_SECURE !== 'undefined' ? toBool(process.env.SMTP_SECURE) : port === 465;
  let from = process.env.SMTP_FROM || user;

  // Gmail app passwords are commonly copied with spaces; normalize to avoid auth failures.
  if (typeof pass === 'string') {
    pass = pass.replace(/\s+/g, '');
  }

  // Convenience: Gmail App Password support
  // If SMTP_* is not provided, allow configuring via GMAIL_USER + GMAIL_APP_PASSWORD.
  const gmailUser = process.env.GMAIL_USER;
  const gmailPass = process.env.GMAIL_APP_PASSWORD;
  if (!host && gmailUser && gmailPass) {
    host = 'smtp.gmail.com';
    port = Number(process.env.GMAIL_SMTP_PORT || 465);
    user = gmailUser;
    pass = typeof gmailPass === 'string' ? gmailPass.replace(/\s+/g, '') : gmailPass;
    secure = typeof process.env.GMAIL_SMTP_SECURE !== 'undefined' ? toBool(process.env.GMAIL_SMTP_SECURE) : port === 465;
    from = process.env.GMAIL_FROM || process.env.SMTP_FROM || gmailUser;
  }

  return { host, port, user, pass, secure, from: from || user };
};

const isConfigured = (cfg) => Boolean(cfg.host && cfg.port && cfg.user && cfg.pass && cfg.from);

// Accounts set to INACTIVE (/employees/user-accounts sets employees.employment_status)
// must never get email. Addresses with no user account (e.g. env notification lists) are kept.
// Throws if the lookup fails, so the caller can skip the send instead of risking it.
const removeInactiveRecipients = async (recipients) => {
  const variants = [...new Set(recipients.flatMap((e) => [e, e.toLowerCase()]))];

  const { data: users, error: usersError } = await supabase
    .from('users')
    .select('id, email')
    .in('email', variants);
  if (usersError) throw usersError;
  if (!users?.length) return recipients;

  const { data: inactive, error: empError } = await supabase
    .from('employees')
    .select('user_id')
    .in('user_id', users.map((u) => u.id))
    .eq('employment_status', EMPLOYMENT_STATUSES.INACTIVE);
  if (empError) throw empError;

  const inactiveIds = new Set((inactive || []).map((e) => e.user_id));
  const inactiveEmails = new Set(
    users.filter((u) => inactiveIds.has(u.id)).map((u) => String(u.email).toLowerCase())
  );
  return recipients.filter((e) => !inactiveEmails.has(e.toLowerCase()));
};

let cachedTransport = null;

const getTransport = () => {
  const cfg = getSmtpConfig();
  if (!isConfigured(cfg)) {
    logger.warn('SMTP configuration check failed:', {
      host: cfg.host ? 'SET' : 'MISSING',
      port: cfg.port ? 'SET' : 'MISSING',
      user: cfg.user ? 'SET' : 'MISSING',
      pass: cfg.pass ? 'SET' : 'MISSING',
      from: cfg.from ? 'SET' : 'MISSING'
    });
    return null;
  }

  logger.info('SMTP configured successfully:', {
    host: cfg.host,
    port: cfg.port,
    user: cfg.user,
    from: cfg.from,
    secure: cfg.secure
  });

  if (cachedTransport) return cachedTransport;

  cachedTransport = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.secure,
    auth: {
      user: cfg.user,
      pass: cfg.pass
    }
  });

  return cachedTransport;
};

export const sendEmail = async ({ to, subject, text, html, attachments }) => {
  console.log('[MAIL SERVICE] sendEmail called with subject:', subject);

  const cfg = getSmtpConfig();
  console.log('[MAIL SERVICE] SMTP config:', {
    host: cfg.host ? 'SET' : 'MISSING',
    port: cfg.port || 'MISSING',
    user: cfg.user ? 'SET' : 'MISSING',
    pass: cfg.pass ? 'SET' : 'MISSING',
    from: cfg.from ? 'SET' : 'MISSING'
  });

  const transport = getTransport();

  if (!transport) {
    console.log('[MAIL SERVICE] SMTP not configured - transport is null');
    logger.warn('SMTP not configured; skipping email send');
    return { skipped: true };
  }

  console.log('[MAIL SERVICE] Transport created successfully');

  const requested = (Array.isArray(to) ? to : [to])
    .flatMap((e) => String(e || '').split(','))
    .map((e) => e.trim())
    .filter(Boolean);
  if (!requested.length) {
    console.log('[MAIL SERVICE] No recipients provided');
    return { skipped: true };
  }

  let recipients;
  try {
    recipients = await removeInactiveRecipients(requested);
  } catch (err) {
    logger.error('Could not check recipient account status; skipping email send:', err);
    return { skipped: true, reason: 'Recipient status check failed' };
  }

  if (recipients.length < requested.length) {
    logger.info(`Skipped ${requested.length - recipients.length} inactive recipient(s) for "${subject}"`);
  }
  if (!recipients.length) {
    return { skipped: true, reason: 'All recipients are inactive' };
  }

  console.log('[MAIL SERVICE] Attempting to send email to:', recipients.join(', '));

  try {
    const info = await transport.sendMail({
      from: cfg.from,
      to: recipients.join(','),
      subject,
      text,
      html,
      ...(Array.isArray(attachments) && attachments.length ? { attachments } : {})
    });

    console.log('[MAIL SERVICE] Email sent successfully! MessageId:', info.messageId);
    return { skipped: false, messageId: info.messageId };
  } catch (err) {
    console.log('[MAIL SERVICE] Email send FAILED:', err?.message || String(err));
    logger.error('Failed to send email:', err);
    // Email should not break core workflows
    return { skipped: false, error: err?.message || String(err) };
  }
};
