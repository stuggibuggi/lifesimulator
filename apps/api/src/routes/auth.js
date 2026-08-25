import { Router } from 'express';
import { createHash, createPublicKey, randomBytes, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { query } from '../db/pool.js';
import { signTeacherToken, requireTeacher } from '../middleware/auth.js';
import {
  createRawToken,
  hashToken,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from '../mail.js';

const router = Router();
const OIDC_COOKIE_NAME = 'goal_oidc_state';

function hoursFromNow(hours) {
  return new Date(Date.now() + hours * 60 * 60 * 1000);
}

function toMysqlDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

function getJwtSecret() {
  return process.env.JWT_SECRET || 'dev-insecure-secret';
}

function getOidcConfig() {
  const issuer = String(process.env.OIDC_ISSUER || '').trim().replace(/\/$/, '');
  if (!issuer) return null;

  return {
    issuer,
    clientId: String(process.env.OIDC_CLIENT_ID || '').trim(),
    clientSecret: String(process.env.OIDC_CLIENT_SECRET || ''),
    redirectUri: String(process.env.OIDC_REDIRECT_URI || '').trim(),
    scopes: String(process.env.OIDC_SCOPES || 'openid profile email').trim(),
    allowedEmailDomains: String(process.env.OIDC_ALLOWED_EMAIL_DOMAINS || '')
      .split(',')
      .map((domain) => domain.trim().toLowerCase())
      .filter(Boolean),
    teacherRoleClaim: String(process.env.OIDC_TEACHER_ROLE_CLAIM || '').trim(),
    teacherRoleValues: String(process.env.OIDC_TEACHER_ROLE_VALUES || '')
      .split(',')
      .map((role) => role.trim())
      .filter(Boolean),
    appPublicUrl: String(process.env.APP_PUBLIC_URL || 'http://localhost:5174').trim().replace(/\/$/, ''),
  };
}

function assertOidcConfig(config) {
  if (!config.clientId || !config.redirectUri) {
    throw new Error('OIDC_CLIENT_ID und OIDC_REDIRECT_URI müssen gesetzt sein.');
  }
}

async function fetchJson(url, options) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.error_description || data.error || `OIDC-Anfrage fehlgeschlagen (${response.status}).`);
  }
  return data;
}

async function loadOidcDiscovery(config) {
  return fetchJson(`${config.issuer}/.well-known/openid-configuration`);
}

function parseCookies(req) {
  const header = req.headers.cookie || '';
  return Object.fromEntries(
    header
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const index = part.indexOf('=');
        if (index === -1) return [part, ''];
        return [part.slice(0, index), decodeURIComponent(part.slice(index + 1))];
      })
  );
}

function getOidcCookieAttributes(config) {
  const secure = config.redirectUri.startsWith('https://') ? '; Secure' : '';
  return `HttpOnly; SameSite=Lax; Path=/api/auth/oidc; Max-Age=600${secure}`;
}

function setOidcCookie(res, config, payload) {
  const signed = jwt.sign(payload, getJwtSecret(), { expiresIn: '10m' });
  res.setHeader(
    'Set-Cookie',
    `${OIDC_COOKIE_NAME}=${encodeURIComponent(signed)}; ${getOidcCookieAttributes(config)}`
  );
}

function clearOidcCookie(res, config) {
  const secure = config.redirectUri.startsWith('https://') ? '; Secure' : '';
  res.setHeader(
    'Set-Cookie',
    `${OIDC_COOKIE_NAME}=; HttpOnly; SameSite=Lax; Path=/api/auth/oidc; Max-Age=0${secure}`
  );
}

function safeEqual(a, b) {
  const left = Buffer.from(String(a || ''));
  const right = Buffer.from(String(b || ''));
  return left.length === right.length && timingSafeEqual(left, right);
}

function getClaim(payload, claimName) {
  if (!claimName) return undefined;
  return claimName.split('.').reduce((current, key) => {
    if (!current || typeof current !== 'object') return undefined;
    return current[key];
  }, payload);
}

