import { describe, expect, it } from 'vitest';
import {
  applyEventChoice,
  checkAndTriggerEvent,
  createInitialGameState,
  getEligibleEvents,
  SeededRandom,
  stepSimulationMonth,
  updateGoalsProgress,
} from '../src';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';
import { LifeEvent } from '@goal/shared-types';

function freshState() {
  return createInitialGameState(
    {
      name: 'Alex',
      avatar: 'student_boy',
      startCondition: 'FAMILY_SUPPORT',
      bio: 'Test',
    },
    [ALL_LIFE_GOALS[0]],
    42
  );
}

describe('Lebensereignisse werden nach der Entscheidung nicht wiederholt', () => {
  it('schließt ein bereits entschiedenes Ereignis von weiteren Auslösungen aus', () => {
    const state = {
      ...freshState(),
      currentAge: 18,
      currentMonth: 2,
      pastEvents: [
        {
          eventId: 'EVT_AGE_18_MILESTONE',
          eventTitle: 'Volljährigkeit',
          choiceId: 'c_dispo_refuse',
          choiceLabel: 'Ablehnen',
          age: 18,
          month: 1,
          financialImpact: 0,
        },
      ],
    };

    const eligible = getEligibleEvents(ALL_LIFE_EVENTS, state);
    expect(eligible.some((event) => event.id === 'EVT_AGE_18_MILESTONE')).toBe(false);

    const triggered = checkAndTriggerEvent(ALL_LIFE_EVENTS, state, new SeededRandom(1));
    expect(triggered?.id).not.toBe('EVT_AGE_18_MILESTONE');
  });

  it('löst die Volljährigkeit nach der Bestätigung in den restlichen Monaten mit 18 nicht erneut aus', () => {
    const rng = new SeededRandom(7);
    let state = { ...freshState(), currentAge: 17, currentMonth: 12 };

    const birthdayStep = stepSimulationMonth(state, ALL_LIFE_EVENTS, rng);
    expect(birthdayStep.triggeredEvent?.id).toBe('EVT_AGE_18_MILESTONE');

    state = applyEventChoice(
      birthdayStep.nextState,
      birthdayStep.triggeredEvent!,
      birthdayStep.triggeredEvent!.choices[0]
    );
    expect(state.activeEvent).toBeNull();

    while (state.currentAge === 18 && !state.isGameOver) {
      const step = stepSimulationMonth(state, ALL_LIFE_EVENTS, rng);
      expect(step.triggeredEvent?.id).not.toBe('EVT_AGE_18_MILESTONE');

      state = step.nextState;
      if (state.activeEvent) {
        state = applyEventChoice(state, state.activeEvent, state.activeEvent.choices[0]);
      }
    }
  });
});

function testEvent(id: string): LifeEvent {
  return {
    id,
    title: id,
    description: 'Testereignis',
    category: 'FINANCIAL',
    minAge: 16,
    maxAge: 67,
    probability: 1,
    icon: 'Test',
    choices: [
      {
        id: `${id}_choice`,
        label: 'OK',
        description: 'Testentscheidung',
        costImmediate: 0,
        learningTip: 'Test',
      },
    ],
  };
}

describe('Lebensereignisse berücksichtigen Eligibility-Regeln', () => {
  it('filtert Ereignisse, deren benötigte Haftpflichtversicherung fehlt', () => {
    const state = { ...freshState(), currentAge: 25 };
    const events = [
      {
        ...testEvent('EVT_NEEDS_HAFTPFLICHT'),
        requires: { hasHaftpflicht: true },
      },
    ] as LifeEvent[];

    expect(getEligibleEvents(events, state)).toHaveLength(0);
  });

  it('erlaubt Ereignisse, wenn alle benötigten Zustände erfüllt sind', () => {
    const state = {
      ...freshState(),
      currentAge: 30,
      housing: { ...freshState().housing, type: 'PROPERTY_OWNERSHIP' as const },
      family: { ...freshState().family, status: 'PARTNERSHIP' as const },
      savingsAccount: { ...freshState().savingsAccount, tagesgeldBalance: 6000 },
      budget: {
        ...freshState().budget,
        totalFixedExpenses: 1500,
        totalVariableExpenses: 500,
      },
      insurances: [
        {
          id: 'INS_TEST_HAFTPFLICHT',
          type: 'HAFTPFLICHT' as const,
          name: 'Privathaftpflicht',
          providerName: 'Test',
          monthlyPremium: 5,
          coverageLimit: 10_000_000,
          deductible: 0,
          availableDeductibles: [0],
          waitingPeriodMonthsRemaining: 0,
          initialWaitingPeriodMonths: 0,
          importanceTier: 'ESSENTIAL' as const,
          isActive: true,
          explanation: 'Test',
        },
      ],
    };
    const events = [
      {
        ...testEvent('EVT_MATCHES_ALL_RULES'),
        requires: {
          hasHaftpflicht: true,
          hasPartner: true,
          isHomeOwner: true,
          minEmergencyMonths: 3,
        },
      },
    ] as LifeEvent[];

    expect(getEligibleEvents(events, state).map((event) => event.id)).toEqual([
      'EVT_MATCHES_ALL_RULES',
    ]);
  });

  it('filtert Ereignisse, wenn die Notfallreserve unter minEmergencyMonths liegt', () => {
    const state = {
      ...freshState(),
      currentAge: 25,
      savingsAccount: { ...freshState().savingsAccount, tagesgeldBalance: 1000 },
      budget: {
        ...freshState().budget,
        totalFixedExpenses: 1500,
        totalVariableExpenses: 500,
      },
    };
    const events = [
      {
        ...testEvent('EVT_NEEDS_EMERGENCY_FUND'),
        requires: { minEmergencyMonths: 3 },
      },
    ] as LifeEvent[];

    expect(getEligibleEvents(events, state)).toHaveLength(0);
  });

  it('Haftpflicht-Lehrevents bleiben ohne Versicherung sichtbar', () => {
    const state = { ...freshState(), currentAge: 25 };
    const uninsuredEligible = getEligibleEvents(ALL_LIFE_EVENTS, state).map((event) => event.id);

    expect(uninsuredEligible).toContain('EVT_WATER_DAMAGE_NEIGHBOR');
    expect(uninsuredEligible).toContain('EVT_ACCIDENT_BIKE');
  });

  it('filtert Ereignisse, wenn Ausschlussregeln auf den aktuellen Zustand zutreffen', () => {
    const state = {
      ...freshState(),
      currentAge: 30,
      family: { ...freshState().family, status: 'MARRIED' as const },
    };
    const events = [
      {
        ...testEvent('EVT_SINGLE_ONLY'),
        excludes: { hasPartner: true },
      },
    ] as LifeEvent[];

    expect(getEligibleEvents(events, state)).toHaveLength(0);
  });
});

