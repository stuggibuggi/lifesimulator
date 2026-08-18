import crypto from 'crypto';
import nodemailer from 'nodemailer';

export function hashToken(rawToken) {
  return crypto.createHash('sha256').update(String(rawToken)).digest('hex');
}

export function createRawToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString('hex');
}

function smtpConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

function createTransport() {
  if (!smtpConfigured()) {
    return null;
  }
  // Plesk local SMTP often needs relaxed TLS when host is localhost
  const strictTls = process.env.SMTP_TLS_REJECT_UNAUTHORIZED === 'true';
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: {
      rejectUnauthorized: strictTls,
    },
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
    await transport.sendMail({ from, to, subject, text, html });
    return { sent: true };
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