function hasAllowedRole(payload, claimName, allowedValues) {
  if (!claimName || !allowedValues.length) return true;
  const value = getClaim(payload, claimName);
  const values = Array.isArray(value) ? value : typeof value === 'string' ? [value] : [];
  return values.some((item) => allowedValues.includes(String(item)));
}

function normalizeVerifiedEmail(payload, config) {
  const email = String(payload.email || '').trim().toLowerCase();
  if (!email || payload.email_verified !== true) {
    throw new Error('Die Schul-SSO-E-Mail wurde vom Identity Provider nicht bestätigt.');
  }

  const domain = email.split('@')[1] || '';
  if (config.allowedEmailDomains.length && !config.allowedEmailDomains.includes(domain)) {
    throw new Error('Diese Schul-E-Mail ist für GOAL nicht freigeschaltet.');
  }
  return email;
}

async function validateIdToken(idToken, config, discovery, expectedNonce) {
  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded?.header?.kid) {
    throw new Error('OIDC-ID-Token ohne Schlüssel-ID.');
  }

  const jwks = await fetchJson(discovery.jwks_uri);
  const jwk = jwks.keys?.find((key) => key.kid === decoded.header.kid);
  if (!jwk) {
    throw new Error('OIDC-Signaturschlüssel nicht gefunden.');
  }

  const publicKey = createPublicKey({ key: jwk, format: 'jwk' });
  const payload = jwt.verify(idToken, publicKey, {
    algorithms: ['RS256'],
    audience: config.clientId,
    issuer: config.issuer,
  });

  if (!safeEqual(payload.nonce, expectedNonce)) {
    throw new Error('OIDC-Nonce ungültig.');
  }
  if (!hasAllowedRole(payload, config.teacherRoleClaim, config.teacherRoleValues)) {
    throw new Error('Dieses Schul-SSO-Konto ist nicht als Lehrkraft freigeschaltet.');
  }
  return payload;
}

async function exchangeAuthorizationCode(code, config, discovery, codeVerifier) {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    client_id: config.clientId,
    code_verifier: codeVerifier,
  });
  if (config.clientSecret) body.set('client_secret', config.clientSecret);

  return fetchJson(discovery.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
}

async function findOrCreateOidcTeacher({ oidcSub, email, displayName }) {
  const bySubject = await query(
    'SELECT id, email, display_name, is_admin, email_verified_at, oidc_sub FROM teachers WHERE oidc_sub = ? LIMIT 1',
    [oidcSub]
  );
  if (bySubject.length) return bySubject[0];

  const byEmail = await query(
    'SELECT id, email, display_name, is_admin, email_verified_at, oidc_sub FROM teachers WHERE email = ? LIMIT 1',
    [email]
  );
  if (byEmail.length) {
    const teacher = byEmail[0];
    if (teacher.oidc_sub && teacher.oidc_sub !== oidcSub) {
      throw new Error('Dieses Lehrerkonto ist bereits mit einem anderen Schul-SSO verbunden.');
    }
    await query(
      `UPDATE teachers
       SET oidc_sub = ?,
           email_verified_at = COALESCE(email_verified_at, NOW()),
           verification_token_hash = NULL,
           verification_expires_at = NULL
       WHERE id = ?`,
      [oidcSub, teacher.id]
    );
    return { ...teacher, oidc_sub: oidcSub, email_verified_at: teacher.email_verified_at || new Date() };
  }

  const result = await query(
    `INSERT INTO teachers (email, password_hash, display_name, email_verified_at, oidc_sub)
     VALUES (?, '', ?, NOW(), ?)`,
    [email, displayName || null, oidcSub]
  );
  const rows = await query(
    'SELECT id, email, display_name, is_admin FROM teachers WHERE id = ? LIMIT 1',
    [result.insertId]
  );
  return rows[0];
}

function redirectWithSsoResult(res, config, params) {
  const url = new URL(config.appPublicUrl || 'http://localhost:5174');
  for (const [key, value] of Object.entries(params)) {
    if (value != null) url.searchParams.set(key, value);
  }
  res.redirect(url.toString());
}

