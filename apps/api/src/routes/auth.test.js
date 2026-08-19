import express from 'express';
import { createServer } from 'node:http';
import bcrypt from 'bcryptjs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { signTeacherToken } from '../middleware/auth.js';

vi.mock('../db/pool.js', () => ({
  query: vi.fn(),
}));

vi.mock('../mail.js', () => ({
  createRawToken: vi.fn(() => 'raw-token'),
  hashToken: vi.fn((token) => `hashed:${token}`),
  sendPasswordResetEmail: vi.fn(),
  sendVerificationEmail: vi.fn(),
}));

const { query } = await import('../db/pool.js');
const { default: authRouter } = await import('./auth.js');

function createApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/auth', authRouter);
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

function teacherAuthHeader(teacherId = 7) {
  return {
    Authorization: `Bearer ${signTeacherToken({ id: teacherId, email: `teacher-${teacherId}@example.test` })}`,
  };
}

describe('DELETE /api/auth/teacher/me', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('requires a teacher token', async () => {
    const response = await request('DELETE', '/api/auth/teacher/me', {
      body: { password: 'secret123' },
    });

    expect(response.status).toBe(401);
    expect(response.data.error).toContain('Lehrer-Login');
    expect(query).not.toHaveBeenCalled();
  });

  it('rejects an incorrect password', async () => {
    query.mockResolvedValueOnce([{ id: 7, password_hash: await bcrypt.hash('secret123', 10) }]);

    const response = await request('DELETE', '/api/auth/teacher/me', {
      headers: teacherAuthHeader(7),
      body: { password: 'wrong-password' },
    });

    expect(response.status).toBe(401);
    expect(response.data.error).toContain('Passwort');
    expect(query).toHaveBeenCalledTimes(1);
  });

  it('deletes the authenticated teacher after password confirmation', async () => {
    query
      .mockResolvedValueOnce([{ id: 7, password_hash: await bcrypt.hash('secret123', 10) }])
      .mockResolvedValueOnce({ affectedRows: 1 });

    const response = await request('DELETE', '/api/auth/teacher/me', {
      headers: teacherAuthHeader(7),
      body: { password: 'secret123' },
    });

    expect(response.status).toBe(204);
    expect(response.data).toEqual({});
    expect(query).toHaveBeenCalledWith('DELETE FROM teachers WHERE id = ?', [7]);
  });
});
