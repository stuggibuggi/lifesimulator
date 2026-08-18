function resolveApiBase(): string {
  const fromEnv =
    typeof import.meta !== 'undefined'
      ? (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL
      : undefined;

  if (fromEnv && String(fromEnv).trim()) {
    return String(fromEnv).replace(/\/$/, '');
  }

  // Plesk: Document Root + /api proxy on same host → relative URLs
  if (typeof window !== 'undefined') {
    return '';
  }

  return 'http://localhost:3001';
}

const TEACHER_TOKEN_KEY = 'GOAL_TEACHER_TOKEN';
const STUDENT_SESSION_KEY = 'GOAL_STUDENT_SESSION';
const ACTIVE_CLASSROOM_KEY = 'GOAL_ACTIVE_CLASSROOM_ID';

export function getApiBase(): string {
  return resolveApiBase();
}

export function getTeacherToken(): string | null {
  try {
    return localStorage.getItem(TEACHER_TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setTeacherToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TEACHER_TOKEN_KEY, token);
    else localStorage.removeItem(TEACHER_TOKEN_KEY);
  } catch {
    // ignore
  }
}

export function getActiveClassroomId(): number | null {
  try {
    const raw = localStorage.getItem(ACTIVE_CLASSROOM_KEY);
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  } catch {
    return null;
  }
}

export function setActiveClassroomId(id: number | null) {
  try {
    if (id == null) localStorage.removeItem(ACTIVE_CLASSROOM_KEY);
    else localStorage.setItem(ACTIVE_CLASSROOM_KEY, String(id));
  } catch {
    // ignore
  }
}

export type StudentSession = {
  sessionToken: string;
  membershipId: number;
  classroomId: number;
  roomCode: string;
  alias: string;
  scenarioId?: string | null;
};

export function getStudentSession(): StudentSession | null {
  try {
    const raw = localStorage.getItem(STUDENT_SESSION_KEY);
    return raw ? (JSON.parse(raw) as StudentSession) : null;
  } catch {
    return null;
  }
}

export function setStudentSession(session: StudentSession | null) {
  try {
    if (session) localStorage.setItem(STUDENT_SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(STUDENT_SESSION_KEY);
  } catch {
    // ignore
  }
}

async function apiFetch(path: string, options: RequestInit = {}) {
  let res: Response;
  try {
    res = await fetch(`${getApiBase()}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
    });
  } catch {
    throw new Error(
      'API nicht erreichbar (Netzwerk/CORS). Prüfe, ob /api auf derselben Domain erreichbar ist und das Frontend neu gebaut wurde.'
    );
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(new Error(data.error || `API-Fehler ${res.status}`), data);
  }
  return data;
}

export async function teacherRegister(email: string, password: string, displayName?: string) {
  return apiFetch('/api/auth/teacher/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
}

export async function teacherVerify(token: string) {
  const data = await apiFetch('/api/auth/teacher/verify', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
  if (data.token) setTeacherToken(data.token);
  return data;
}

export async function teacherLogin(email: string, password: string) {
  const data = await apiFetch('/api/auth/teacher/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setTeacherToken(data.token);
  return data;
}

export async function teacherForgotPassword(email: string) {
  return apiFetch('/api/auth/teacher/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function teacherResendVerification(email: string) {
  return apiFetch('/api/auth/teacher/resend-verification', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function teacherResetPassword(token: string, password: string) {
  return apiFetch('/api/auth/teacher/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

export async function createClassroom(title: string, scenarioId?: string) {
  const token = getTeacherToken();
  if (!token) throw new Error('Nicht als Lehrer angemeldet.');
  const data = await apiFetch('/api/classrooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, scenarioId }),
  });
  if (data.classroom?.id) setActiveClassroomId(data.classroom.id);
  return data;
}

export async function listMyClassrooms() {
  const token = getTeacherToken();
  if (!token) throw new Error('Nicht als Lehrer angemeldet.');
  return apiFetch('/api/classrooms/mine', {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchClassroomSummary(classroomId: number) {
  const token = getTeacherToken();
  if (!token) throw new Error('Nicht als Lehrer angemeldet.');
  return apiFetch(`/api/classrooms/${classroomId}/summary`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function fetchCertificate(classroomId: number, runId: number) {
  const token = getTeacherToken();
  if (!token) throw new Error('Nicht als Lehrer angemeldet.');
  return apiFetch(`/api/classrooms/${classroomId}/certificate/${runId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function joinClassroom(roomCode: string, alias: string, pin: string) {
  const data = await apiFetch('/api/classrooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, alias, pin }),
  });
  const session: StudentSession = {
    sessionToken: data.sessionToken,
    membershipId: data.membershipId,
    classroomId: data.classroom.id,
    roomCode: data.classroom.roomCode,
    alias: data.alias,
    scenarioId: data.classroom.scenarioId,
  };
  setStudentSession(session);
  return session;
}

export async function loadCloudRun() {
  const session = getStudentSession();
  if (!session) return null;
  return apiFetch('/api/runs/me', {
    headers: { 'X-Student-Token': session.sessionToken },
  });
}

export async function saveCloudRun(
  gameState: unknown,
  extras?: { overallScore?: number; evaluation?: unknown }
) {
  const session = getStudentSession();
  if (!session) return null;
  return apiFetch('/api/runs/me', {
    method: 'PUT',
    headers: { 'X-Student-Token': session.sessionToken },
    body: JSON.stringify({
      gameState,
      overallScore: extras?.overallScore,
      evaluation: extras?.evaluation,
    }),
  });
}

export async function pingApi(): Promise<boolean> {
  try {
    const res = await fetch(`${getApiBase()}/api/health`);
    return res.ok;
  } catch {
    return false;
  }
}
