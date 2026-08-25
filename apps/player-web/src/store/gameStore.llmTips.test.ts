import { describe, expect, it } from 'vitest';
import { buildTipEnhancementPayload, shouldRequestEnhancedTip } from './gameStore';

const baseFeedback = {
  eventId: 'EVT_TEST',
  choiceId: 'choice_a',
  eventTitle: 'Testereignis',
  choiceLabel: 'Auswahl A',
  learningTip: 'Bleib beim Budget.',
  financialImpact: -10,
  age: 17,
  scenarioId: 'SCENARIO_AUSBILDUNG',
  hasClassroomTipOverride: false,
  tipSource: 'static' as const,
};

describe('LLM tip wiring helpers', () => {
  it('enables enhancement only behind the VITE_LLM_TIPS flag', () => {
    expect(shouldRequestEnhancedTip(baseFeedback, { VITE_LLM_TIPS: '1' })).toBe(true);
    expect(shouldRequestEnhancedTip(baseFeedback, { VITE_LLM_TIPS: 'true' })).toBe(true);
    expect(shouldRequestEnhancedTip(baseFeedback, {})).toBe(false);
  });

  it('skips enhancement when a classroom override is already applied', () => {
    expect(
      shouldRequestEnhancedTip(
        { ...baseFeedback, learningTip: 'Lehrkraft-Tipp.', hasClassroomTipOverride: true },
        { VITE_LLM_TIPS: '1' }
      )
    ).toBe(false);
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
});
