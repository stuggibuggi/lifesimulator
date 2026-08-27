import { describe, expect, it } from 'vitest';
import { isServerSimEnabled } from './gameStore';

describe('server sim eligibility', () => {
  it('enables only with flag and student session', () => {
    expect(isServerSimEnabled({ VITE_SERVER_SIM: '1' }, true)).toBe(true);
    expect(isServerSimEnabled({ VITE_SERVER_SIM: 'true' }, true)).toBe(true);
    expect(isServerSimEnabled({ VITE_SERVER_SIM: '1' }, false)).toBe(false);
    expect(isServerSimEnabled({}, true)).toBe(false);
  });
});
