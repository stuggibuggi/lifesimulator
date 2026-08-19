import { describe, expect, it } from 'vitest';
import { ALL_LIFE_EVENTS } from '@goal/game-content';
import { hasLifeEventIconMapping } from './EventModal';

describe('EventModal icon mapping', () => {
  it('maps every life-event icon used by content', () => {
    const missingIcons = Array.from(new Set(ALL_LIFE_EVENTS.map((event) => event.icon))).filter(
      (icon) => !hasLifeEventIconMapping(icon)
    );

    expect(missingIcons).toEqual([]);
  });
});
