import { describe, expect, it } from 'vitest';
import { SeededRandom } from '../src/math/random';

describe('SeededRandom state', () => {
  it('round-trips getState/fromState after draws', () => {
    const a = new SeededRandom(42);
    a.next();
    a.next();
    const b = SeededRandom.fromState(a.getState());
    expect(b.next()).toBe(a.next());
    expect(b.next()).toBe(a.next());
  });

  it('fromState(0) does not collapse to a broken generator', () => {
    const rng = SeededRandom.fromState(0);
    expect(Number.isFinite(rng.next())).toBe(true);
  });
});
