import { describe, expect, it } from 'vitest';
import {
  createInitialGameState,
  SeededRandom,
  stepSimulationMonth,
} from '../src';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';

function employedState() {
  const base = createInitialGameState(
    { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: 'T' },
    [ALL_LIFE_GOALS[0]],
    42
  );
  return {
    ...base,
    currentMonth: 12,
    career: {
      ...base.career,
      type: 'ANGESTELLTER' as const,
      title: 'Fachkraft',
      branch: 'IT',
      isCompleted: true,
      monthlySalaryGross: 3000,
      monthlySalaryNet: 2100,
      fullTimeGrossSalary: 3000,
      timeCommitmentHoursWeekly: 40,
      careerAdvancementLevel: 1,
      monthsSinceLastRaiseAttempt: 5,
      monthsSinceLastTraining: 10,
    },
  };
}

describe('career month counters', () => {
  it('increments raise and training month counters each month', () => {
    const before = employedState();
    before.currentMonth = 3;
    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));
    expect(nextState.career.monthsSinceLastRaiseAttempt).toBe(6);
    expect(nextState.career.monthsSinceLastTraining).toBe(11);
  });

  it('applies year-end raise to fullTimeGrossSalary', () => {
    const before = employedState();
    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));
    expect(nextState.career.fullTimeGrossSalary).toBe(Math.round(3000 * 1.025));
    expect(nextState.career.monthlySalaryGross).toBe(Math.round(3000 * 1.025));
  });
});
