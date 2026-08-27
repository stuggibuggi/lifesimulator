import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireStudent } from '../middleware/auth.js';
import { parseJsonField } from '../util.js';
import { applyRunAction, SERVER_ENGINE_VERSION } from '../sim/applyRunAction.js';

const router = Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEED_PATH = path.resolve(__dirname, '../../../../packages/game-content/dist/seed.json');

async function membershipByToken(token) {
  const rows = await query(
    `SELECT m.id, m.alias, m.classroom_id, m.session_token
     FROM memberships m
     WHERE m.session_token = ?
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

async function loadPublishedEvents() {
  const rows = await query(
    `SELECT body_json FROM content_events WHERE status = 'published'`
  );
  if (rows.length) {
    return rows.map((row) => parseJsonField(row.body_json)).filter(Boolean);
  }

  const raw = await fs.readFile(SEED_PATH, 'utf8');
  const seed = JSON.parse(raw);
  return Array.isArray(seed.events) ? seed.events : [];
}

async function loadContentVersion() {
  const rows = await query(
    `SELECT version FROM content_versions ORDER BY version DESC LIMIT 1`
  );
  return rows[0]?.version ?? 0;
}

function parseAction(body) {
  const action = body?.action;
  if (!action || typeof action !== 'object') return null;
  if (action.type === 'STEP_MONTH') return { type: 'STEP_MONTH' };
  if (
    action.type === 'EVENT_CHOICE' &&
    typeof action.eventId === 'string' &&
    typeof action.choiceId === 'string'
  ) {
    return {
      type: 'EVENT_CHOICE',
      eventId: action.eventId,
      choiceId: action.choiceId,
    };
  }
  return null;
}

router.post('/:id/actions', requireStudent, async (req, res) => {
  try {
    const membership = await membershipByToken(req.studentToken);
    if (!membership) {
      return res.status(401).json({ error: 'Ungültige Schüler-Sitzung.' });
    }

    const runId = Number(req.params.id);
    if (!Number.isInteger(runId) || runId <= 0) {
      return res.status(404).json({ error: 'Spielstand nicht gefunden.' });
    }

    const runs = await query(
      `SELECT id, membership_id, game_state, current_age, is_game_over, overall_score
       FROM game_runs WHERE id = ? LIMIT 1`,
      [runId]
    );
    if (!runs.length) {
      return res.status(404).json({ error: 'Spielstand nicht gefunden.' });
    }
    const run = runs[0];
    if (Number(run.membership_id) !== Number(membership.id)) {
      return res.status(403).json({ error: 'Kein Zugriff auf diesen Spielstand.' });
    }

    const action = parseAction(req.body);
    const expectedAge = Number(req.body?.expectedAge);
    const expectedMonth = Number(req.body?.expectedMonth);
    const clientEngineVersion = String(req.body?.clientEngineVersion || '');
    const idempotencyKey = String(req.body?.idempotencyKey || '').trim();

    if (!action || !idempotencyKey || !Number.isInteger(expectedAge) || !Number.isInteger(expectedMonth)) {
      return res.status(422).json({ error: 'Ungültige Action-Anfrage.' });
    }

    const existingAudit = await query(
      `SELECT response_json FROM run_action_audit
       WHERE game_run_id = ? AND idempotency_key = ?
       LIMIT 1`,
      [runId, idempotencyKey]
    );
    if (existingAudit.length && existingAudit[0].response_json) {
      return res.json(parseJsonField(existingAudit[0].response_json));
    }

    const gameState = parseJsonField(run.game_state);
    if (!gameState || typeof gameState !== 'object') {
      return res.status(409).json({ error: 'Spielstand ist leer oder ungültig.' });
    }

    if (Number(gameState.currentAge) !== expectedAge || Number(gameState.currentMonth) !== expectedMonth) {
      return res.status(409).json({ error: 'Spielstand hat sich geändert. Bitte neu laden.' });
    }

    if (clientEngineVersion && clientEngineVersion !== SERVER_ENGINE_VERSION) {
      return res.status(409).json({ error: 'Engine-Version stimmt nicht überein.' });
    }

    const events = await loadPublishedEvents();
    let result;
    try {
      result = applyRunAction({ state: gameState, action, events });
    } catch (err) {
      if (err?.code === 'UNPROCESSABLE') {
        return res.status(422).json({ error: 'Ungültige Event-Entscheidung.' });
      }
      if (err?.code === 'CONFLICT') {
        return res.status(409).json({ error: 'Aktion passt nicht zum aktuellen Spielstand.' });
      }
      throw err;
    }

    const contentVersion = await loadContentVersion();
    const responseBody = {
      nextState: result.nextState,
      triggeredEvent: result.triggeredEvent,
      deltas: result.deltas,
      serverEngineVersion: SERVER_ENGINE_VERSION,
      contentVersion,
    };

    await query(
      `UPDATE game_runs
       SET game_state = ?, current_age = ?, is_game_over = ?
       WHERE id = ?`,
      [
        JSON.stringify(result.nextState),
        Number(result.nextState.currentAge ?? expectedAge),
        result.nextState.isGameOver ? 1 : 0,
        runId,
      ]
    );

    await query(
      `INSERT INTO run_action_audit
         (game_run_id, idempotency_key, action_type, request_json, response_json)
       VALUES (?, ?, ?, ?, ?)`,
      [
        runId,
        idempotencyKey,
        action.type,
        JSON.stringify(req.body),
        JSON.stringify(responseBody),
      ]
    );

    return res.json(responseBody);
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Server-Simulation fehlgeschlagen.' });
  }
});

export default router;
