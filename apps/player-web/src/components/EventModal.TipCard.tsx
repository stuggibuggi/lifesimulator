import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';
import type { EventChoiceFeedback } from '../store/gameStore';
import {
  getEventTipPreview,
  getEventTipSourceLabel,
  shouldCompactEventTip,
  shouldShowEventTipLoading,
  shouldShowEventTipRetry,
} from './EventModal.helpers';

export function EventTipCard({
  feedback,
  onRetry,
}: {
  feedback: EventChoiceFeedback;
  onRetry: () => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const compact = shouldCompactEventTip(feedback.learningTip);
  const body =
    !compact || expanded ? feedback.learningTip : getEventTipPreview(feedback.learningTip);

  return (
    <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
      <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
      <div className="min-w-0">
        <span className="font-extrabold block">{getEventTipSourceLabel(feedback.tipSource)}</span>
        <span className="leading-relaxed">{body}</span>
        {compact && (
          <button
            type="button"
            className="mt-2 font-extrabold text-amber-800 underline-offset-2 hover:underline cursor-pointer"
            onClick={() => setExpanded((value) => !value)}
          >
            {expanded ? 'Weniger anzeigen' : 'Mehr anzeigen'}
          </button>
        )}
        {shouldShowEventTipLoading(feedback.tipRequestStatus) && (
          <span className="mt-2 block text-[11px] font-bold text-amber-800/80">
            Eine KI-Variante wird geprüft.
          </span>
        )}
        {shouldShowEventTipRetry(feedback) && (
          <button
            type="button"
            className="mt-2 font-extrabold text-amber-800 underline-offset-2 hover:underline cursor-pointer"
            onClick={onRetry}
          >
            Erneut versuchen
          </button>
        )}
      </div>
    </div>
  );
}
