import { describe, expect, it } from 'vitest';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';
import {
  applyRunAction,
  createInitialGameState,
  SeededRandom,
  stepSimulationMonth,
  applyEventChoice,
} from '../src';

describe('server/local parity', () => {
  it('matches local stepping for a fixed seed across several months', () => {
    const seed = 7777;
    let local = createInitialGameState(
      {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Parity',
      },
      [ALL_LIFE_GOALS[0]],
      seed
    );
    local = { ...local, rngState: seed };
    let server = { ...local };

    const localRng = SeededRandom.fromState(seed);

    for (let i = 0; i < 8; i++) {
      if (local.activeEvent) {
        const choice = local.activeEvent.choices[0];
        local = applyEventChoice(local, local.activeEvent, choice);
        local = { ...local, rngState: localRng.getState() };
        const resolved = applyRunAction({
          state: server,
          action: {
            type: 'EVENT_CHOICE',
            eventId: server.activeEvent!.id,
            choiceId: choice.id,
          },
          events: ALL_LIFE_EVENTS,
        });
        server = resolved.nextState;
      }

      const localStep = stepSimulationMonth(local, ALL_LIFE_EVENTS, localRng);
      local = { ...localStep.nextState, rngState: localRng.getState() };

      const serverStep = applyRunAction({
        state: server,
        action: { type: 'STEP_MONTH' },
        events: ALL_LIFE_EVENTS,
      });
      server = serverStep.nextState;

      expect(server.currentAge).toBe(local.currentAge);
      expect(server.currentMonth).toBe(local.currentMonth);
      expect(server.bankAccount.giroBalance).toBe(local.bankAccount.giroBalance);
      expect(server.rngState).toBe(local.rngState);
      expect(server.activeEvent?.id ?? null).toBe(localStep.triggeredEvent?.id ?? local.activeEvent?.id ?? null);
    }
  });
});
