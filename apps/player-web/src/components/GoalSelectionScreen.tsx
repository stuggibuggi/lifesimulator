import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { LifeGoal } from '@goal/shared-types';
import { ALL_LIFE_GOALS } from '@goal/game-content';
import { sound } from '../audio/soundSynth';
import {
  Check,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  PiggyBank,
  Home,
  Car,
  Plane,
  TrendingUp,
  AlertCircle,
  Key,
  Users,
  FileCheck,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  GraduationCap: <GraduationCap className="w-6 h-6" />,
  BookOpen: <BookOpen className="w-6 h-6" />,
  ShieldCheck: <ShieldCheck className="w-6 h-6" />,
  PiggyBank: <PiggyBank className="w-6 h-6" />,
  Home: <Home className="w-6 h-6" />,
  Key: <Key className="w-6 h-6" />,
  Users: <Users className="w-6 h-6" />,
  FileCheck: <FileCheck className="w-6 h-6" />,
  Car: <Car className="w-6 h-6" />,
  Plane: <Plane className="w-6 h-6" />,
  TrendingUp: <TrendingUp className="w-6 h-6" />,
};

export const GoalSelectionScreen: React.FC = () => {
  const { setTempGoals, confirmGoalsAndGoToCareer } = useGameStore();

  // Start with default 3 goals
  const [selectedGoalIds, setSelectedGoalIds] = useState<string[]>([
    'GOAL_AUSBILDUNG',
    'GOAL_NOTGROSCHEN',
    'GOAL_SCHULDENFREI',
  ]);

  const toggleGoal = (id: string) => {
    sound.playPop();
    if (selectedGoalIds.includes(id)) {
      if (selectedGoalIds.length <= 3) {
        return; // Mindestens 3 Ziele erforderlich
      }
      setSelectedGoalIds(selectedGoalIds.filter((gId) => gId !== id));
    } else {
      if (selectedGoalIds.length >= 5) {
        return; // Maximal 5 Ziele
      }
      setSelectedGoalIds([...selectedGoalIds, id]);
    }
  };

  const movePriority = (index: number, direction: 'up' | 'down') => {
    sound.playPop();
    const newArr = [...selectedGoalIds];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= newArr.length) return;
    const temp = newArr[index];
    newArr[index] = newArr[targetIdx];
    newArr[targetIdx] = temp;
    setSelectedGoalIds(newArr);
  };

  const handleConfirm = () => {
    if (selectedGoalIds.length < 3 || selectedGoalIds.length > 5) return;
    sound.playPop();

    const selectedGoals: LifeGoal[] = selectedGoalIds.map((id, idx) => {
      const base = ALL_LIFE_GOALS.find((g) => g.id === id)!;
      return {
        ...base,
        priority: idx + 1,
      };
    });

    setTempGoals(selectedGoals);
    confirmGoalsAndGoToCareer();
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-4xl p-6 md:p-10 shadow-cozy border-4 border-[#f0e7d5]">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-terracotta-600 bg-terracotta-50 px-3 py-1 rounded-full">
              Schritt 2 von 3
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 mt-2">
              Wähle deine persönlichen Lebensziele
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Wähle <strong>3 bis 5 Ziele</strong> und ordne sie nach deiner persönlichen Priorität.
            </p>
          </div>
          <div className="text-right">
            <span
              className={`text-sm font-black px-4 py-2 rounded-2xl border ${
                selectedGoalIds.length >= 3 && selectedGoalIds.length <= 5
                  ? 'bg-matcha-50 text-matcha-700 border-matcha-200'
                  : 'bg-amber-50 text-amber-700 border-amber-200'
              }`}
            >
              {selectedGoalIds.length} / 5 gewählt
            </span>
          </div>
        </div>

        {/* Goals Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {ALL_LIFE_GOALS.map((goal) => {
            const isSelected = selectedGoalIds.includes(goal.id);
            const prioIndex = selectedGoalIds.indexOf(goal.id);

            return (
              <div
                key={goal.id}
                onClick={() => toggleGoal(goal.id)}
                className={`p-5 rounded-3xl border-3 cursor-pointer transition-all flex flex-col justify-between relative ${
                  isSelected
                    ? 'border-matcha-500 bg-matcha-50/60 shadow-md'
                    : 'border-cozy-border bg-gray-50 hover:bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                          isSelected ? 'bg-matcha-500 text-white' : 'bg-gray-200 text-gray-700'
                        }`}
                      >
                        {ICON_MAP[goal.icon] || '🎯'}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-base text-gray-900 leading-tight">
                          {goal.title}
                        </h4>
                        <span className="text-xs text-gray-400 font-bold uppercase">
                          {goal.category}
                        </span>
                      </div>
                    </div>

                    {/* Priority Badge or Select Check */}
                    {isSelected && (
                      <div className="flex items-center gap-1 bg-matcha-600 text-white px-2.5 py-1 rounded-xl text-xs font-black shadow-sm">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Prio {prioIndex + 1}</span>
                      </div>
                    )}
                  </div>

                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    {goal.description}
                  </p>
                </div>

                {/* Pedagogical Conflict Hint */}
                {goal.conflictHint && (
                  <div className="bg-white/80 p-2 rounded-xl text-[11px] text-gray-500 border border-gray-200 flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">💡</span>
                    <span>{goal.conflictHint}</span>
                  </div>
                )}

                {/* Reorder Buttons inside Card */}
                {isSelected && (
                  <div
                    className="mt-3 pt-2 border-t border-matcha-200 flex items-center justify-between text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <span className="text-matcha-800 font-bold">Priorität anpassen:</span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={prioIndex === 0}
                        onClick={() => movePriority(prioIndex, 'up')}
                        className="px-2 py-1 bg-white hover:bg-gray-100 disabled:opacity-40 rounded-lg font-bold border border-gray-200 shadow-xs"
                      >
                        ▲ Höher
                      </button>
                      <button
                        type="button"
                        disabled={prioIndex === selectedGoalIds.length - 1}
                        onClick={() => movePriority(prioIndex, 'down')}
                        className="px-2 py-1 bg-white hover:bg-gray-100 disabled:opacity-40 rounded-lg font-bold border border-gray-200 shadow-xs"
                      >
                        ▼ Tiefer
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Info Box */}
        <div className="bg-skyline-50 border-2 border-skyline-200 p-4 rounded-2xl flex items-start gap-3 mb-8">
          <AlertCircle className="w-5 h-5 text-skyline-600 shrink-0 mt-0.5" />
          <p className="text-xs text-skyline-800 leading-relaxed font-medium">
            <strong>Wichtig für die Bewertung:</strong> Ziele mit hoher Priorität (Prio 1 & 2) fließen stärker in deine Abschlussbewertung ein. Wähle Ziele, die zu deiner persönlichen Lebensvorstellung passen.
          </p>
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => useGameStore.setState({ gamePhase: 'CHARACTER_CREATION' })}
            className="text-gray-500 hover:text-gray-800 font-bold text-sm flex items-center gap-2 px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>

          <button
            type="button"
            disabled={selectedGoalIds.length < 3 || selectedGoalIds.length > 5}
            onClick={handleConfirm}
            className="bg-matcha-500 hover:bg-matcha-600 disabled:opacity-50 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-cozy-hover transition-all flex items-center gap-3 active:scale-95"
          >
            Weiter zur Ausbildungswahl
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
