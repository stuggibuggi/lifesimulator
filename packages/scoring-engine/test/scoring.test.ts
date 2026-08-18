import { describe, expect, it } from 'vitest';
import { evaluateLifeRun } from '../src/evaluator';
import { createInitialGameState } from '@goal/simulation-engine';
import { ALL_LIFE_GOALS } from '@goal/game-content';

describe('Scoring Engine Tests (evaluator.ts)', () => {
  it('bewertet einen soliden Lebenslauf ausgewogen und mehrdimensional', () => {
    const initialState = createInitialGameState(
      {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Zielstrebig und budgetbewusst',
      },
      ALL_LIFE_GOALS.slice(0, 3),
      12345
    );

    // Simuliere Zustand mit 30 Jahren
    const stateAt30 = {
      ...initialState,
      currentAge: 30,
      goals: initialState.goals.map((g) => ({ ...g, isAchieved: true, currentValue: g.targetValue })),
      bankAccount: { giroBalance: 3200, overdraftLimit: 1000, overdraftInterestAnnual: 0.115 },
      savingsAccount: { tagesgeldBalance: 6000, interestRateAnnual: 0.025, autoSaveRateMonthly: 100 },
      investmentAccount: { etfBalance: 15000, monthlySparrate: 150, totalDeposited: 10000, averageAnnualReturn: 0.06 },
      insurances: [
        {
          id: '1',
          type: 'HAFTPFLICHT' as const,
          name: 'Haftpflicht',
          providerName: 'Secura',
          monthlyPremium: 5,
          coverageLimit: 10000000,
          deductible: 0,
          waitingPeriodMonthsRemaining: 0,
          isActive: true,
          explanation: 'Wichtig',
        },
      ],
      metrics: {
        health: 85,
        happiness: 80,
        stress: 30,
        freeTimeHoursWeekly: 25,
        knowledgePoints: 75,
      },
    };

    const evaluation = evaluateLifeRun(stateAt30);
    expect(evaluation.overallScore).toBeGreaterThanOrEqual(75);
    expect(evaluation.goalsAchievedCount).toBe(3);
    expect(evaluation.grade).toMatch(/A|A\+|B/);
    expect(evaluation.dimensions.goals.score).toBe(100);
    expect(evaluation.dimensions.riskProtection.strengths.length).toBeGreaterThan(0);
    expect(evaluation.whatIfScenarios.length).toBe(2);
  });
});
