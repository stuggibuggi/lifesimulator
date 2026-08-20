import { describe, expect, it } from 'vitest';
import {
  FINANCIAL_LEARNING_CARDS,
  LIFE_EVENT_LEARNING_CARD_MAP,
  getLearningCardForLifeEvent,
} from '@goal/game-content';

describe('life event learning card links', () => {
  it('maps common event topics to existing learning cards', () => {
    const cardIds = new Set(FINANCIAL_LEARNING_CARDS.map((card) => card.id));

    expect(LIFE_EVENT_LEARNING_CARD_MAP).toMatchObject({
      EVT_AGE_18_MILESTONE: 'CARD_DISPO',
      EVT_BNPL_TRAP: 'CARD_BNPL_RISK',
      EVT_ACCIDENT_BIKE: 'CARD_HAFTPFLICHT',
      EVT_PRE_RETIREMENT_BAV: 'CARD_BAV_AG_ZUSCHUSS',
      EVT_SURPRISE_UTILITY_BILL: 'CARD_NOTGROSCHEN',
    });
    expect(Object.values(LIFE_EVENT_LEARNING_CARD_MAP).every((cardId) => cardIds.has(cardId))).toBe(
      true
    );
    expect(getLearningCardForLifeEvent('EVT_ACCIDENT_BIKE')?.id).toBe('CARD_HAFTPFLICHT');
  });
});
