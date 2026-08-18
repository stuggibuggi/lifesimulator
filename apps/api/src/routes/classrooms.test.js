import express from 'express';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../db/pool.js', () => ({
  query: vi.fn(),
}));

vi.mock('../util.js', () => ({
  makeRoomCode: vi.fn(() => 'ABC123'),
  makeSessionToken: vi.fn(),
  parseJsonField: vi.fn((value) => (value ? JSON.parse(value) : null)),
}));

const { query } = await import('../db/pool.js');
const { makeSessionToken } = await import('../util.js');
const { default: classroomsRouter } = await import('./classrooms.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/classrooms', classroomsRouter);
  return app;
}

async function postJoin(body) {
  const app = createApp();
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}/api/classrooms/join`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return { status: res.status, data };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function mockClassroom() {
  return {
    id: 42,
    room_code: 'ABC123',
    title: 'Klasse 9b',
    scenario_id: 'scenario-basic',
    expires_at: null,
  };
}

describe('POST /api/classrooms/join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    makeSessionToken.mockReset();
    makeSessionToken.mockReturnValueOnce('session-first').mockReturnValueOnce('session-resume');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a 4-6 digit PIN for new aliases', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) return [];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await postJoin({ roomCode: 'abc123', alias: 'Fuchs42' });

    expect(response.status).toBe(400);
    expect(response.data.error).toContain('PIN');
  });

  it('creates a membership with a hashed PIN and empty run on first join', async () => {
    let storedPinHash;

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) return [];
      if (sql.includes('INSERT INTO memberships')) {
        storedPinHash = params[3];
        return { insertId: 77 };
      }
      if (sql.includes('INSERT INTO game_runs')) return { insertId: 88 };
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await postJoin({ roomCode: 'abc123', alias: 'Fuchs42', pin: '1234' });

    expect(response.status).toBe(201);
    expect(response.data.sessionToken).toBe('session-first');
    expect(response.data.membershipId).toBe(77);
    expect(await bcrypt.compare('1234', storedPinHash)).toBe(true);
    expect(storedPinHash).not.toBe('1234');
  });

  it('returns needsPin when an existing alias is joined without PIN', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) return [
        { id: 77, pin_hash: await bcrypt.hash('1234', 10), session_token: 'old-session' },
      ];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await postJoin({ roomCode: 'abc123', alias: 'Fuchs42' });

    expect(response.status).toBe(401);
    expect(response.data.needsPin).toBe(true);
  });

  it('rejects a wrong PIN for an existing alias', async () => {
    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) return [
        { id: 77, pin_hash: await bcrypt.hash('1234', 10), session_token: 'old-session' },
      ];
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await postJoin({ roomCode: 'abc123', alias: 'Fuchs42', pin: '9999' });

    expect(response.status).toBe(401);
    expect(response.data.needsPin).toBe(true);
  });

  it('throttles repeated wrong PIN attempts for the same alias and client', async () => {
    const existingPinHash = await bcrypt.hash('1234', 10);

    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) return [
        { id: 77, pin_hash: existingPinHash, session_token: 'old-session' },
      ];
      throw new Error(`Unexpected query: ${sql}`);
    });

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await postJoin({ roomCode: 'abc123', alias: 'ThrottleMax', pin: '9999' });
      expect(response.status).toBe(401);
      expect(response.data.needsPin).toBe(true);
    }

    const response = await postJoin({ roomCode: 'abc123', alias: 'ThrottleMax', pin: '9999' });

    expect(response.status).toBe(429);
    expect(response.data.error).toContain('zu oft falsch eingegeben');
  });

  it('clears failed PIN attempts after a successful resume', async () => {
    const existingPinHash = await bcrypt.hash('1234', 10);
    let updateCount = 0;

    query.mockImplementation(async (sql) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) return [
        { id: 77, pin_hash: existingPinHash, session_token: 'old-session' },
      ];
      if (sql.includes('UPDATE memberships')) {
        updateCount += 1;
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    for (let attempt = 0; attempt < 4; attempt++) {
      const response = await postJoin({ roomCode: 'abc123', alias: 'ResetMax', pin: '9999' });
      expect(response.status).toBe(401);
    }

    const success = await postJoin({ roomCode: 'abc123', alias: 'ResetMax', pin: '1234' });

    expect(success.status).toBe(200);
    expect(updateCount).toBe(1);

    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await postJoin({ roomCode: 'abc123', alias: 'ResetMax', pin: '9999' });
      expect(response.status).toBe(401);
    }

    const response = await postJoin({ roomCode: 'abc123', alias: 'ResetMax', pin: '9999' });

    expect(response.status).toBe(429);
  });

  it('rotates the session token and returns the existing membership for a correct PIN', async () => {
    const existingPinHash = await bcrypt.hash('1234', 10);
    let updateParams;

    query.mockImplementation(async (sql, params) => {
      if (sql.includes('FROM classrooms')) return [mockClassroom()];
      if (sql.includes('FROM memberships')) {
        return [{ id: 77, pin_hash: existingPinHash, session_token: 'old-session' }];
      }
      if (sql.includes('UPDATE memberships')) {
        updateParams = params;
        return { affectedRows: 1 };
      }
      throw new Error(`Unexpected query: ${sql}`);
    });

    const response = await postJoin({ roomCode: 'abc123', alias: 'Fuchs42', pin: '1234' });

    expect(response.status).toBe(200);
    expect(response.data.sessionToken).toBe('session-first');
    expect(response.data.membershipId).toBe(77);
    expect(updateParams).toEqual(['session-first', 77]);
  });
});
