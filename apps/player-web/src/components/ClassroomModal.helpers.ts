export type ClassroomMemberRow = {
  alias: string;
  runId: number | null;
  currentAge: number | null;
  overallScore: number | null;
  grade: string | null;
  isGameOver: boolean;
};

export function formatClassroomMemberAge(member: ClassroomMemberRow): string {
  return member.currentAge == null ? '–' : String(member.currentAge);
}

export function formatClassroomMemberStatus(member: ClassroomMemberRow): string {
  if (!member.isGameOver) return 'läuft';
  return `fertig Note ${member.grade ?? '–'}`;
}

export function formatClassroomMemberScore(member: ClassroomMemberRow): string {
  return member.overallScore == null ? '–' : String(member.overallScore);
}

export function canLoadClassroomCertificate(member: ClassroomMemberRow): boolean {
  return member.isGameOver && member.runId != null;
}

export type ClassroomExpiryNotice = {
  label: string;
  tone: 'normal' | 'warning' | 'expired';
};

function formatExpiryDate(date: Date): string {
  const day = String(date.getUTCDate()).padStart(2, '0');
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  return `${day}.${month}.${date.getUTCFullYear()}`;
}

export function getClassroomExpiryNotice(
  expiresAt?: string | null,
  now = new Date()
): ClassroomExpiryNotice | null {
  if (!expiresAt) return null;

  const expiry = new Date(expiresAt);
  if (Number.isNaN(expiry.getTime())) return null;

  if (expiry.getTime() < now.getTime()) {
    return { label: 'abgelaufen', tone: 'expired' };
  }

  const daysRemaining = (expiry.getTime() - now.getTime()) / (24 * 60 * 60 * 1000);
  return {
    label: `läuft ab am ${formatExpiryDate(expiry)}`,
    tone: daysRemaining <= 7 ? 'warning' : 'normal',
  };
}
