import { Router } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../db/pool.js';
import { requireTeacher, requireStudent } from '../middleware/auth.js';
import { makeRoomCode, makeSessionToken, parseJsonField } from '../util.js';

const router = Router();
const PIN_PATTERN = /^\d{4,6}$/;
const PIN_FAIL_LIMIT = 5;
const PIN_COOLDOWN_MS = 60 * 1000;
const failedPinAttempts = new Map();

function csvCell(value) {
  const normalized = value == null ? '' : String(value);
  if (/[",\r\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }
  return normalized;
}

function csvRow(values) {
  return `${values.map(csvCell).join(',')}\r\n`;
}

function getClientIp(req) {
  return req.ip || req.socket?.remoteAddress || 'unknown';
}

function makeFailedPinKey(classroomId, alias, clientIp) {
  return `${classroomId}:${alias}:${clientIp}`;
}

function getActivePinCooldown(key, now = Date.now()) {
  const attempt = failedPinAttempts.get(key);
  if (!attempt) return null;

  if (attempt.lockedUntil && attempt.lockedUntil > now) {
    return attempt.lockedUntil;
  }

  if (attempt.lockedUntil && attempt.lockedUntil <= now) {
    failedPinAttempts.delete(key);
  }

  return null;
}

function recordFailedPinAttempt(key, now = Date.now()) {
  const previous = failedPinAttempts.get(key);
  const count = (previous?.count || 0) + 1;
  failedPinAttempts.set(key, {
    count,
    lockedUntil: count >= PIN_FAIL_LIMIT ? now + PIN_COOLDOWN_MS : null,
  });
}

router.post('/', requireTeacher, async (req, res) => {
  try {
    const title = String(req.body.title || 'Meine Klasse').trim().slice(0, 200);
    const scenarioId = req.body.scenarioId ? String(req.body.scenarioId).slice(0, 64) : null;
    const expiresAt = req.body.expiresAt || null;

    let roomCode = makeRoomCode();
    for (let i = 0; i < 5; i++) {
      const clash = await query('SELECT id FROM classrooms WHERE room_code = ? LIMIT 1', [
        roomCode,
      ]);
      if (!clash.length) break;
      roomCode = makeRoomCode();
    }

    const result = await query(
      `INSERT INTO classrooms (teacher_id, room_code, title, scenario_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [req.teacher.teacherId, roomCode, title, scenarioId, expiresAt]
    );

    res.status(201).json({
      classroom: {
        id: result.insertId,
        roomCode,
        title,
        scenarioId,
        expiresAt,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Klassenraum konnte nicht erstellt werden.' });
  }
});

router.get('/mine', requireTeacher, async (req, res) => {
  try {
    const rows = await query(
      `SELECT c.id, c.room_code, c.title, c.scenario_id, c.expires_at, c.created_at,
              (SELECT COUNT(*) FROM memberships m WHERE m.classroom_id = c.id) AS member_count
       FROM classrooms c
       WHERE c.teacher_id = ?
       ORDER BY c.created_at DESC`,
      [req.teacher.teacherId]
    );
    res.json({
      classrooms: rows.map((r) => ({
        id: r.id,
        roomCode: r.room_code,
        title: r.title,
        scenarioId: r.scenario_id,
        expiresAt: r.expires_at,
        createdAt: r.created_at,
        memberCount: Number(r.member_count),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Klassenräume laden fehlgeschlagen.' });
  }
});

router.delete('/:id', requireTeacher, async (req, res) => {
  try {
    const classroomId = Number(req.params.id);
    if (!Number.isInteger(classroomId) || classroomId <= 0) {
      return res.status(404).json({ error: 'Klasse nicht gefunden.' });
    }

    const rooms = await query('SELECT id, teacher_id FROM classrooms WHERE id = ? LIMIT 1', [
      classroomId,
    ]);
    if (!rooms.length) return res.status(404).json({ error: 'Klasse nicht gefunden.' });
    if (Number(rooms[0].teacher_id) !== Number(req.teacher.teacherId)) {
      return res.status(403).json({ error: 'Du kannst nur eigene Klassen löschen.' });
    }

    await query('DELETE FROM classrooms WHERE id = ? AND teacher_id = ?', [
      classroomId,
      req.teacher.teacherId,
    ]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Klasse konnte nicht gelöscht werden.' });
  }
});

router.post('/join', async (req, res) => {
  try {
    const roomCode = String(req.body.roomCode || '')
      .trim()
      .toUpperCase();
    const alias = String(req.body.alias || '')
      .trim()
      .slice(0, 80);
    const pin = String(req.body.pin || '').trim();

    if (!roomCode || alias.length < 2) {
      return res.status(400).json({ error: 'Raumcode und Alias (mind. 2 Zeichen) nötig.' });
    }

    const rooms = await query(
      'SELECT id, room_code, title, scenario_id, expires_at FROM classrooms WHERE room_code = ? LIMIT 1',
      [roomCode]
    );
    if (!rooms.length) {
      return res.status(404).json({ error: 'Raumcode unbekannt.' });
    }
    const room = rooms[0];
    if (room.expires_at && new Date(room.expires_at) < new Date()) {
      return res.status(410).json({ error: 'Dieser Klassenraum ist abgelaufen.' });
    }

    const memberships = await query(
      `SELECT id, pin_hash, session_token
       FROM memberships
       WHERE classroom_id = ? AND alias = ?
       LIMIT 1`,
      [room.id, alias]
    );

    const sessionToken = makeSessionToken();
    const existingMembership = memberships[0];

    if (existingMembership) {
      if (!pin) {
        return res.status(401).json({
          error: 'Dieser Alias existiert bereits. Bitte gib deine PIN ein.',
          needsPin: true,
        });
      }

      const failedPinKey = makeFailedPinKey(room.id, alias, getClientIp(req));
      const lockedUntil = getActivePinCooldown(failedPinKey);
      if (lockedUntil) {
        const retryAfterSeconds = Math.ceil((lockedUntil - Date.now()) / 1000);
        return res
          .set('Retry-After', String(retryAfterSeconds))
          .status(429)
          .json({
            error: 'PIN wurde zu oft falsch eingegeben. Bitte warte 60 Sekunden und versuche es erneut.',
          });
      }

      const pinOk =
        existingMembership.pin_hash && (await bcrypt.compare(pin, existingMembership.pin_hash));
      if (!pinOk) {
        recordFailedPinAttempt(failedPinKey);
        return res.status(401).json({
          error: 'PIN stimmt nicht. Bitte prüfe Alias und PIN.',
          needsPin: true,
        });
      }

      failedPinAttempts.delete(failedPinKey);

      await query('UPDATE memberships SET session_token = ?, last_seen_at = NOW() WHERE id = ?', [
        sessionToken,
        existingMembership.id,
      ]);

      return res.json({
        sessionToken,
        membershipId: existingMembership.id,
        classroom: {
          id: room.id,
          roomCode: room.room_code,
          title: room.title,
          scenarioId: room.scenario_id,
        },
        alias,
      });
    }

    if (!PIN_PATTERN.test(pin)) {
      return res.status(400).json({ error: 'PIN muss aus 4 bis 6 Ziffern bestehen.' });
    }

    const pinHash = await bcrypt.hash(pin, 10);
    const inserted = await query(
      `INSERT INTO memberships (classroom_id, alias, session_token, pin_hash, last_seen_at)
       VALUES (?, ?, ?, ?, NOW())`,
      [room.id, alias, sessionToken, pinHash]
    );
    const membershipId = inserted.insertId;

    try {
      await query('INSERT INTO game_runs (membership_id, current_age, is_game_over) VALUES (?, 16, 0)', [
        membershipId,
      ]);
    } catch (err) {
      if (err && err.code === 'ER_DUP_ENTRY') {
        // Defensive only: membership lookup above should prevent duplicate game runs.
      } else {
        throw err;
      }
    }

    res.status(201).json({
      sessionToken,
      membershipId,
      classroom: {
        id: room.id,
        roomCode: room.room_code,
        title: room.title,
        scenarioId: room.scenario_id,
      },
      alias,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Beitritt fehlgeschlagen.' });
  }
});

router.get('/:id/export.csv', requireTeacher, async (req, res) => {
  try {
    const classroomId = Number(req.params.id);
    if (!Number.isInteger(classroomId) || classroomId <= 0) {
      return res.status(404).json({ error: 'Klasse nicht gefunden.' });
    }

    const rooms = await query(
      'SELECT id, teacher_id, title FROM classrooms WHERE id = ? LIMIT 1',
      [classroomId]
    );
    if (!rooms.length) return res.status(404).json({ error: 'Klasse nicht gefunden.' });
    if (Number(rooms[0].teacher_id) !== Number(req.teacher.teacherId)) {
      return res.status(403).json({ error: 'Du kannst nur eigene Klassen exportieren.' });
    }

    const members = await query(
      `SELECT m.alias, m.last_seen_at, g.current_age, g.is_game_over, g.overall_score, g.updated_at
       FROM memberships m
       LEFT JOIN game_runs g ON g.membership_id = m.id
       WHERE m.classroom_id = ?
       ORDER BY m.alias ASC`,
      [classroomId]
    );

    const header = csvRow(['alias', 'age', 'isGameOver', 'overallScore', 'lastSeenAt', 'updatedAt']);
    const rows = members
      .map((m) =>
        csvRow([
          m.alias,
          m.current_age,
          Boolean(m.is_game_over),
          m.overall_score,
          m.last_seen_at,
          m.updated_at,
        ])
      )
      .join('');

    res
      .status(200)
      .set('Content-Type', 'text/csv; charset=utf-8')
      .set('Content-Disposition', `attachment; filename="classroom-${classroomId}-export.csv"`)
      .send(`\uFEFF${header}${rows}`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'CSV-Export fehlgeschlagen.' });
  }
});

router.get('/:id/summary', requireTeacher, async (req, res) => {
  try {
    const classroomId = Number(req.params.id);
    const rooms = await query(
      'SELECT id, room_code, title, scenario_id, expires_at FROM classrooms WHERE id = ? AND teacher_id = ? LIMIT 1',
      [classroomId, req.teacher.teacherId]
    );
    if (!rooms.length) return res.status(404).json({ error: 'Klasse nicht gefunden.' });

    const members = await query(
      `SELECT m.id, m.alias, g.id AS run_id, g.current_age, g.is_game_over, g.overall_score,
              g.game_state, e.grade, e.certificate_json
       FROM memberships m
       LEFT JOIN game_runs g ON g.membership_id = m.id
       LEFT JOIN evaluations e ON e.game_run_id = g.id
       WHERE m.classroom_id = ?`,
      [classroomId]
    );

    const finished = members.filter((m) => m.is_game_over && m.overall_score != null);
    const avgScore =
      finished.length > 0
        ? Math.round(
            finished.reduce((sum, m) => sum + Number(m.overall_score), 0) / finished.length
          )
        : null;

    let withHaftpflicht = 0;
    let withDebtTrap = 0;
    const choiceCounts = {};

    for (const m of members) {
      const state = parseJsonField(m.game_state);
      if (!state) continue;
      if (state.insurances?.some((i) => i.type === 'HAFTPFLICHT' && i.isActive)) {
        withHaftpflicht += 1;
      }
      const hasBadDebt =
        (state.loans || []).some((l) => l.type !== 'IMMOBILIENDARLEHEN' && l.principalRemaining > 0) ||
        (state.bankAccount?.giroBalance ?? 0) < 0;
      if (!hasBadDebt) withDebtTrap += 1;
      for (const pe of state.pastEvents || []) {
        const key = `${pe.eventTitle || pe.eventId}: ${pe.choiceLabel || pe.choiceId}`;
        choiceCounts[key] = (choiceCounts[key] || 0) + 1;
      }
    }

    const topChoices = Object.entries(choiceCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));

    const gradeFromScore = (score) => {
      if (score == null) return null;
      if (score >= 90) return 'A+';
      if (score >= 80) return 'A';
      if (score >= 70) return 'B';
      if (score >= 60) return 'C';
      if (score >= 50) return 'D';
      return 'F';
    };

    res.json({
      classroom: {
        id: rooms[0].id,
        roomCode: rooms[0].room_code,
        title: rooms[0].title,
        scenarioId: rooms[0].scenario_id,
        expiresAt: rooms[0].expires_at,
      },
      summary: {
        memberCount: members.length,
        finishedCount: finished.length,
        averageScore: avgScore,
        averageGrade: gradeFromScore(avgScore),
        haftpflichtSharePercent:
          members.length > 0 ? Math.round((withHaftpflicht / members.length) * 100) : 0,
        debtTrapAvoidedPercent:
          members.length > 0 ? Math.round((withDebtTrap / members.length) * 100) : 0,
        topChoices,
      },
      members: members.map((m) => ({
        alias: m.alias,
        runId: m.run_id,
        currentAge: m.current_age,
        isGameOver: Boolean(m.is_game_over),
        overallScore: m.overall_score,
        grade: m.grade || gradeFromScore(m.overall_score),
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Summary fehlgeschlagen.' });
  }
});

router.get('/:id/certificate/:runId', requireTeacher, async (req, res) => {
  try {
    const classroomId = Number(req.params.id);
    const runId = Number(req.params.runId);

    const rows = await query(
      `SELECT m.alias, e.overall_score, e.grade, e.certificate_json, e.dimensions_json
       FROM game_runs g
       JOIN memberships m ON m.id = g.membership_id
       JOIN classrooms c ON c.id = m.classroom_id
       LEFT JOIN evaluations e ON e.game_run_id = g.id
       WHERE g.id = ? AND c.id = ? AND c.teacher_id = ?
       LIMIT 1`,
      [runId, classroomId, req.teacher.teacherId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Zertifikat nicht gefunden.' });

    const row = rows[0];
    res.json({
      alias: row.alias,
      overallScore: row.overall_score,
      grade: row.grade,
      certificate: parseJsonField(row.certificate_json),
      dimensions: parseJsonField(row.dimensions_json),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Zertifikat laden fehlgeschlagen.' });
  }
});

// Keep unused import used for student middleware re-export convenience in runs
void requireStudent;

export default router;
