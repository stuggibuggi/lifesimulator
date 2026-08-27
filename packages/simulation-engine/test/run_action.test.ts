import { describe, expect, it } from 'vitest';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';
import { applyRunAction, createInitialGameState } from '../src';

describe('applyRunAction', () => {
  it('steps a month and persists rngState', () => {
    let state = createInitialGameState(
      {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Test',
      },
      [ALL_LIFE_GOALS[0]],
      4242
    );
    state = { ...state, rngState: 4242 };

    const first = applyRunAction({
      state,
      action: { type: 'STEP_MONTH' },
      events: ALL_LIFE_EVENTS,
    });

    expect(first.nextState.currentMonth).not.toBe(state.currentMonth);
    expect(typeof first.nextState.rngState).toBe('number');
    expect(first.nextState.rngState).not.toBe(state.rngState);

    if (first.triggeredEvent) {
      const choice = first.triggeredEvent.choices[0];
      const resolved = applyRunAction({
        state: first.nextState,
        action: {
          type: 'EVENT_CHOICE',
          eventId: first.triggeredEvent.id,
          choiceId: choice.id,
        },
        events: ALL_LIFE_EVENTS,
      });
      expect(resolved.nextState.activeEvent).toBeNull();
      expect(resolved.triggeredEvent).toBeNull();
    }
  });

  it('rejects STEP_MONTH while an event is active', () => {
    const state = createInitialGameState(
      {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Test',
      },
      [ALL_LIFE_GOALS[0]],
      7
    );
    const blocked = {
      ...state,
      activeEvent: ALL_LIFE_EVENTS[0],
    };

    expect(() =>
      applyRunAction({
        state: blocked,
        action: { type: 'STEP_MONTH' },
        events: ALL_LIFE_EVENTS,
      })
    ).toThrow(/ACTIVE_EVENT/);
  });

  it('rejects unknown event choices', () => {
    const state = {
      ...createInitialGameState(
        {
          name: 'Alex',
          avatar: 'student_boy',
          startCondition: 'FAMILY_SUPPORT',
          bio: 'Test',
        },
        [ALL_LIFE_GOALS[0]],
        7
      ),
      activeEvent: ALL_LIFE_EVENTS[0],
    };

    try {
      applyRunAction({
        state,
        action: {
          type: 'EVENT_CHOICE',
          eventId: ALL_LIFE_EVENTS[0].id,
          choiceId: 'missing_choice',
        },
        events: ALL_LIFE_EVENTS,
      });
      expect.unreachable('should throw');
    } catch (err) {
      expect((err as { code?: string }).code).toBe('UNPROCESSABLE');
    }
  });
});
