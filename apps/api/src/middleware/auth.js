import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret';

export function signTeacherToken(teacher) {
  return jwt.sign(
    { role: 'teacher', teacherId: teacher.id, email: teacher.email, isAdmin: Boolean(teacher.isAdmin) },
    JWT_SECRET,
    { expiresIn: '7d' }
  );
}

export function requireTeacher(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Lehrer-Login erforderlich.' });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    if (payload.role !== 'teacher') {
      return res.status(403).json({ error: 'Nur für Lehrer.' });
    }
    req.teacher = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Ungültige oder abgelaufene Sitzung.' });
  }
}

export async function requireAdmin(req, res, next) {
  requireTeacher(req, res, async () => {
    try {
      const rows = await query('SELECT id, is_admin FROM teachers WHERE id = ? LIMIT 1', [
        req.teacher.teacherId,
      ]);
      if (!rows.length || !rows[0].is_admin) {
        return res.status(403).json({ error: 'Admin-Rechte erforderlich.' });
      }
      req.teacher.isAdmin = true;
      next();
    } catch (err) {
      console.error(err);
      return res.status(500).json({ error: 'Admin-Prüfung fehlgeschlagen.' });
    }
  });
}

export function requireStudent(req, res, next) {
  const token =
    req.headers['x-student-token'] ||
    (req.headers.authorization?.startsWith('Student ')
      ? req.headers.authorization.slice(8)
      : null);
  if (!token) {
    return res.status(401).json({ error: 'Schüler-Sitzung erforderlich.' });
  }
  req.studentToken = String(token);
  next();
}
