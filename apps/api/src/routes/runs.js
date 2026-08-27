import { Router } from 'express';
import { query } from '../db/pool.js';
import { requireStudent } from '../middleware/auth.js';
import { parseJsonField } from '../util.js';
import actionsRouter from './runs.actions.js';

const router = Router();

async function membershipByToken(token) {
  const rows = await query(
    `SELECT m.id, m.alias, m.classroom_id, m.session_token, g.id AS run_id
     FROM memberships m
     LEFT JOIN game_runs g ON g.membership_id = m.id
     WHERE m.session_token = ?
     LIMIT 1`,
    [token]
  );
  return rows[0] || null;
}

router.get('/me', requireStudent, async (req, res) => {
  try {
    const membership = await membershipByToken(req.studentToken);
    if (!membership) return res.status(401).json({ error: 'Ungültige Schüler-Sitzung.' });

    const runs = await query(
      `SELECT id, game_state, current_age, is_game_over, overall_score, updated_at
       FROM game_runs WHERE membership_id = ? LIMIT 1`,
      [membership.id]
    );
    if (!runs.length) {
      return res.json({
        membershipId: membership.id,
        alias: membership.alias,
        classroomId: membership.classroom_id,
        run: null,
      });
    }

    const run = runs[0];
    res.json({
      membershipId: membership.id,
      alias: membership.alias,
      classroomId: membership.classroom_id,
      run: {
        id: run.id,
        gameState: parseJsonField(run.game_state),
        currentAge: run.current_age,
        isGameOver: Boolean(run.is_game_over),
        overallScore: run.overall_score,
        updatedAt: run.updated_at,
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Spielstand laden fehlgeschlagen.' });
  }
});

router.put('/me', requireStudent, async (req, res) => {
  try {
    const membership = await membershipByToken(req.studentToken);
    if (!membership) return res.status(401).json({ error: 'Ungültige Schüler-Sitzung.' });

    const gameState = req.body.gameState;
    if (!gameState || typeof gameState !== 'object') {
      return res.status(400).json({ error: 'gameState fehlt.' });
    }

    const currentAge = Number(gameState.currentAge ?? 16);
    const isGameOver = gameState.isGameOver ? 1 : 0;
    const overallScore =
      req.body.overallScore != null ? Number(req.body.overallScore) : null;
    const evaluation = req.body.evaluation || null;

    if (
      (process.env.SERVER_SIM_STRICT === '1' || process.env.SERVER_SIM_STRICT === 'true') &&
      membership.run_id
    ) {
      const existingRuns = await query(
        `SELECT game_state FROM game_runs WHERE id = ? LIMIT 1`,
        [membership.run_id]
      );
      const existingState = existingRuns[0] ? parseJsonField(existingRuns[0].game_state) : null;
      if (
        existingState &&
        (Number(existingState.currentAge) !== Number(gameState.currentAge) ||
          Number(existingState.currentMonth) !== Number(gameState.currentMonth))
      ) {
        return res.status(409).json({
          error: 'Cloud-Save blockiert: Monatsschritte laufen über Server-Simulation.',
        });
      }
    }

    const payload = JSON.stringify(gameState);

    if (membership.run_id) {
      await query(
        `UPDATE game_runs
         SET game_state = ?, current_age = ?, is_game_over = ?, overall_score = COALESCE(?, overall_score)
         WHERE id = ?`,
        [payload, currentAge, isGameOver, overallScore, membership.run_id]
      );
    } else {
      const inserted = await query(
        `INSERT INTO game_runs (membership_id, game_state, current_age, is_game_over, overall_score)
         VALUES (?, ?, ?, ?, ?)`,
        [membership.id, payload, currentAge, isGameOver, overallScore]
      );
      membership.run_id = inserted.insertId;
    }

    if (evaluation && isGameOver) {
      const existing = await query(
        'SELECT id FROM evaluations WHERE game_run_id = ? LIMIT 1',
        [membership.run_id]
      );
      const dimensionsJson = JSON.stringify(evaluation.dimensions || {});
      const certificateJson = JSON.stringify(evaluation.certificate || {});
      const grade = String(evaluation.grade || 'C').slice(0, 4);
      const score = Number(evaluation.overallScore ?? overallScore ?? 0);

      if (existing.length) {
        await query(
          `UPDATE evaluations
           SET overall_score = ?, grade = ?, dimensions_json = ?, certificate_json = ?
           WHERE game_run_id = ?`,
          [score, grade, dimensionsJson, certificateJson, membership.run_id]
        );
      } else {
        await query(
          `INSERT INTO evaluations (game_run_id, overall_score, grade, dimensions_json, certificate_json)
           VALUES (?, ?, ?, ?, ?)`,
          [membership.run_id, score, grade, dimensionsJson, certificateJson]
        );
      }
    }

    res.json({ ok: true, runId: membership.run_id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Cloud-Save fehlgeschlagen.' });
  }
});

router.use(actionsRouter);

export default router;
