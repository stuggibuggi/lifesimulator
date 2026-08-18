import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { signTeacherToken, requireTeacher } from '../middleware/auth.js';

const router = Router();

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
    const result = await query(
      'INSERT INTO teachers (email, password_hash, display_name) VALUES (?, ?, ?)',
      [email, passwordHash, displayName]
    );

    const teacher = { id: result.insertId, email };
    const token = signTeacherToken(teacher);
    res.status(201).json({ token, teacher: { id: teacher.id, email, displayName } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Registrierung fehlgeschlagen.' });
  }
});

router.post('/teacher/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    const rows = await query(
      'SELECT id, email, password_hash, display_name FROM teachers WHERE email = ? LIMIT 1',
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

router.get('/teacher/me', requireTeacher, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, email, display_name FROM teachers WHERE id = ? LIMIT 1',
      [req.teacher.teacherId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nicht gefunden.' });
    res.json({
      teacher: {
        id: rows[0].id,
        email: rows[0].email,
        displayName: rows[0].display_name,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler.' });
  }
});

export default router;
