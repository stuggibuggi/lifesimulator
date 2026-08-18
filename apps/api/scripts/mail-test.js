/**
 * Test SMTP from the Plesk server.
 * Usage: node scripts/mail-test.js [to@example.com]
 */
import dotenv from 'dotenv';
dotenv.config();

import { sendMail, verifySmtpConnection } from '../src/mail.js';

const to = process.argv[2] || process.env.SMTP_USER;

async function main() {
  console.log('SMTP_TRANSPORT=', process.env.SMTP_TRANSPORT || 'smtp');
  console.log('SMTP_HOST=', process.env.SMTP_HOST);
  console.log('SMTP_PORT=', process.env.SMTP_PORT);
  console.log('SMTP_USER=', process.env.SMTP_USER);
  console.log('MAIL_FROM=', process.env.MAIL_FROM);
  console.log('To=', to);

  const verify = await verifySmtpConnection();
  console.log('verify:', verify);
  if (!verify.ok) {
    process.exitCode = 1;
    return;
  }

  if (!to) {
    console.log('No recipient – skip send. Pass an email: node scripts/mail-test.js you@example.com');
    return;
  }

  const result = await sendMail({
    to,
    subject: 'GOAL – SMTP-Test',
    text: 'Wenn du diese Mail siehst, funktioniert der Versand.',
    html: '<p>Wenn du diese Mail siehst, funktioniert der Versand.</p>',
  });
  console.log('send:', result);
  if (!result.sent && !result.logged) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
