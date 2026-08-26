import type { EventChoiceFeedback, TipRequestStatus } from '../store/gameStore';

export const TIP_COMPACT_CHAR_LIMIT = 140;

export function getEventTipSourceLabel(source: EventChoiceFeedback['tipSource']): string {
  if (source === 'classroom') return 'Tipp deiner Lehrkraft';
  if (source === 'llm') return 'KI-Tipp';
  return 'Lerntipp';
}

export function shouldShowEventTipLoading(status: TipRequestStatus): boolean {
  return status === 'loading';
}

export function shouldShowEventTipRetry(
  feedback: Pick<EventChoiceFeedback, 'canRetry' | 'tipSource'>
): boolean {
  return feedback.canRetry && feedback.tipSource !== 'classroom';
}

export function shouldCompactEventTip(text: string): boolean {
  return text.trim().length > TIP_COMPACT_CHAR_LIMIT;
}

export function getEventTipPreview(text: string): string {
  const trimmed = text.trim();
  if (!shouldCompactEventTip(trimmed)) return trimmed;
  return `${trimmed.slice(0, TIP_COMPACT_CHAR_LIMIT).trimEnd()}…`;
}
