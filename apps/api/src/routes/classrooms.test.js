import express from 'express';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import jwt from 'jsonwebtoken';
import { signTeacherToken } from '../middleware/auth.js';

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

async function request(method, path, options = {}) {
  const app = createApp();
  const server = createServer(app);

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();

  try {
    const res = await fetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/csv')) {
      const buffer = await res.arrayBuffer();
      return {
        status: res.status,
        data: new TextDecoder().decode(buffer),
        bytes: Array.from(new Uint8Array(buffer)),
        headers: res.headers,
      };
    }
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, headers: res.headers };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function teacherAuthHeader(teacherId = 7) {
  return {
    Authorization: `Bearer ${signTeacherToken({ id: teacherId, email: `teacher-${teacherId}@example.test` })}`,
  };
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
    expect(response.data.classroom.scenarioId).toBe('scenario-basic');
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
    expect(response.data.classroom.scenarioId).toBe('scenario-basic');
    expect(updateParams).toEqual(['session-first', 77]);
  });
});

describe('DELETE /api/classrooms/:id', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a teacher token', async () => {
    const response = await request('DELETE', '/api/classrooms/42');

    expect(response.status).toBe(401);
    expect(response.data.error).toContain('Lehrer-Login');
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects non-teacher tokens', async () => {
    const token = jwt.sign({ role: 'student', teacherId: 7 }, 'dev-insecure-secret');

    const response = await request('DELETE', '/api/classrooms/42', {
      headers: { Authorization: `Bearer ${token}` },
    });

    expect(response.status).toBe(403);
    expect(response.data.error).toContain('Nur für Lehrer');
    expect(query).not.toHaveBeenCalled();
  });

  it('returns 404 when the classroom does not exist', async () => {
    query.mockResolvedValueOnce([]);

    const response = await request('DELETE', '/api/classrooms/42', {
      headers: teacherAuthHeader(7),
    });

    expect(response.status).toBe(404);
    expect(response.data.error).toContain('nicht gefunden');
    expect(query).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM classrooms'),
      [42]
    );
  });

  it('forbids deleting another teacher classroom', async () => {
    query.mockResolvedValueOnce([{ id: 42, teacher_id: 8 }]);

    const response = await request('DELETE', '/api/classrooms/42', {
      headers: teacherAuthHeader(7),
    });

    expect(response.status).toBe(403);
    expect(response.data.error).toContain('eigene Klassen');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('deletes an owned classroom', async () => {
    query
      .mockResolvedValueOnce([{ id: 42, teacher_id: 7 }])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const response = await request('DELETE', '/api/classrooms/42', {
      headers: teacherAuthHeader(7),
    });

    expect(response.status).toBe(204);
    expect(response.data).toEqual({});
    expect(query).toHaveBeenCalledWith('DELETE FROM classrooms WHERE id = ? AND teacher_id = ?', [
      42,
      7,
    ]);
  });
});

describe('GET /api/classrooms/:id/export.csv', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a teacher token', async () => {
    const response = await request('GET', '/api/classrooms/42/export.csv');

    expect(response.status).toBe(401);
    expect(response.data.error).toContain('Lehrer-Login');
    expect(query).not.toHaveBeenCalled();
  });

  it('exports owned classroom members as UTF-8 CSV', async () => {
    query
      .mockResolvedValueOnce([{ id: 42, teacher_id: 7, title: 'Klasse 9b' }])
      .mockResolvedValueOnce([
        {
          alias: 'Fuchs42',
          current_age: 18,
          is_game_over: 1,
          overall_score: 87,
          last_seen_at: '2026-08-01 10:00:00',
          updated_at: '2026-08-01 10:05:00',
        },
        {
          alias: 'Mia, "Pro"',
          current_age: null,
          is_game_over: 0,
          overall_score: null,
          last_seen_at: null,
          updated_at: null,
        },
      ]);

    const response = await request('GET', '/api/classrooms/42/export.csv', {
      headers: teacherAuthHeader(7),
    });

    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/csv');
    expect(response.headers.get('content-disposition')).toContain('classroom-42-export.csv');
    expect(response.bytes.slice(0, 3)).toEqual([0xef, 0xbb, 0xbf]);
    expect(response.data).toBe(
      'alias,age,isGameOver,overallScore,lastSeenAt,updatedAt\r\n' +
        'Fuchs42,18,true,87,2026-08-01 10:00:00,2026-08-01 10:05:00\r\n' +
        '"Mia, ""Pro""",,false,,,\r\n'
    );
  });
});
