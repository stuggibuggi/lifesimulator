import { describe, expect, it } from 'vitest';
import { ALL_LIFE_GOALS } from '@goal/game-content';
import { applyLearningCard, createInitialGameState } from '../src';

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

describe('learning card knowledge rewards', () => {
  it('awards knowledge points once per card id', () => {
    const firstPass = applyLearningCard(freshState(), 'CARD_NOTGROSCHEN');
    const secondPass = applyLearningCard(firstPass, 'CARD_NOTGROSCHEN');

    expect(firstPass.metrics.knowledgePoints).toBe(30);
    expect(firstPass.unlockedAchievements).toContain('LEARNING_CARD_CARD_NOTGROSCHEN');
    expect(secondPass.metrics.knowledgePoints).toBe(30);
    expect(
      secondPass.unlockedAchievements.filter(
        (achievement) => achievement === 'LEARNING_CARD_CARD_NOTGROSCHEN'
      )
    ).toHaveLength(1);
  });

  it('caps learning card knowledge points at 100', () => {
    const state = {
      ...freshState(),
      metrics: { ...freshState().metrics, knowledgePoints: 96 },
    };

    const next = applyLearningCard(state, 'CARD_BRUTTO_NETTO');

    expect(next.metrics.knowledgePoints).toBe(100);
  });
});
