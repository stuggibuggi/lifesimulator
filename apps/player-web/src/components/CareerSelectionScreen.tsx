import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { CAREER_OPTIONS, EducationCareerOption } from '@goal/game-content';
import { sound } from '../audio/soundSynth';
import { ArrowLeft, Play, Briefcase, GraduationCap, Clock, Banknote, Sparkles } from 'lucide-react';

export const CareerSelectionScreen: React.FC = () => {
  const { selectStartingCareer, setTempGoals } = useGameStore();
  const [selectedOption, setSelectedOption] = useState<EducationCareerOption>(CAREER_OPTIONS[0]);

  const handleStart = () => {
    selectStartingCareer(selectedOption);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <div className="bg-white rounded-4xl p-6 md:p-10 shadow-cozy border-4 border-[#f0e7d5]">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-skyline-600 bg-skyline-50 px-3 py-1 rounded-full">
              Schritt 3 von 3
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 mt-2">
              Wähle deinen Bildungsweg nach der Schule
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Wie startest du ab Alter 16–18 ins Berufsleben? Du kannst dich später jederzeit weiterbilden.
            </p>
          </div>
        </div>

        {/* Career Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {CAREER_OPTIONS.map((option) => {
            const isSelected = selectedOption.id === option.id;

            return (
              <div
                key={option.id}
                onClick={() => {
                  sound.playPop();
                  setSelectedOption(option);
                }}
                className={`p-6 rounded-3xl border-3 cursor-pointer transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-matcha-500 bg-matcha-50/70 shadow-cozy-hover scale-[1.02]'
                    : 'border-cozy-border bg-gray-50 hover:bg-white hover:border-gray-300'
                }`}
              >
                <div>
                  {/* Badge & Icon */}
                  <div className="flex items-center justify-between mb-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl shadow-sm ${
                        isSelected ? 'bg-matcha-500 text-white' : 'bg-white text-gray-700'
                      }`}
                    >
                      {option.type === 'AUSBILDUNG' && '🛠️'}
                      {option.type === 'STUDIUM' && '🎓'}
                      {option.type === 'ANGESTELLTER' && '💼'}
                    </div>
                    <span className="text-xs font-extrabold px-3 py-1 bg-white rounded-full border border-gray-200 text-gray-700 shadow-xs">
                      {option.durationYears} Jahre
                    </span>
                  </div>

                  <h3 className="font-black text-lg text-gray-900 mb-2 leading-snug">
                    {option.title}
                  </h3>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                    {option.description}
                  </p>

                  {/* Financial & Time Stats */}
                  <div className="space-y-2 text-xs font-bold text-gray-700 bg-white p-3 rounded-2xl border border-gray-200 mb-4">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Vergütung / Monat:</span>
                      <span className="text-matcha-700">{option.monthlySalaryNet} € Netto</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Späteres Einstiegsgehalt:</span>
                      <span className="text-skyline-700">{option.startingNetAfterGraduation} € Netto</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">Wochenaufwand:</span>
                      <span>{option.timeCommitmentHoursWeekly} Std.</span>
                    </div>
                  </div>
                </div>

                {/* Pedagogical Tip */}
                <div className="bg-amber-50/80 p-3 rounded-2xl text-[11px] text-amber-900 border border-amber-200 flex items-start gap-2">
                  <span>💡</span>
                  <span>{option.pedagogicalTip}</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <button
            type="button"
            onClick={() => useGameStore.setState({ gamePhase: 'GOAL_SELECTION' })}
            className="text-gray-500 hover:text-gray-800 font-bold text-sm flex items-center gap-2 px-4 py-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Zurück
          </button>

          <button
            type="button"
            onClick={handleStart}
            className="bg-gradient-to-r from-matcha-500 to-matcha-600 hover:from-matcha-600 hover:to-matcha-700 text-white font-extrabold text-lg px-8 py-4 rounded-2xl shadow-cozy-hover transition-all flex items-center gap-3 active:scale-95 border-2 border-matcha-400"
          >
            <Sparkles className="w-5 h-5" />
            Simulation starten (Alter 16–30)!
            <Play className="w-5 h-5 fill-white" />
          </button>
        </div>
      </div>
    </div>
  );
};
