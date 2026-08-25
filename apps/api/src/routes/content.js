import crypto from 'node:crypto';
import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireAdmin } from '../middleware/auth.js';
import { parseJsonField } from '../util.js';

const router = Router();
const VALID_STATUS = new Set(['draft', 'published']);

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function contentHash(events, scenarios) {
  return crypto.createHash('sha256').update(stableStringify({ events, scenarios })).digest('hex');
}

function parseRows(rows) {
  return rows.map((row) => parseJsonField(row.body_json)).filter(Boolean);
}

function getBody(req) {
  return req.body?.body && typeof req.body.body === 'object' ? req.body.body : req.body;
}

router.get('/published', async (_req, res) => {
  try {
    const [versions, eventRows, scenarioRows] = await Promise.all([
      query('SELECT version, content_hash FROM content_versions ORDER BY version DESC LIMIT 1'),
      query(
        `SELECT body_json FROM content_events
         WHERE status = 'published'
         ORDER BY event_id ASC`
      ),
      query(
        `SELECT body_json FROM content_scenarios
         WHERE status = 'published'
         ORDER BY scenario_id ASC`
      ),
    ]);

    const events = parseRows(eventRows);
    const scenarios = parseRows(scenarioRows);
    res.json({
      version: versions[0]?.version ?? 0,
      hash: versions[0]?.content_hash ?? contentHash(events, scenarios),
      events,
      scenarios,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Veröffentlichte Inhalte konnten nicht geladen werden.' });
  }
});

router.get('/admin/events', requireAdmin, async (_req, res) => {
  try {
    const rows = await query(
      `SELECT event_id, body_json, status, updated_at
       FROM content_events
       ORDER BY event_id ASC`
    );
    res.json({
      events: rows.map((row) => ({
        eventId: row.event_id,
        body: parseJsonField(row.body_json),
        status: row.status,
        updatedAt: row.updated_at,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Admin-Inhalte konnten nicht geladen werden.' });
  }
});

router.put('/admin/events/:eventId', requireAdmin, async (req, res) => {
  try {
    const eventId = String(req.params.eventId || '').trim().slice(0, 64);
    const body = getBody(req);
    const status = VALID_STATUS.has(req.body?.status) ? req.body.status : 'draft';

    if (!eventId || !body || body.id !== eventId || !Array.isArray(body.choices)) {
      return res.status(400).json({ error: 'Event-JSON muss id und choices enthalten.' });
    }

    await query(
      `INSERT INTO content_events (event_id, body_json, status)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE body_json = VALUES(body_json), status = VALUES(status)`,
      [eventId, JSON.stringify(body), status]
    );

    res.json({ event: body, status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Event konnte nicht gespeichert werden.' });
  }
});

router.post('/admin/publish', requireAdmin, async (req, res) => {
  try {
    await query("UPDATE content_events SET status = 'published' WHERE status = 'draft'");
    await query("UPDATE content_scenarios SET status = 'published' WHERE status = 'draft'");

    const eventRows = await query(
      `SELECT body_json FROM content_events
       WHERE status = 'published'
       ORDER BY event_id ASC`
    );
    const scenarioRows = await query(
      `SELECT body_json FROM content_scenarios
       WHERE status = 'published'
       ORDER BY scenario_id ASC`
    );
    const events = parseRows(eventRows);
    const scenarios = parseRows(scenarioRows);
    const hash = contentHash(events, scenarios);
    const latestRows = await query('SELECT COALESCE(MAX(version), 0) AS version FROM content_versions');
    const version = Number(latestRows[0]?.version || 0) + 1;

    await query(
      `INSERT INTO content_versions (version, content_hash, published_by_teacher_id)
       VALUES (?, ?, ?)`,
      [version, hash, req.teacher.teacherId]
    );

    res.json({ version, hash, eventsCount: events.length, scenariosCount: scenarios.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Veröffentlichung fehlgeschlagen.' });
  }
});

export default router;
