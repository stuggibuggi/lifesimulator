/**
 * Lightweight API smoke test for Plesk / local.
 * Usage: node scripts/smoke.js
 * Env: GOAL_API_URL (default http://localhost:3001)
 */

const base = (process.env.GOAL_API_URL || 'http://localhost:3001').replace(/\/$/, '');

async function main() {
  const healthRes = await fetch(`${base}/api/health`);
  const health = await healthRes.json().catch(() => ({}));
  if (!healthRes.ok || !health.ok) {
    console.error('FAIL health', healthRes.status, health);
    process.exit(1);
  }
  console.log('OK health', health);

  const email = `smoke_${Date.now()}@example.com`;
  const password = 'TestPass123';

  const regRes = await fetch(`${base}/api/auth/teacher/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, displayName: 'Smoke' }),
  });
  const reg = await regRes.json().catch(() => ({}));
  if (!regRes.ok || !reg.needsVerification) {
    console.error('FAIL register', regRes.status, reg);
    process.exit(1);
  }
  console.log('OK register (needsVerification)');

  const loginRes = await fetch(`${base}/api/auth/teacher/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const login = await loginRes.json().catch(() => ({}));
  if (loginRes.status !== 403 || !login.needsVerification) {
    console.error('FAIL login-before-verify expected 403', loginRes.status, login);
    process.exit(1);
  }
  console.log('OK login blocked until verified');

  const forgotRes = await fetch(`${base}/api/auth/teacher/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const forgot = await forgotRes.json().catch(() => ({}));
  if (!forgotRes.ok || !forgot.ok) {
    console.error('FAIL forgot-password', forgotRes.status, forgot);
    process.exit(1);
  }
  console.log('OK forgot-password (generic response)');

  console.log('Smoke passed. Complete verify/reset via SMTP mail on the server.');
}

main().catch((err) => {
  console.error('Smoke crashed:', err);
  process.exit(1);
});
