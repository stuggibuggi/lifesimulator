import { describe, expect, it } from 'vitest';
import {
  applyEventChoice,
  checkAndTriggerEvent,
  createInitialGameState,
  getEligibleEvents,
  SeededRandom,
  stepSimulationMonth,
} from '../src';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';

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