describe('Lebensereignisse für Midlife und Ruhestandsübergang', () => {
  function eligibleEventIdsAtAge(age: number): string[] {
    const state = { ...freshState(), currentAge: age };

    return getEligibleEvents(ALL_LIFE_EVENTS, state).map((event) => event.id);
  }

  it('enthält die Midlife- und Vorruhestandsereignisse mit 55 Jahren', () => {
    expect(eligibleEventIdsAtAge(55)).toEqual(
      expect.arrayContaining([
        'EVT_MIDLIFE_JOB_CHANGE',
        'EVT_PARENT_CARE',
        'EVT_INHERITANCE_MODEST',
        'EVT_HEALTH_CHECK_50',
        'EVT_PRE_RETIREMENT_BAV',
      ])
    );
  });

  it('enthält den Ruhestandsübergang mit 66 und 67 Jahren', () => {
    expect(eligibleEventIdsAtAge(66)).toContain('EVT_RETIREMENT_TRANSITION');
    expect(eligibleEventIdsAtAge(67)).toContain('EVT_RETIREMENT_TRANSITION');
  });
});

describe('careerDelta on event choices', () => {
  it('applies careerDelta to advancement level and gross', () => {
    const state = freshState();
    state.career = {
      ...state.career,
      type: 'ANGESTELLTER',
      isCompleted: true,
      monthlySalaryGross: 3000,
      fullTimeGrossSalary: 3000,
      timeCommitmentHoursWeekly: 40,
      careerAdvancementLevel: 1,
      monthsSinceLastRaiseAttempt: 12,
      monthsSinceLastTraining: 24,
    };
    const event = ALL_LIFE_EVENTS.find((e) => e.id === 'EVT_CAREER_LEADERSHIP_STEP')!;
    const choice = event.choices.find((c) => c.id === 'c_leader_accept')!;
    const next = applyEventChoice(state, event, choice);
    expect(next.career.careerAdvancementLevel).toBe(2);
    expect(next.career.fullTimeGrossSalary).toBe(Math.round(3000 * 1.05));
  });
});

describe('GOAL_REISEN', () => {
  it('wird nach dem Urlaubsnotfall und dem Städtetrip erreicht', () => {
    const travelGoal = ALL_LIFE_GOALS.find((goal) => goal.id === 'GOAL_REISEN');
    const cityBreakEvent = ALL_LIFE_EVENTS.find((event) => event.id === 'EVT_TRAVEL_CITY_BREAK');

    expect(travelGoal).toBeDefined();
    expect(cityBreakEvent).toBeDefined();
    expect(cityBreakEvent?.minAge).toBe(18);
    expect(cityBreakEvent?.maxAge).toBe(50);
    expect(cityBreakEvent?.choices.map((choice) => choice.id)).toEqual([
      'c_travel_budget_trip',
      'c_travel_luxury_trip',
    ]);

    const state = {
      ...freshState(),
      goals: [{ ...travelGoal!, currentValue: 0, isAchieved: false }],
      pastEvents: [
        {
          eventId: 'EVT_TRAVEL_HEALTH_EMERGENCY',
          eventTitle: 'Urlaubsnotfall',
          choiceId: 'c_travel_pay_self',
          choiceLabel: 'Kosten selbst tragen',
          age: 19,
          month: 5,
          financialImpact: -1100,
        },
        {
          eventId: cityBreakEvent!.id,
          eventTitle: cityBreakEvent!.title,
          choiceId: 'c_travel_budget_trip',
          choiceLabel: 'Budget-Städtetrip',
          age: 22,
          month: 7,
          financialImpact: -450,
        },
      ],
    };

    const [updatedGoal] = updateGoalsProgress(state);

    expect(updatedGoal.currentValue).toBe(2);
    expect(updatedGoal.isAchieved).toBe(true);
  });
});
