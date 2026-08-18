import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { EventChoice } from '@goal/shared-types';
import { sound } from '../audio/soundSynth';
import { AlertCircle, CheckCircle2, ShieldAlert, Sparkles, BookOpen } from 'lucide-react';

const EVENT_IMAGE_MAP: Record<string, string> = {
  EVT_PHONE_BROKEN: '/assets/events/event_phone_broken.jpg',
  EVT_ACCIDENT_BIKE: '/assets/events/event_bike_accident.jpg',
  EVT_HOLIDAY_JOB: '/assets/events/event_holiday_job.svg',
  EVT_BUY_CAR: '/assets/events/event_car_buy.svg',
  EVT_DENTAL_SURGERY: '/assets/events/event_dental.svg',
  EVT_FRIENDS_TRIP: '/assets/events/event_roadtrip.svg',
  EVT_PROMOTION_CHANCE: '/assets/events/event_promotion.svg',
  EVT_INVESTMENT_HYPE: '/assets/events/event_investment.svg',
  EVT_AGE_18_MILESTONE: '/assets/locations/bank.svg',
  EVT_SURPRISE_UTILITY_BILL: '/assets/locations/home.svg',
};

export const EventModal: React.FC = () => {
  const { gameState, eventChoiceFeedback, handleEventChoice, dismissEventFeedback } = useGameStore();
  const [selectedChoice, setSelectedChoice] = useState<EventChoice | null>(null);

  if (eventChoiceFeedback) {
    const isPositive = eventChoiceFeedback.financialImpact > 0;
    const isNegative = eventChoiceFeedback.financialImpact < 0;
    const moneyLabel =
      eventChoiceFeedback.financialImpact === 0
        ? '0 €'
        : `${isPositive ? '+' : '-'}${Math.abs(
            Math.round(eventChoiceFeedback.financialImpact)
          ).toLocaleString('de-DE')} €`;

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white rounded-3xl md:rounded-4xl max-w-xl w-full shadow-2xl border-4 border-[#f0e7d5] flex flex-col overflow-hidden relative">
          <div className="p-6 md:p-7 pb-4 border-b border-gray-100 bg-white/95 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-matcha-100 text-matcha-700 border-2 border-matcha-200 shrink-0 shadow-xs flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="inline-flex items-center gap-1.5 bg-matcha-50 text-matcha-800 text-xs font-black px-2.5 py-1 rounded-full border border-matcha-200 mb-2">
                  <Sparkles className="w-3.5 h-3.5 text-matcha-600" />
                  Feedback
                </div>
                <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-snug">
                  Deine Entscheidung
                </h2>
              </div>
            </div>
          </div>

          <div className="p-6 md:p-7 space-y-4">
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-wider block mb-1">
                {eventChoiceFeedback.eventTitle}
              </span>
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm md:text-base font-extrabold text-gray-900">
                  {eventChoiceFeedback.choiceLabel}
                </p>
                <span
                  className={`text-sm font-black px-3 py-1 rounded-xl ${
                    isPositive
                      ? 'bg-matcha-100 text-matcha-800'
                      : isNegative
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-700'
                  }`}
                >
                  {moneyLabel}
                </span>
              </div>
            </div>

            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
              <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Lerneffekt:</span>
                <span className="leading-relaxed">{eventChoiceFeedback.learningTip}</span>
              </div>
            </div>
          </div>

          <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex justify-end shrink-0">
            <button
              onClick={dismissEventFeedback}
              type="button"
              className="w-full sm:w-auto bg-matcha-600 hover:bg-matcha-700 text-white font-extrabold text-xs px-8 py-3 rounded-2xl shadow-cozy-hover transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              Weiter
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!gameState || !gameState.activeEvent) return null;

  const event = gameState.activeEvent;
  const imageSrc = EVENT_IMAGE_MAP[event.id] || '/assets/locations/home.svg';

  const handleConfirm = (choice: EventChoice) => {
    handleEventChoice(choice);
    setSelectedChoice(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl md:rounded-4xl max-w-2xl w-full shadow-2xl border-4 border-[#f0e7d5] flex flex-col max-h-[88vh] overflow-hidden relative">
        {/* Sticky Fixed Header */}
        <div className="p-6 md:p-7 pb-4 border-b border-gray-100 bg-white/95 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl overflow-hidden bg-cozy-cream border-2 border-cozy-border shrink-0 shadow-xs">
              <img src={imageSrc} alt={event.title} className="w-full h-full object-cover" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-800 text-xs font-black px-2.5 py-1 rounded-full border border-amber-200">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  Alter {gameState.currentAge}, Monat {gameState.currentMonth}
                </div>

                <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">
                  {event.category}
                </span>
              </div>

              <h2 className="text-lg md:text-xl font-black text-gray-900 tracking-tight leading-snug truncate">
                {event.title}
              </h2>
            </div>
          </div>
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-6 md:p-7 space-y-4 custom-scrollbar overscroll-contain">
          {/* Description */}
          <p className="text-xs md:text-sm text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-200">
            {event.description}
          </p>

          {/* Dilemma Choices */}
          <div className="space-y-3">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-wider">
              Wie entscheidest du dich?
            </h3>

            {event.choices.map((choice) => {
              const isSelected = selectedChoice?.id === choice.id;
              const hasRequiredInsurance = choice.requiresInsurance
                ? gameState.insurances.some(
                    (i) => i.type === choice.requiresInsurance && i.isActive
                  )
                : true;

              const effectiveCost =
                choice.requiresInsurance && hasRequiredInsurance
                  ? choice.costImmediate * (1 - (choice.insuranceCoverageRate ?? 0.8))
                  : choice.costImmediate;

              return (
                <button
                  key={choice.id}
                  onClick={() => {
                    sound.playPop();
                    setSelectedChoice(choice);
                  }}
                  type="button"
                  className={`w-full text-left p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                    isSelected
                      ? 'border-matcha-500 bg-matcha-50/70 shadow-sm'
                      : 'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-sm text-gray-900">
                          {choice.label}
                        </span>
                        {choice.requiresInsurance && (
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                              hasRequiredInsurance
                                ? 'bg-matcha-100 text-matcha-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {hasRequiredInsurance ? 'Versichert 🛡️' : 'Nicht versichert ⚠️'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 leading-relaxed">
                        {choice.description}
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      {choice.costImmediate !== 0 && (
                        <div
                          className={`text-sm font-black ${
                            effectiveCost < choice.costImmediate
                              ? 'text-matcha-700'
                              : choice.costImmediate > 0
                              ? 'text-red-600'
                              : 'text-matcha-600'
                          }`}
                        >
                          {choice.costImmediate > 0 ? '-' : '+'}
                          {Math.round(Math.abs(effectiveCost)).toLocaleString('de-DE')} €
                        </div>
                      )}
                      {effectiveCost < choice.costImmediate && (
                        <span className="text-[10px] text-gray-400 line-through block">
                          -{choice.costImmediate} €
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Impact Badges */}
                  <div className="flex flex-wrap gap-2 mt-3 text-[11px] font-bold">
                    {choice.healthDelta !== undefined && choice.healthDelta !== 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-lg ${
                          choice.healthDelta > 0
                            ? 'bg-matcha-100 text-matcha-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        Gesundheit {choice.healthDelta > 0 ? '+' : ''}
                        {choice.healthDelta}
                      </span>
                    )}
                    {choice.happinessDelta !== undefined && choice.happinessDelta !== 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-lg ${
                          choice.happinessDelta > 0
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        Glück {choice.happinessDelta > 0 ? '+' : ''}
                        {choice.happinessDelta}
                      </span>
                    )}
                    {choice.stressDelta !== undefined && choice.stressDelta !== 0 && (
                      <span
                        className={`px-2 py-0.5 rounded-lg ${
                          choice.stressDelta > 0
                            ? 'bg-red-100 text-red-800'
                            : 'bg-matcha-100 text-matcha-800'
                        }`}
                      >
                        Stress {choice.stressDelta > 0 ? '+' : ''}
                        {choice.stressDelta}
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Educational Tip Preview */}
          {selectedChoice && (
            <div className="bg-amber-50/80 p-4 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5 animate-fadeIn">
              <BookOpen className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
              <div>
                <span className="font-extrabold block">Lerneffekt:</span>
                <span className="leading-relaxed">{selectedChoice.learningTip}</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer with Confirm Button */}
        {selectedChoice && (
          <div className="p-4 md:p-6 border-t border-gray-100 bg-white flex justify-end shrink-0">
            <button
              onClick={() => handleConfirm(selectedChoice)}
              type="button"
              className="w-full sm:w-auto bg-matcha-600 hover:bg-matcha-700 text-white font-extrabold text-xs px-8 py-3 rounded-2xl shadow-cozy-hover transition-all duration-200 flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              Entscheidung bestätigen
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