router.get('/oidc/start', async (_req, res) => {
  const config = getOidcConfig();
  if (!config) {
    return res.status(503).json({
      error: 'Schul-SSO ist noch nicht konfiguriert. Bitte nutze vorerst den Passwort-Login.',
    });
  }

  try {
    assertOidcConfig(config);
    const discovery = await loadOidcDiscovery(config);
    const state = base64url(randomBytes(32));
    const nonce = base64url(randomBytes(32));
    const codeVerifier = base64url(randomBytes(32));
    const codeChallenge = base64url(createHash('sha256').update(codeVerifier).digest());

    setOidcCookie(res, config, { state, nonce, codeVerifier });

    const authorizationUrl = new URL(discovery.authorization_endpoint);
    authorizationUrl.searchParams.set('response_type', 'code');
    authorizationUrl.searchParams.set('client_id', config.clientId);
    authorizationUrl.searchParams.set('redirect_uri', config.redirectUri);
    authorizationUrl.searchParams.set('scope', config.scopes);
    authorizationUrl.searchParams.set('state', state);
    authorizationUrl.searchParams.set('nonce', nonce);
    authorizationUrl.searchParams.set('code_challenge', codeChallenge);
    authorizationUrl.searchParams.set('code_challenge_method', 'S256');

    res.redirect(authorizationUrl.toString());
  } catch (err) {
    console.error('[auth/oidc/start]', err);
    res.status(500).json({ error: 'Schul-SSO konnte nicht gestartet werden.' });
  }
});

router.get('/oidc/callback', async (req, res) => {
  const config = getOidcConfig();
  if (!config) {
    return res.status(503).json({
      error: 'Schul-SSO ist noch nicht konfiguriert. Bitte nutze vorerst den Passwort-Login.',
    });
  }

  try {
    assertOidcConfig(config);
    const code = String(req.query.code || '');
    const state = String(req.query.state || '');
    if (!code || !state) {
      throw new Error('OIDC-Code oder State fehlt.');
    }

    const cookieValue = parseCookies(req)[OIDC_COOKIE_NAME];
    if (!cookieValue) throw new Error('OIDC-Anmeldung abgelaufen. Bitte erneut starten.');
    const statePayload = jwt.verify(cookieValue, getJwtSecret());
    if (!safeEqual(statePayload.state, state)) {
      throw new Error('OIDC-State ungültig.');
    }

    clearOidcCookie(res, config);
    const discovery = await loadOidcDiscovery(config);
    const tokenResponse = await exchangeAuthorizationCode(
      code,
      config,
      discovery,
      statePayload.codeVerifier
    );
    if (!tokenResponse.id_token) {
      throw new Error('OIDC-ID-Token fehlt.');
    }

    const oidcPayload = await validateIdToken(
      tokenResponse.id_token,
      config,
      discovery,
      statePayload.nonce
    );
    const email = normalizeVerifiedEmail(oidcPayload, config);
    const oidcSub = String(oidcPayload.sub || '').trim();
    if (!oidcSub) throw new Error('OIDC-Subject fehlt.');

    const teacher = await findOrCreateOidcTeacher({
      oidcSub,
      email,
      displayName: String(oidcPayload.name || '').trim() || null,
    });
    const token = signTeacherToken(teacher);
    redirectWithSsoResult(res, config, { teacherSsoToken: token });
  } catch (err) {
    console.error('[auth/oidc/callback]', err);
    clearOidcCookie(res, config);
    redirectWithSsoResult(res, config, {
      teacherSsoError:
        err instanceof Error && err.message
          ? err.message
          : 'Schul-SSO-Anmeldung fehlgeschlagen.',
    });
  }
});

