import express from 'express';
import { createServer } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { signTeacherToken } from '../middleware/auth.js';

vi.mock('../db/pool.js', () => ({
  query: vi.fn(),
}));

const { query } = await import('../db/pool.js');
const { default: contentRouter } = await import('./content.js');
const { default: classroomsRouter } = await import('./classrooms.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/content', contentRouter);
  app.use('/api/classrooms', classroomsRouter);
  return app;
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
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function teacherAuthHeader(teacherId = 7, isAdmin = false) {
  return {
    Authorization: `Bearer ${signTeacherToken({
      id: teacherId,
      email: `teacher-${teacherId}@example.test`,
      isAdmin,
    })}`,
  };
}

describe('GET /api/content/published', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns the latest published content bundle', async () => {
    query
      .mockResolvedValueOnce([{ version: 3, content_hash: 'hash-3' }])
      .mockResolvedValueOnce([
        {
          body_json: JSON.stringify({
            id: 'EVT_TEST',
            title: 'Testevent',
            choices: [{ id: 'c1', learningTip: 'Standard-Tipp' }],
          }),
        },
      ])
      .mockResolvedValueOnce([
        {
          body_json: JSON.stringify({
            id: 'SCENARIO_TEST',
            title: 'Testszenario',
            recommendedGoals: [],
          }),
        },
      ]);

    const response = await request('GET', '/api/content/published');

    expect(response.status).toBe(200);
    expect(response.data.version).toBe(3);
    expect(response.data.hash).toBe('hash-3');
    expect(response.data.events[0].id).toBe('EVT_TEST');
    expect(response.data.scenarios[0].id).toBe('SCENARIO_TEST');
  });
});

describe('admin content API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('requires an admin teacher for event editing', async () => {
    query.mockResolvedValueOnce([{ id: 7, is_admin: 0 }]);

    const response = await request('PUT', '/api/content/admin/events/EVT_TEST', {
      headers: teacherAuthHeader(7, false),
      body: { body: { id: 'EVT_TEST', title: 'Entwurf', choices: [] } },
    });

    expect(response.status).toBe(403);
    expect(response.data.error).toContain('Admin');
  });

  it('upserts an event draft for admins', async () => {
    query
      .mockResolvedValueOnce([{ id: 7, is_admin: 1 }])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const body = { id: 'EVT_TEST', title: 'Entwurf', choices: [] };
    const response = await request('PUT', '/api/content/admin/events/EVT_TEST', {
      headers: teacherAuthHeader(7, true),
      body: { body, status: 'draft' },
    });

    expect(response.status).toBe(200);
    expect(response.data.event.id).toBe('EVT_TEST');
    expect(query).toHaveBeenLastCalledWith(expect.stringContaining('INSERT INTO content_events'), [
      'EVT_TEST',
      JSON.stringify(body),
      'draft',
    ]);
  });

  it('publishes current content and creates a version', async () => {
    query
      .mockResolvedValueOnce([{ id: 7, is_admin: 1 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ body_json: JSON.stringify({ id: 'EVT_TEST', choices: [] }) }])
      .mockResolvedValueOnce([{ body_json: JSON.stringify({ id: 'SCENARIO_TEST', recommendedGoals: [] }) }])
      .mockResolvedValueOnce([{ version: 4 }])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const response = await request('POST', '/api/content/admin/publish', {
      headers: teacherAuthHeader(7, true),
    });

    expect(response.status).toBe(200);
    expect(response.data.version).toBe(5);
    expect(response.data.hash).toMatch(/^[a-f0-9]{64}$/);
  });
});

describe('classroom tip overrides API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets a teacher owner save and list tip overrides', async () => {
    query
      .mockResolvedValueOnce([{ id: 42, teacher_id: 7 }])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([{ id: 42, teacher_id: 7 }])
      .mockResolvedValueOnce([
        { event_id: 'EVT_TEST', tip_text: 'Klassentipp', updated_at: '2026-08-25 12:00:00' },
      ]);

    const saved = await request('PUT', '/api/classrooms/42/tip-overrides/EVT_TEST', {
      headers: teacherAuthHeader(7),
      body: { tipText: 'Klassentipp' },
    });
    const listed = await request('GET', '/api/classrooms/42/tip-overrides', {
      headers: teacherAuthHeader(7),
    });

    expect(saved.status).toBe(200);
    expect(listed.status).toBe(200);
    expect(listed.data.tipOverrides).toEqual([
      { eventId: 'EVT_TEST', tipText: 'Klassentipp', updatedAt: '2026-08-25 12:00:00' },
    ]);
  });

  it('allows a student session to read overrides for its classroom', async () => {
    query
      .mockResolvedValueOnce([{ classroom_id: 42 }])
      .mockResolvedValueOnce([
        { event_id: 'EVT_TEST', tip_text: 'Klassentipp', updated_at: '2026-08-25 12:00:00' },
      ]);

    const response = await request('GET', '/api/classrooms/42/tip-overrides', {
      headers: { 'X-Student-Token': 'student-token' },
    });

    expect(response.status).toBe(200);
    expect(response.data.tipOverrides[0].tipText).toBe('Klassentipp');
  });
});
