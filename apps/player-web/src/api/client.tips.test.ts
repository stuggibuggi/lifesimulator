import { afterEach, describe, expect, it, vi } from 'vitest';
import { enhanceLearningTip } from './client';

describe('enhanceLearningTip result shape', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns enabled and tip from the API body', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ enabled: true, tip: 'KI Text.' }),
      }))
    );

    await expect(
      enhanceLearningTip({
        learningTip: 'Original.',
        eventId: 'EVT_TEST',
        choiceId: 'c1',
        age: 18,
      })
    ).resolves.toEqual({ enabled: true, tip: 'KI Text.' });
  });
});
