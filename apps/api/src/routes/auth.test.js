import express from 'express';
import { createServer } from 'node:http';
import { generateKeyPairSync } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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
const localFetch = globalThis.fetch;

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
    const res = await localFetch(`http://127.0.0.1:${address.port}${path}`, {
      method,
      redirect: options.redirect,
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...(options.headers || {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    return { status: res.status, data, headers: res.headers };
  } finally {
    await new Promise((resolve, reject) => {
      server.close((err) => (err ? reject(err) : resolve()));
    });
  }
}

function withOidcEnv(overrides = {}) {
  process.env.OIDC_ISSUER = 'https://idp.example.school/realms/school';
  process.env.OIDC_CLIENT_ID = 'goal-life-simulator';
  process.env.OIDC_CLIENT_SECRET = 'client-secret';
  process.env.OIDC_REDIRECT_URI = 'https://goal.example/api/auth/oidc/callback';
  process.env.OIDC_SCOPES = 'openid profile email';
  process.env.OIDC_ALLOWED_EMAIL_DOMAINS = 'school.example';
  process.env.OIDC_TEACHER_ROLE_CLAIM = 'roles';
  process.env.OIDC_TEACHER_ROLE_VALUES = 'teacher,staff';
  process.env.APP_PUBLIC_URL = 'https://goal.example';
  Object.assign(process.env, overrides);
}

function clearOidcEnv() {
  for (const key of [
    'OIDC_ISSUER',
    'OIDC_CLIENT_ID',
    'OIDC_CLIENT_SECRET',
    'OIDC_REDIRECT_URI',
    'OIDC_SCOPES',
    'OIDC_ALLOWED_EMAIL_DOMAINS',
    'OIDC_TEACHER_ROLE_CLAIM',
    'OIDC_TEACHER_ROLE_VALUES',
    'APP_PUBLIC_URL',
  ]) {
    delete process.env[key];
  }
}

function createOidcJwt({ issuer, audience, subject, email, roles = ['teacher'], nonce }) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const kid = 'test-kid';
  const idToken = jwt.sign(
    {
      iss: issuer,
      aud: audience,
      sub: subject,
      email,
      email_verified: true,
      name: 'SSO Teacher',
      roles,
      nonce,
    },
    privateKey,
    {
      algorithm: 'RS256',
      keyid: kid,
      expiresIn: '5m',
    }
  );

  return {
    idToken,
    jwks: {
      keys: [
        {
          ...publicKey.export({ format: 'jwk' }),
          kid,
          alg: 'RS256',
          use: 'sig',
        },
      ],
    },
  };
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

describe('teacher OIDC SSO', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearOidcEnv();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    clearOidcEnv();
  });

  it('returns a clear German 503 when OIDC is not configured', async () => {
    const response = await request('GET', '/api/auth/oidc/start');

    expect(response.status).toBe(503);
    expect(response.data.error).toContain('Schul-SSO ist noch nicht konfiguriert');
    expect(query).not.toHaveBeenCalled();
  });

  it('starts authorization code flow with PKCE and a state cookie', async () => {
    withOidcEnv();
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url) => {
        if (String(url).endsWith('/.well-known/openid-configuration')) {
          return Response.json({
            authorization_endpoint: 'https://idp.example.school/auth',
            token_endpoint: 'https://idp.example.school/token',
            jwks_uri: 'https://idp.example.school/jwks',
          });
        }
        throw new Error(`Unexpected fetch ${url}`);
      })
    );

    const response = await request('GET', '/api/auth/oidc/start', { redirect: 'manual' });
    const location = new URL(response.headers.get('location'));

    expect(response.status).toBe(302);
    expect(location.origin + location.pathname).toBe('https://idp.example.school/auth');
    expect(location.searchParams.get('response_type')).toBe('code');
    expect(location.searchParams.get('client_id')).toBe('goal-life-simulator');
    expect(location.searchParams.get('redirect_uri')).toBe('https://goal.example/api/auth/oidc/callback');
    expect(location.searchParams.get('scope')).toBe('openid profile email');
    expect(location.searchParams.get('code_challenge_method')).toBe('S256');
    expect(location.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(location.searchParams.get('state')).toBeTruthy();
    expect(location.searchParams.get('nonce')).toBeTruthy();
    expect(response.headers.get('set-cookie')).toContain('goal_oidc_state=');
  });

  it('links a verified school identity and redirects with an internal teacher token', async () => {
    withOidcEnv();

    const startFetch = vi.fn(async (url) => {
      if (String(url).endsWith('/.well-known/openid-configuration')) {
        return Response.json({
          authorization_endpoint: 'https://idp.example.school/auth',
          token_endpoint: 'https://idp.example.school/token',
          jwks_uri: 'https://idp.example.school/jwks',
        });
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', startFetch);

    const start = await request('GET', '/api/auth/oidc/start', { redirect: 'manual' });
    const startLocation = new URL(start.headers.get('location'));
    const state = startLocation.searchParams.get('state');
    const nonce = startLocation.searchParams.get('nonce');
    const cookie = start.headers.get('set-cookie')?.split(';')[0];
    expect(cookie).toBeTruthy();

    const { idToken, jwks } = createOidcJwt({
      issuer: process.env.OIDC_ISSUER,
      audience: process.env.OIDC_CLIENT_ID,
      subject: 'school-sub-123',
      email: 'teacher@school.example',
      nonce,
    });

    const oidcFetch = vi.fn(async (url, options) => {
      if (String(url).endsWith('/.well-known/openid-configuration')) {
        return Response.json({
          authorization_endpoint: 'https://idp.example.school/auth',
          token_endpoint: 'https://idp.example.school/token',
          jwks_uri: 'https://idp.example.school/jwks',
        });
      }
      if (String(url) === 'https://idp.example.school/token') {
        expect(options.method).toBe('POST');
        const body = new URLSearchParams(options.body);
        expect(body.get('grant_type')).toBe('authorization_code');
        expect(body.get('code')).toBe('auth-code');
        expect(body.get('code_verifier')).toMatch(/^[A-Za-z0-9_-]{43,128}$/);
        return Response.json({ id_token: idToken, token_type: 'Bearer' });
      }
      if (String(url) === 'https://idp.example.school/jwks') {
        return Response.json(jwks);
      }
      throw new Error(`Unexpected fetch ${url}`);
    });
    vi.stubGlobal('fetch', oidcFetch);
    query
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([
        {
          id: 7,
          email: 'teacher@school.example',
          display_name: 'Existing Teacher',
          is_admin: 0,
          email_verified_at: null,
          oidc_sub: null,
        },
      ])
      .mockResolvedValueOnce({ affectedRows: 1 })
      .mockResolvedValueOnce([
        {
          id: 7,
          email: 'teacher@school.example',
          display_name: 'Existing Teacher',
          is_admin: 0,
        },
      ]);

    const callback = await request(
      'GET',
      `/api/auth/oidc/callback?code=auth-code&state=${encodeURIComponent(state)}`,
      { redirect: 'manual', headers: { Cookie: cookie } }
    );
    const callbackLocation = new URL(callback.headers.get('location'));
    const token = callbackLocation.searchParams.get('teacherSsoToken');
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'dev-insecure-secret');

    expect(callback.status).toBe(302);
    expect(callbackLocation.origin).toBe('https://goal.example');
    expect(payload.role).toBe('teacher');
    expect(payload.teacherId).toBe(7);
    expect(query).toHaveBeenCalledWith('SELECT id, email, display_name, is_admin, email_verified_at, oidc_sub FROM teachers WHERE oidc_sub = ? LIMIT 1', ['school-sub-123']);
    expect(query).toHaveBeenCalledWith('SELECT id, email, display_name, is_admin, email_verified_at, oidc_sub FROM teachers WHERE email = ? LIMIT 1', ['teacher@school.example']);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('SET oidc_sub = ?'),
      ['school-sub-123', 7]
    );
  });
});
