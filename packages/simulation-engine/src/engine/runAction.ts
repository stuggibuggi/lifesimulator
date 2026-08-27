import type { GameState, LifeEvent } from '@goal/shared-types';
import { SeededRandom } from '../math/random';
import { stepSimulationMonth } from './monthStep';
import { applyEventChoice } from './eventEngine';

export type RunAction =
  | { type: 'STEP_MONTH' }
  | { type: 'EVENT_CHOICE'; eventId: string; choiceId: string };

export type ApplyRunActionResult = {
  nextState: GameState;
  triggeredEvent: LifeEvent | null;
  deltas: { giroDelta: number };
};

function rngFromState(state: GameState): SeededRandom {
  if (typeof state.rngState === 'number') {
    return SeededRandom.fromState(state.rngState);
  }
  return new SeededRandom(state.seed);
}

export function applyRunAction(input: {
  state: GameState;
  action: RunAction;
  events: LifeEvent[];
}): ApplyRunActionResult {
  const giroBefore = input.state.bankAccount.giroBalance;
  const rng = rngFromState(input.state);

  if (input.action.type === 'STEP_MONTH') {
    if (input.state.activeEvent) {
      throw Object.assign(new Error('ACTIVE_EVENT'), { code: 'CONFLICT' });
    }
    const result = stepSimulationMonth(input.state, input.events, rng);
    const nextState: GameState = {
      ...result.nextState,
      rngState: rng.getState(),
    };
    return {
      nextState,
      triggeredEvent: result.triggeredEvent,
      deltas: { giroDelta: nextState.bankAccount.giroBalance - giroBefore },
    };
  }

  const eventAction = input.action;
  const active = input.state.activeEvent;
  if (!active || active.id !== eventAction.eventId) {
    throw Object.assign(new Error('EVENT_MISMATCH'), { code: 'CONFLICT' });
  }
  const choice = active.choices.find((c) => c.id === eventAction.choiceId);
  if (!choice) {
    throw Object.assign(new Error('UNKNOWN_CHOICE'), { code: 'UNPROCESSABLE' });
  }

  const next = applyEventChoice(input.state, active, choice);
  const nextState: GameState = {
    ...next,
    rngState: rng.getState(),
  };
  return {
    nextState,
    triggeredEvent: null,
    deltas: { giroDelta: nextState.bankAccount.giroBalance - giroBefore },
  };
}
