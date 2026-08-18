import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'dev-insecure-secret';

export function signTeacherToken(teacher) {
  return jwt.sign(
    { role: 'teacher', teacherId: teacher.id, email: teacher.email },
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
