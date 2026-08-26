import { describe, expect, it } from 'vitest';
import {
  applyTipEnhancementResult,
  buildTipEnhancementPayload,
  markTipRequestLoading,
  shouldRequestEnhancedTip,
  type EventChoiceFeedback,
} from './gameStore';

const baseFeedback: EventChoiceFeedback = {
  eventId: 'EVT_TEST',
  choiceId: 'choice_a',
  eventTitle: 'Testereignis',
  choiceLabel: 'Auswahl A',
  learningTip: 'Bleib beim Budget.',
  financialImpact: -10,
  age: 17,
  scenarioId: 'SCENARIO_AUSBILDUNG',
  hasClassroomTipOverride: false,
  tipSource: 'static',
  tipRequestStatus: 'idle',
  canRetry: false,
};

describe('LLM tip wiring helpers', () => {
  it('requests enhancement by default when no classroom override is set', () => {
    expect(shouldRequestEnhancedTip(baseFeedback)).toBe(true);
  });

  it('skips enhancement when a classroom override is already applied', () => {
    expect(
      shouldRequestEnhancedTip({
        ...baseFeedback,
        learningTip: 'Lehrkraft-Tipp.',
        hasClassroomTipOverride: true,
      })
    ).toBe(false);
  });

  it('skips enhancement when the static tip is empty', () => {
    expect(shouldRequestEnhancedTip({ ...baseFeedback, learningTip: '   ' })).toBe(false);
  });

  it('builds an anonymous enhancement payload', () => {
    expect(buildTipEnhancementPayload(baseFeedback)).toEqual({
      learningTip: 'Bleib beim Budget.',
      eventId: 'EVT_TEST',
      choiceId: 'choice_a',
      age: 17,
      scenarioId: 'SCENARIO_AUSBILDUNG',
    });
  });

  it('marks eligible feedback as loading before the request', () => {
    expect(markTipRequestLoading(baseFeedback)).toMatchObject({
      tipRequestStatus: 'loading',
      canRetry: false,
      tipSource: 'static',
    });
  });

  it('keeps classroom overrides idle and never loading', () => {
    const classroom = markTipRequestLoading({
      ...baseFeedback,
      hasClassroomTipOverride: true,
      tipSource: 'classroom',
      learningTip: 'Lehrkraft-Tipp.',
    });
    expect(classroom.tipRequestStatus).toBe('idle');
    expect(classroom.canRetry).toBe(false);
  });

  it('applies an enhanced tip when the API returns a different enabled tip', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, {
      enabled: true,
      tip: 'Vergleiche die Zinsen zuerst.',
    });
    expect(next.eventChoiceFeedback).toMatchObject({
      learningTip: 'Vergleiche die Zinsen zuerst.',
      tipSource: 'llm',
      tipRequestStatus: 'ready',
      canRetry: false,
    });
  });

  it('stays on the static tip without retry when the API kill switch is off', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, {
      enabled: false,
      tip: 'Bleib beim Budget.',
    });
    expect(next.eventChoiceFeedback).toMatchObject({
      learningTip: 'Bleib beim Budget.',
      tipSource: 'static',
      tipRequestStatus: 'ready',
      canRetry: false,
    });
  });

  it('keeps the static tip and allows retry when the provider falls back', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, {
      enabled: true,
      tip: 'Bleib beim Budget.',
    });
    expect(next.eventChoiceFeedback).toMatchObject({
      learningTip: 'Bleib beim Budget.',
      tipSource: 'static',
      tipRequestStatus: 'failed',
      canRetry: true,
    });
  });

  it('allows retry when the request fails', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(loading, baseFeedback, null, true);
    expect(next.eventChoiceFeedback).toMatchObject({
      tipSource: 'static',
      tipRequestStatus: 'failed',
      canRetry: true,
    });
  });

  it('ignores stale enhancement results after the feedback event changed', () => {
    const loading = markTipRequestLoading(baseFeedback);
    const next = applyTipEnhancementResult(
      loading,
      { eventId: 'EVT_OTHER', choiceId: 'choice_a' },
      {
        enabled: true,
        tip: 'Anderer Tipp.',
      }
    );
    expect(next).toEqual({});
  });
});
