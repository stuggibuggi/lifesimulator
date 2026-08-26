import { describe, expect, it } from 'vitest';
import {
  getEventTipPreview,
  getEventTipSourceLabel,
  shouldCompactEventTip,
  shouldShowEventTipLoading,
  shouldShowEventTipRetry,
  TIP_COMPACT_CHAR_LIMIT,
} from './EventModal.helpers';

describe('EventModal tip helpers', () => {
  it('labels classroom, llm, and static sources in German', () => {
    expect(getEventTipSourceLabel('classroom')).toBe('Tipp deiner Lehrkraft');
    expect(getEventTipSourceLabel('llm')).toBe('KI-Tipp');
    expect(getEventTipSourceLabel('static')).toBe('Lerntipp');
  });

  it('shows loading only while a request is in flight', () => {
    expect(shouldShowEventTipLoading('loading')).toBe(true);
    expect(shouldShowEventTipLoading('ready')).toBe(false);
    expect(shouldShowEventTipLoading('failed')).toBe(false);
    expect(shouldShowEventTipLoading('idle')).toBe(false);
  });

  it('shows retry only for failed non-classroom tips', () => {
    expect(shouldShowEventTipRetry({ canRetry: true, tipSource: 'static' })).toBe(true);
    expect(shouldShowEventTipRetry({ canRetry: true, tipSource: 'classroom' })).toBe(false);
    expect(shouldShowEventTipRetry({ canRetry: false, tipSource: 'static' })).toBe(false);
  });

  it('compacts tips longer than the character limit', () => {
    const longTip = 'A'.repeat(TIP_COMPACT_CHAR_LIMIT + 1);
    expect(shouldCompactEventTip(longTip)).toBe(true);
    expect(getEventTipPreview(longTip)).toBe(`${'A'.repeat(TIP_COMPACT_CHAR_LIMIT)}…`);
    expect(shouldCompactEventTip('Kurz.')).toBe(false);
    expect(getEventTipPreview('Kurz.')).toBe('Kurz.');
  });
});
