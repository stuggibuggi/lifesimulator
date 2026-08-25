import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool } from '../src/db/pool.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const seedPath = path.resolve(__dirname, '../../../packages/game-content/dist/seed.json');

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(',')}]`;
  }
  if (value && typeof value === 'object') {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function validateSeed(seed) {
  if (!seed || !Array.isArray(seed.events) || !Array.isArray(seed.scenarios)) {
    throw new Error('Seed JSON muss events[] und scenarios[] enthalten.');
  }
  for (const event of seed.events) {
    if (!event?.id || !Array.isArray(event.choices)) {
      throw new Error(`Ungültiges Event im Seed: ${JSON.stringify(event)}`);
    }
  }
  for (const scenario of seed.scenarios) {
    if (!scenario?.id || !Array.isArray(scenario.recommendedGoals)) {
      throw new Error(`Ungültiges Szenario im Seed: ${JSON.stringify(scenario)}`);
    }
  }
}

async function seedContent() {
  const seed = JSON.parse(fs.readFileSync(seedPath, 'utf8'));
  validateSeed(seed);
  const contentHash = crypto.createHash('sha256').update(stableStringify(seed)).digest('hex');

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    for (const event of seed.events) {
      await conn.query(
        `INSERT INTO content_events (event_id, body_json, status)
         VALUES (?, ?, 'published')
         ON DUPLICATE KEY UPDATE body_json = VALUES(body_json), status = 'published'`,
        [event.id, JSON.stringify(event)]
      );
    }

    for (const scenario of seed.scenarios) {
      await conn.query(
        `INSERT INTO content_scenarios (scenario_id, body_json, status)
         VALUES (?, ?, 'published')
         ON DUPLICATE KEY UPDATE body_json = VALUES(body_json), status = 'published'`,
        [scenario.id, JSON.stringify(scenario)]
      );
    }

    const [latestRows] = await conn.query('SELECT COALESCE(MAX(version), 0) AS version FROM content_versions');
    const nextVersion = Number(latestRows[0]?.version || 0) + 1;
    await conn.query(
      `INSERT INTO content_versions (version, content_hash, published_by_teacher_id)
       VALUES (?, ?, NULL)`,
      [nextVersion, contentHash]
    );

    await conn.commit();
    console.log(
      `Content seed veröffentlicht: Version ${nextVersion}, ${seed.events.length} Events, ${seed.scenarios.length} Szenarien.`
    );
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
    await pool.end();
  }
}

seedContent().catch((err) => {
  console.error('Content seed fehlgeschlagen:', err);
  process.exit(1);
});
