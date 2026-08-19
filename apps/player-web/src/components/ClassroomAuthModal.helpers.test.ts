import { describe, expect, it } from 'vitest';
import { EDUCATIONAL_SCENARIOS } from '@goal/game-content';
import {
  normalizeClassroomCharacterName,
  resolveClassroomJoinNextStep,
  toClassroomExpiresAt,
} from './ClassroomAuthModal.helpers';

describe('ClassroomAuthModal join flow helpers', () => {
  it('keeps cloud saves ahead of fixed classroom scenarios', () => {
    const scenario = EDUCATIONAL_SCENARIOS[1];

    expect(
      resolveClassroomJoinNextStep({ hasCloudGameState: true, scenarioId: scenario.id })
    ).toEqual({ type: 'IMPORT_CLOUD' });
  });

  it('auto-starts the classroom scenario when there is no cloud save', () => {
    const scenario = EDUCATIONAL_SCENARIOS[1];

    expect(
      resolveClassroomJoinNextStep({ hasCloudGameState: false, scenarioId: scenario.id })
    ).toEqual({ type: 'START_SCENARIO', scenario });
  });

  it('falls back to free scenario selection without a valid fixed scenario', () => {
    expect(resolveClassroomJoinNextStep({ hasCloudGameState: false, scenarioId: null })).toEqual({
      type: 'OPEN_SCENARIO_PICKER',
    });
    expect(
      resolveClassroomJoinNextStep({ hasCloudGameState: false, scenarioId: 'missing-scenario' })
    ).toEqual({ type: 'OPEN_SCENARIO_PICKER' });
  });

  it('uses the player name first and falls back to alias for classroom starts', () => {
    expect(normalizeClassroomCharacterName('Fuchs42', '  Mia  ')).toBe('Mia');
    expect(normalizeClassroomCharacterName('Fuchs42', '   ')).toBe('Fuchs42');
    expect(normalizeClassroomCharacterName('', '')).toBe('Alex');
  });

  it('converts expiry date inputs to end-of-day ISO timestamps', () => {
    expect(toClassroomExpiresAt('2026-11-17')).toBe('2026-11-17T23:59:59.000Z');
    expect(toClassroomExpiresAt('')).toBeNull();
  });
});
