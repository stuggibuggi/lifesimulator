import { describe, expect, it } from 'vitest';
import {
  canLoadClassroomCertificate,
  formatClassroomMemberAge,
  formatClassroomMemberScore,
  formatClassroomMemberStatus,
} from './ClassroomModal.helpers';

describe('ClassroomModal member row helpers', () => {
  it('formats running members with age, running status, and empty score', () => {
    const member = {
      alias: 'Fuchs42',
      runId: 12,
      currentAge: 19,
      isGameOver: false,
      overallScore: null,
      grade: null,
    };

    expect(formatClassroomMemberAge(member)).toBe('19');
    expect(formatClassroomMemberStatus(member)).toBe('läuft');
    expect(formatClassroomMemberScore(member)).toBe('–');
    expect(canLoadClassroomCertificate(member)).toBe(false);
  });

  it('formats finished members with grade, score, and certificate eligibility', () => {
    const member = {
      alias: 'Igel7',
      runId: 13,
      currentAge: 67,
      isGameOver: true,
      overallScore: 88,
      grade: 'A',
    };

    expect(formatClassroomMemberAge(member)).toBe('67');
    expect(formatClassroomMemberStatus(member)).toBe('fertig Note A');
    expect(formatClassroomMemberScore(member)).toBe('88');
    expect(canLoadClassroomCertificate(member)).toBe(true);
  });
});
