import crypto from 'crypto';
import nodemailer from 'nodemailer';

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

export function createRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function smtpConfigured() {
  if (process.env.SMTP_TRANSPORT === 'sendmail') return true;
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  if (!smtpConfigured()) {
    return null;
  }

  // Plesk: pipe via local sendmail/postfix (often most reliable on the same host)
  if (process.env.SMTP_TRANSPORT === 'sendmail') {
    return nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: process.env.SENDMAIL_PATH || '/usr/sbin/sendmail',
    });
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const ignoreTls =
    process.env.SMTP_IGNORE_TLS === 'true' ||
    port === 25 ||
    ['localhost', '127.0.0.1'].includes(String(process.env.SMTP_HOST || '').toLowerCase());
  const strictTls = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true';

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    ignoreTLS: ignoreTls && process.env.SMTP_SECURE !== 'true',
    requireTLS: process.env.SMTP_REQUIRE_TLS === 'true',
    tls: {
      rejectUnauthorized: strictTls,
    },
    connectionTimeout: Number(process.env.SMTP_CONNECTION_TIMEOUT || 15000),
    greetingTimeout: Number(process.env.SMTP_GREETING_TIMEOUT || 15000),
  });
}

export async function sendMail({ to, subject, text, html }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER || 'noreply@localhost';
  const transport = createTransport();

  if (!transport) {
    console.warn('[mail] SMTP not configured – logging email instead');
    console.warn(`[mail] To: ${to}`);
    console.warn(`[mail] Subject: ${subject}`);
    console.warn(`[mail] ${text}`);
    return { logged: true };
  }

  try {
    const info = await transport.sendMail({ from, to, subject, text, html });
    console.log('[mail] sent', { to, messageId: info && info.messageId });
    return { sent: true, messageId: info && info.messageId };
  } catch (err) {
    console.error('[mail] send failed:', err);
    console.warn(`[mail] FALLBACK To: ${to}`);
    console.warn(`[mail] FALLBACK Subject: ${subject}`);
    console.warn(`[mail] FALLBACK ${text}`);
    return { sent: false, error: String(err && err.message ? err.message : err) };
  }
}

export function appPublicUrl() {
  return (process.env.APP_PUBLIC_URL || 'http://localhost:5174').replace(/\/$/, '');
}

export async function sendVerificationEmail(email, rawToken) {
  const link = `${appPublicUrl()}/?verifyTeacher=${encodeURIComponent(rawToken)}`;
  const text = `Willkommen bei GOAL.\n\nBitte bestätige deine E-Mail-Adresse:\n${link}\n\nDer Link ist 48 Stunden gültig.`;
  return sendMail({
    to: email,
    subject: 'GOAL – E-Mail bestätigen',
    text,
    html: `<p>Willkommen bei GOAL.</p><p><a href="${link}">E-Mail bestätigen</a></p><p>Der Link ist 48 Stunden gültig.</p>`,
  });
}

export async function sendPasswordResetEmail(email, rawToken) {
  const link = `${appPublicUrl()}/?resetTeacher=${encodeURIComponent(rawToken)}`;
  const text = `Passwort zurücksetzen für GOAL:\n${link}\n\nDer Link ist 1 Stunde gültig. Wenn du das nicht warst, ignoriere diese Mail.`;
  return sendMail({
    to: email,
    subject: 'GOAL – Passwort zurücksetzen',
    text,
    html: `<p><a href="${link}">Neues Passwort setzen</a></p><p>Der Link ist 1 Stunde gültig.</p>`,
  });
}

/** Used by scripts/mail-test.js */
export async function verifySmtpConnection() {
  const transport = createTransport();
  if (!transport) {
    return { ok: false, error: 'SMTP not configured' };
  }
  try {
    await transport.verify();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: String(err && err.message ? err.message : err) };
  }
}
