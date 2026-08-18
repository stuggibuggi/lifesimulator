import { describe, expect, it } from 'vitest';
import { formatEvaluationTitle, formatSaveFilename } from './EvaluationView.helpers';

describe('EvaluationView formatting helpers', () => {
  it('uses the scenario end age in the evaluation title', () => {
    expect(formatEvaluationTitle(32)).toBe('Abschlussbilanz mit 32 Jahren');
  });

  it('uses the scenario end age in the exported save filename', () => {
    expect(formatSaveFilename('Mina', 32)).toBe('GOAL_Lebenslauf_Mina_Alter32.json');
  });
});