router.post('/teacher/register', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');
    const displayName = String(req.body.displayName || '').trim() || null;

    if (!email || !email.includes('@') || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'E-Mail und Passwort (mind. 8 Zeichen) erforderlich.' });
    }

    const existing = await query('SELECT id FROM teachers WHERE email = ? LIMIT 1', [email]);
    if (existing.length) {
      return res.status(409).json({ error: 'E-Mail bereits registriert.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const rawToken = createRawToken();
    const tokenHash = hashToken(rawToken);
    const expiresAt = toMysqlDatetime(hoursFromNow(48));

    await query(
      `INSERT INTO teachers
        (email, password_hash, display_name, verification_token_hash, verification_expires_at)
       VALUES (?, ?, ?, ?, ?)`,
      [email, passwordHash, displayName, tokenHash, expiresAt]
    );

    const mailResult = await sendVerificationEmail(email, rawToken);
    const mailOk = Boolean(mailResult && (mailResult.sent || mailResult.logged));

    res.status(201).json({
      ok: true,
      needsVerification: true,
      mailSent: mailOk,
      mailError: mailOk ? undefined : mailResult?.error,
      message: mailOk
        ? 'Konto angelegt. Bitte bestätige deine E-Mail über den Link in der Nachricht, bevor du dich anmeldest.'
        : 'Konto angelegt, aber die Bestätigungsmail konnte nicht gesendet werden. Bitte „Bestätigung erneut senden“ nutzen, sobald SMTP steht, oder den Admin kontaktieren.',
    });
  } catch (err) {
    console.error('[auth/register]', err);
    if (err && (err.code === 'ER_BAD_FIELD_ERROR' || err.errno === 1054)) {
      return res.status(500).json({
        error: 'Datenbankschema veraltet. Bitte in apps/api: npm run migrate',
        detail: String(err.message || err),
      });
    }
    res.status(500).json({
      error: 'Registrierung fehlgeschlagen.',
      detail: String(err && err.message ? err.message : err),
    });
  }
});

