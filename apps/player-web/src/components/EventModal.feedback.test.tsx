import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { EventModal } from './EventModal';
import { EventTipCard } from './EventModal.TipCard';
import type { EventChoiceFeedback } from '../store/gameStore';

const staticFeedback: EventChoiceFeedback = {
  eventId: 'EVT_PHONE_BROKEN',
  choiceId: 'repair',
  eventTitle: 'Kaputtes Smartphone',
  choiceLabel: 'Reparieren lassen',
  learningTip: 'Eine Rücklage schützt dich vor teuren Überraschungen.',
  financialImpact: -249,
  age: 17,
  hasClassroomTipOverride: false,
  tipSource: 'static',
  tipRequestStatus: 'loading',
  canRetry: false,
};

vi.mock('../store/gameStore', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../store/gameStore')>();
  return {
    ...actual,
    useGameStore: () => ({
      gameState: null,
      eventChoiceFeedback: staticFeedback,
      dismissEventFeedback: vi.fn(),
      handleEventChoice: vi.fn(),
      retryEnhancedTip: vi.fn(),
    }),
  };
});

describe('EventModal feedback phase', () => {
  it('renders post-choice feedback without an active event', () => {
    const html = renderToStaticMarkup(<EventModal />);

    expect(html).toContain('Deine Entscheidung');
    expect(html).toContain('Reparieren lassen');
    expect(html).toContain('-249');
    expect(html).toContain('Eine Rücklage schützt dich vor teuren Überraschungen.');
    expect(html).toContain('Lerntipp');
    expect(html).toContain('Eine KI-Variante wird geprüft.');
    expect(html).toContain('Weiter');
  });

  it('labels a classroom override and hides retry', () => {
    const html = renderToStaticMarkup(
      <EventTipCard
        feedback={{
          ...staticFeedback,
          learningTip: 'Sparplan der Klasse.',
          hasClassroomTipOverride: true,
          tipSource: 'classroom',
          tipRequestStatus: 'idle',
          canRetry: false,
        }}
        onRetry={() => undefined}
      />
    );
    expect(html).toContain('Tipp deiner Lehrkraft');
    expect(html).toContain('Sparplan der Klasse.');
    expect(html).not.toContain('Erneut versuchen');
    expect(html).not.toContain('Eine KI-Variante wird geprüft.');
  });

  it('shows retry on a failed enhancement', () => {
    const html = renderToStaticMarkup(
      <EventTipCard
        feedback={{
          ...staticFeedback,
          tipSource: 'static',
          tipRequestStatus: 'failed',
          canRetry: true,
        }}
        onRetry={() => undefined}
      />
    );
    expect(html).toContain('Erneut versuchen');
  });

  it('compacts a long tip behind Mehr anzeigen', () => {
    const longTip = `${'Spare regelmäßig. '.repeat(20)}Ende.`;
    const html = renderToStaticMarkup(
      <EventTipCard
        feedback={{
          ...staticFeedback,
          learningTip: longTip,
          tipSource: 'llm',
          tipRequestStatus: 'ready',
          canRetry: false,
        }}
        onRetry={() => undefined}
      />
    );
    expect(html).toContain('KI-Tipp');
    expect(html).toContain('Mehr anzeigen');
    expect(html).not.toContain('Ende.');
  });
});
