import { describe, expect, it } from 'vitest';
import {
  createInitialGameState,
  stepSimulationMonth,
  applyEventChoice,
  toggleInsuranceContract,
  setMonthlySavingsRates,
} from '../src';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS, AVAILABLE_INSURANCES } from '@goal/game-content';
import { SeededRandom } from '../src/math/random';

describe('Vollständiger Lebenszyklus 16-67 Test (lifecycle.test.ts)', () => {
  it('simuliert einen vollständigen Lebenslauf von 16 bis 67 deterministisch', () => {
    const rng = new SeededRandom(9999);
    let state = createInitialGameState(
      {
        name: 'Mila',
        avatar: 'student_girl',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Möchte eine Ausbildung machen und finanziell unabhängig werden.',
      },
      [ALL_LIFE_GOALS[0], ALL_LIFE_GOALS[2], ALL_LIFE_GOALS[3]], // Ausbildung, Notgroschen, Schuldenfrei
      9999
    );

    // 1. Haftpflichtversicherung abschließen
    state = toggleInsuranceContract(state, AVAILABLE_INSURANCES[0]);
    expect(state.insurances.length).toBe(1);

    // 2. Sparrate festlegen (30 € Notgroschen)
    state = setMonthlySavingsRates(state, 30, 0);

    let monthsSimulated = 0;
    let eventsEncountered = 0;

    // Simuliere bis Alter 67 (51 Jahre x 12 Monate = 612 Monate)
    while (!state.isGameOver && monthsSimulated < 700) {
      const step = stepSimulationMonth(state, ALL_LIFE_EVENTS, rng);
      state = step.nextState;
      monthsSimulated++;

      if (step.triggeredEvent) {
        eventsEncountered++;
        // Wähle die erste Option des Events
        const firstChoice = step.triggeredEvent.choices[0];
        state = applyEventChoice(state, step.triggeredEvent, firstChoice);
      }
    }

    expect(state.currentAge).toBe(67);
    expect(state.isGameOver).toBe(true);
    expect(monthsSimulated).toBe(612);
    expect(eventsEncountered).toBeGreaterThan(0);
    expect(state.historySnapshots.length).toBe(612);
    expect(state.pastEvents.length).toBe(eventsEncountered);
  });
});