router.post('/teacher/verify', async (req, res) => {
  try {
    const rawToken = String(req.body.token || '').trim();
    if (!rawToken) {
      return res.status(400).json({ error: 'Token fehlt.' });
    }

    const tokenHash = hashToken(rawToken);
    const rows = await query(
      `SELECT id, email, display_name, verification_expires_at
       FROM teachers
       WHERE verification_token_hash = ?
       LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Bestätigungslink.' });
    }

    const teacher = rows[0];
    if (
      teacher.verification_expires_at &&
      new Date(teacher.verification_expires_at) < new Date()
    ) {
      return res.status(400).json({ error: 'Bestätigungslink abgelaufen. Bitte neu registrieren oder Support fragen.' });
    }

    await query(
      `UPDATE teachers
       SET email_verified_at = NOW(),
           verification_token_hash = NULL,
           verification_expires_at = NULL
       WHERE id = ?`,
      [teacher.id]
    );

    const token = signTeacherToken(teacher);
    res.json({
      ok: true,
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        displayName: teacher.display_name,
        isAdmin: Boolean(teacher.is_admin),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Bestätigung fehlgeschlagen.' });
  }
});

router.post('/teacher/login', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();
    const password = String(req.body.password || '');

    const rows = await query(
      `SELECT id, email, password_hash, display_name, email_verified_at, is_admin
       FROM teachers WHERE email = ? LIMIT 1`,
      [email]
    );
    if (!rows.length) {
      return res.status(401).json({ error: 'Login fehlgeschlagen.' });
    }

    const teacher = rows[0];
    const ok = await bcrypt.compare(password, teacher.password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Login fehlgeschlagen.' });
    }

    if (!teacher.email_verified_at) {
      return res.status(403).json({
        error: 'E-Mail noch nicht bestätigt. Bitte den Link in der Registrierungsmail öffnen.',
        needsVerification: true,
      });
    }

    const token = signTeacherToken(teacher);
    res.json({
      token,
      teacher: {
        id: teacher.id,
        email: teacher.email,
        displayName: teacher.display_name,
        isAdmin: Boolean(teacher.is_admin),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Login fehlgeschlagen.' });
  }
});

router.post('/teacher/resend-verification', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    const generic = {
      ok: true,
      message:
        'Falls ein unbestätigtes Konto existiert, wurde die Bestätigungsmail erneut gesendet.',
    };

    if (!email || !email.includes('@')) {
      return res.json(generic);
    }

    const rows = await query(
      `SELECT id, email, email_verified_at FROM teachers WHERE email = ? LIMIT 1`,
      [email]
    );
    if (rows.length && !rows[0].email_verified_at) {
      const rawToken = createRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = toMysqlDatetime(hoursFromNow(48));
      await query(
        `UPDATE teachers
         SET verification_token_hash = ?, verification_expires_at = ?
         WHERE id = ?`,
        [tokenHash, expiresAt, rows[0].id]
      );
      await sendVerificationEmail(email, rawToken);
    }

    res.json(generic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen.' });
  }
});

router.post('/teacher/forgot-password', async (req, res) => {
  try {
    const email = String(req.body.email || '')
      .trim()
      .toLowerCase();

    // Always generic OK (no email enumeration)
    const generic = {
      ok: true,
      message:
        'Falls ein Konto mit dieser E-Mail existiert, wurde ein Link zum Zurücksetzen gesendet.',
    };

    if (!email || !email.includes('@')) {
      return res.json(generic);
    }

    const rows = await query(
      'SELECT id, email, email_verified_at FROM teachers WHERE email = ? LIMIT 1',
      [email]
    );
    if (rows.length && rows[0].email_verified_at) {
      const rawToken = createRawToken();
      const tokenHash = hashToken(rawToken);
      const expiresAt = toMysqlDatetime(hoursFromNow(1));
      await query(
        `UPDATE teachers
         SET reset_token_hash = ?, reset_expires_at = ?
         WHERE id = ?`,
        [tokenHash, expiresAt, rows[0].id]
      );
      await sendPasswordResetEmail(email, rawToken);
    }

    res.json(generic);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Anfrage fehlgeschlagen.' });
  }
});

router.post('/teacher/reset-password', async (req, res) => {
  try {
    const rawToken = String(req.body.token || '').trim();
    const password = String(req.body.password || '');

    if (!rawToken || password.length < 8) {
      return res
        .status(400)
        .json({ error: 'Token und neues Passwort (mind. 8 Zeichen) erforderlich.' });
    }

    const tokenHash = hashToken(rawToken);
    const rows = await query(
      `SELECT id, reset_expires_at FROM teachers WHERE reset_token_hash = ? LIMIT 1`,
      [tokenHash]
    );
    if (!rows.length) {
      return res.status(400).json({ error: 'Ungültiger oder bereits verwendeter Reset-Link.' });
    }

    const teacher = rows[0];
    if (teacher.reset_expires_at && new Date(teacher.reset_expires_at) < new Date()) {
      return res.status(400).json({ error: 'Reset-Link abgelaufen. Bitte erneut anfordern.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await query(
      `UPDATE teachers
       SET password_hash = ?,
           reset_token_hash = NULL,
           reset_expires_at = NULL
       WHERE id = ?`,
      [passwordHash, teacher.id]
    );

    res.json({ ok: true, message: 'Passwort aktualisiert. Du kannst dich jetzt anmelden.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Passwort konnte nicht gesetzt werden.' });
  }
});

router.get('/teacher/me', requireTeacher, async (req, res) => {
  try {
    const rows = await query(
      'SELECT id, email, display_name, email_verified_at, is_admin FROM teachers WHERE id = ? LIMIT 1',
      [req.teacher.teacherId]
    );
    if (!rows.length) return res.status(404).json({ error: 'Nicht gefunden.' });
    res.json({
      teacher: {
        id: rows[0].id,
        email: rows[0].email,
        displayName: rows[0].display_name,
        emailVerified: Boolean(rows[0].email_verified_at),
        isAdmin: Boolean(rows[0].is_admin),
      },
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Fehler.' });
  }
});

router.delete('/teacher/me', requireTeacher, async (req, res) => {
  try {
    const password = String(req.body.password || '');
    if (!password) {
      return res.status(400).json({ error: 'Passwort erforderlich.' });
    }

    const rows = await query('SELECT id, password_hash FROM teachers WHERE id = ? LIMIT 1', [
      req.teacher.teacherId,
    ]);
    if (!rows.length) return res.status(404).json({ error: 'Nicht gefunden.' });

    const ok = await bcrypt.compare(password, rows[0].password_hash);
    if (!ok) {
      return res.status(401).json({ error: 'Passwort stimmt nicht.' });
    }

    await query('DELETE FROM teachers WHERE id = ?', [req.teacher.teacherId]);
    res.status(204).end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Konto konnte nicht gelöscht werden.' });
  }
});

export default router;
