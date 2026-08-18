const DEFAULT_API =
  (typeof import.meta !== 'undefined' &&
    (import.meta as ImportMeta & { env?: { VITE_API_URL?: string } }).env?.VITE_API_URL) ||
  'http://localhost:3001';

const TEACHER_TOKEN_KEY = 'GOAL_TEACHER_TOKEN';
const STUDENT_SESSION_KEY = 'GOAL_STUDENT_SESSION';

export function getApiBase(): string {
  return (DEFAULT_API as string).replace(/\/$/, '');
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
  const res = await fetch(`${getApiBase()}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `API-Fehler ${res.status}`);
  }
  return data;
}

export async function teacherRegister(email: string, password: string, displayName?: string) {
  const data = await apiFetch('/api/auth/teacher/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, displayName }),
  });
  setTeacherToken(data.token);
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

export async function createClassroom(title: string, scenarioId?: string) {
  const token = getTeacherToken();
  if (!token) throw new Error('Nicht als Lehrer angemeldet.');
  return apiFetch('/api/classrooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify({ title, scenarioId }),
  });
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

export async function joinClassroom(roomCode: string, alias: string) {
  const data = await apiFetch('/api/classrooms/join', {
    method: 'POST',
    body: JSON.stringify({ roomCode, alias }),
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
