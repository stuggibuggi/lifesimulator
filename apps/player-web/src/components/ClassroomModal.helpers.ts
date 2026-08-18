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
