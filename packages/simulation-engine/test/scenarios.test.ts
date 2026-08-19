import { describe, expect, it } from 'vitest';
import { ALL_LIFE_GOALS, EDUCATIONAL_SCENARIOS } from '@goal/game-content';

describe('Phase C classroom scenarios', () => {
  it('contains the insurance, pension, tax, and mobility focus scenarios with valid goals', () => {
    const scenarioIds = EDUCATIONAL_SCENARIOS.map((scenario) => scenario.id);
    const goalIds = new Set(ALL_LIFE_GOALS.map((goal) => goal.id));

    expect(scenarioIds).toEqual(
      expect.arrayContaining([
        'SCENARIO_VERSICHERUNG',
        'SCENARIO_RENTE_BAV',
        'SCENARIO_STEUERN',
        'SCENARIO_MOBILITAET',
      ])
    );

    for (const scenario of EDUCATIONAL_SCENARIOS.filter((candidate) =>
      scenarioIds.includes(candidate.id)
    )) {
      expect(scenario.startAge).toBeLessThan(scenario.endAge);
      expect(scenario.recommendedGoals.length).toBeGreaterThanOrEqual(2);
      expect(scenario.recommendedGoals.every((goalId) => goalIds.has(goalId))).toBe(true);
    }
  });
});
