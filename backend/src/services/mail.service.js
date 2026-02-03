import nodemailer from 'nodemailer';
import logger from '../utils/logger.js';

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

  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  if (!recipients.length) {
    console.log('[MAIL SERVICE] No recipients provided');
    return { skipped: true };
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
