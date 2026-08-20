import { GameState } from '@goal/shared-types';

export const LEARNING_CARD_REWARD_POINTS = 10;

export function getLearningCardAchievementId(cardId: string): string {
  return `LEARNING_CARD_${cardId}`;
}

export function applyLearningCard(state: GameState, cardId: string): GameState {
  const achievementId = getLearningCardAchievementId(cardId);

  if (state.unlockedAchievements.includes(achievementId)) {
    return state;
  }

  return {
    ...state,
    metrics: {
      ...state.metrics,
      knowledgePoints: Math.min(
        100,
        state.metrics.knowledgePoints + LEARNING_CARD_REWARD_POINTS
      ),
    },
    unlockedAchievements: [...state.unlockedAchievements, achievementId],
  };
}
