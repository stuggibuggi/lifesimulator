import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ModalShell } from './ModalShell';
import { CheckCircle2, Circle } from 'lucide-react';

export const GoalsModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();

  if (!gameState) return null;

  const achievedCount = gameState.goals.filter((g) => g.isAchieved).length;

  return (
    <ModalShell
      title="Lebensziele Tracker"
      subtitle={`${achievedCount} von ${gameState.goals.length} Zielen erreicht`}
      icon="🎯"
      iconBgColor="bg-sakura-100 text-sakura-700"
      onClose={closeModal}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-4">
        {gameState.goals.map((goal) => {
          const progressRatio = Math.min(
            1,
            Math.max(0, goal.currentValue / Math.max(1, goal.targetValue))
          );
          const percent = Math.round(progressRatio * 100);

          return (
            <div
              key={goal.id}
              className={`p-5 rounded-3xl border-2 transition-all ${
                goal.isAchieved
                  ? 'bg-matcha-50/70 border-matcha-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2">
                  {goal.isAchieved ? (
                    <CheckCircle2 className="w-5 h-5 text-matcha-600 shrink-0" />
                  ) : (
                    <Circle className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-black text-sm text-gray-900 leading-tight">
                      {goal.title}
                    </h4>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">
                      Priorität #{goal.priority} • {goal.category}
                    </span>
                  </div>
                </div>

                <span
                  className={`text-xs font-black px-2.5 py-1 rounded-full ${
                    goal.isAchieved
                      ? 'bg-matcha-500 text-white shadow-2xs'
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  {goal.isAchieved ? 'Erreicht! 🎉' : `${percent} %`}
                </span>
              </div>

              <p className="text-xs text-gray-600 mb-3 ml-7">{goal.description}</p>

              {/* Progress Bar */}
              <div className="ml-7">
                <div className="flex justify-between text-[11px] font-bold text-gray-500 mb-1">
                  <span>
                    Aktuell: {goal.currentValue.toLocaleString('de-DE')} {goal.targetUnit}
                  </span>
                  <span>
                    Ziel: {goal.targetValue.toLocaleString('de-DE')} {goal.targetUnit}
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    style={{ width: `${percent}%` }}
                    className={`h-full rounded-full transition-all duration-300 ${
                      goal.isAchieved ? 'bg-matcha-500' : 'bg-terracotta-500'
                    }`}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ModalShell>
  );
};
