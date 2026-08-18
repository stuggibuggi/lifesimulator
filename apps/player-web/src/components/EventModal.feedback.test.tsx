import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EventModal } from './EventModal';

vi.mock('../store/gameStore', () => ({
  useGameStore: () => ({
    gameState: null,
    eventChoiceFeedback: {
      eventTitle: 'Kaputtes Smartphone',
      choiceLabel: 'Reparieren lassen',
      learningTip: 'Eine Rücklage schützt dich vor teuren Überraschungen.',
      financialImpact: -249,
    },
    dismissEventFeedback: vi.fn(),
    handleEventChoice: vi.fn(),
  }),
}));

describe('EventModal feedback phase', () => {
  it('renders post-choice feedback without an active event', () => {
    const html = renderToStaticMarkup(<EventModal />);

    expect(html).toContain('Deine Entscheidung');
    expect(html).toContain('Reparieren lassen');
    expect(html).toContain('-249');
    expect(html).toContain('Eine Rücklage schützt dich vor teuren Überraschungen.');
    expect(html).toContain('Weiter');
  });
});
