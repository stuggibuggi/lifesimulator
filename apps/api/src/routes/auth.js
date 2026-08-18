import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { signTeacherToken, requireTeacher } from '../middleware/auth.js';
import {
  createRawToken,
  hashToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../mail.js';

const router = Router();

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function toMysqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

router.post('/teacher/register', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim() || null;

    if (!email || !email.includes('@') || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'E-Mail und Passwort (mind. 8 Zeichen) erforderlich.' });
    }

    const existing = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'E-Mail bereits registriert.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rawToken = createRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = toMysqlDatetime(hoursFromNow(48));

    await query(
      `INSERT INTO teachers
        (email, password_hash, display_name, verification_token_hash, verification_expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [email, passwordHash, displayName, tokenHash, expiresAt]
    );

    await sendVerificationEmail(email, rawToken);

    res.status(201).json({
      ok: true,
      needsVerification: true,
      message:
        'Konto angelegt. Bitte bestätige deine E-Mail über den Link in der Nachricht, bevor du dich anmeldest.',
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen.' });
  }
});

router.post('/teacher/verify', async (req, res) => {
  try {
    const rawToken = String(req.body.token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ error: 'Token fehlt.' });
    }

    const tokenHash = hashToken(rawToken);
    const rows = await query(
      `SELECT id, email, display_name, verification_expires_at
       FROM teachers
       WHERE verification_token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Bestätigungslink.' });
    }

    const teacher = rows[0];
    if (
      teacher.verification_expires_at &&
      new Date(teacher.verification_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: 'Bestätigungslink abgelaufen. Bitte neu registrieren oder Support fragen.' });
    }

    await query(
      `UPDATE teachers
       SET email_verified_at = NOW(),
           verification_token_hash = NULL,
           verification_expires_at = NULL
       WHERE id = ?`,
      [teacher.id]
    );

    const token = signTeacherToken(teacher);
    res.json({
      ok: true,
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        displayName: teacher.display_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bestätigung fehlgeschlagen.' });
  }
});

router.post('/teacher/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    const rows = await query(
      `SELECT id, email, password_hash, display_name, email_verified_at
       FROM teachers WHERE email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Login fehlgeschlagen.' });
    }

    const teacher = rows[0];
    const ok = await bcrypt.compare(password, teacher.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Login fehlgeschlagen.' });
    }

    if (!teacher.email_verified_at) {
      return res.status(403).json({
        error: 'E-Mail noch nicht bestätigt. Bitte den Link in der Registrierungsmail öffnen.',
        needsVerification: true,
      });
    }

    const token = signTeacherToken(teacher);
    res.json({
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        displayName: teacher.display_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login fehlgeschlagen.' });
  }
});

router.post('/teacher/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    // Always generic OK (no email enumeration)
    const generic = {
      ok: true,
      message:
        'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.',
    };

    if (!email || !email.includes('@')) {
      return res.json(generic);
    }

    const rows = await query(
      'SELECT id, email, email_verified_at FROM teachers WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length && rows[0].email_verified_at) {
      const rawToken = createRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = toMysqlDatetime(hoursFromNow(1));
      await query(
        `UPDATE teachers
         SET reset_token_hash = ?, reset_expires_at = ?
         WHERE id = ?`,
        [tokenHash, expiresAt, rows[0].id]
      );
      await sendPasswordResetEmail(email, rawToken);
    }

    res.json(generic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen.' });
  }
});

router.post('/teacher/reset-password', async (req, res) => {
  try {
    const rawToken = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!rawToken || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Token und neues Passwort (mind. 8 Zeichen) erforderlich.' });
    }

    const tokenHash = hashToken(rawToken);
    const rows = await query(
      `SELECT id, reset_expires_at FROM teachers WHERE reset_token_hash = ? LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Reset-Link.' });
    }

    const teacher = rows[0];
    if (teacher.reset_expires_at && new Date(teacher.reset_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset-Link abgelaufen. Bitte erneut anfordern.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE teachers
       SET password_hash = ?,
           reset_token_hash = NULL,
           reset_expires_at = NULL
       WHERE id = ?`,
      [passwordHash, teacher.id]
    );

    res.json({ ok: true, message: 'Passwort aktualisiert. Du kannst dich jetzt anmelden.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Passwort konnte nicht gesetzt werden.' });
  }
});

router.get('/teacher/me', requireTeacher, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, email, display_name, email_verified_at FROM teachers WHERE id = ? LIMIT 1',
      [req.teacher.teacherId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nicht gefunden.' });
    res.json({
      teacher: {
        id: rows[0].id,
        email: rows[0].email,
        displayName: rows[0].display_name,
        emailVerified: Boolean(rows[0].email_verified_at),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler.' });
  }
});

export default router;
