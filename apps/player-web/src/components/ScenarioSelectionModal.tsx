import React from 'react';
import { useGameStore } from '../store/gameStore';
import { EDUCATIONAL_SCENARIOS } from '@goal/game-content';
import { EducationalScenario } from '@goal/shared-types';
import { ModalShell } from './ModalShell';
import { sound } from '../audio/soundSynth';
import { getStudentSession } from '../api/client';
import {
  Sparkles,
  GraduationCap,
  AlertTriangle,
  Key,
  ArrowRight,
  Clock,
  Target,
} from 'lucide-react';

export const ScenarioSelectionModal: React.FC = () => {
  const { closeModal, contentScenarios, startScenarioGame } = useGameStore();
  const studentSession = getStudentSession();
  const scenarios = contentScenarios.length ? contentScenarios : EDUCATIONAL_SCENARIOS;

  const getScenarioIcon = (iconName: string) => {
    switch (iconName) {
      case 'GraduationCap':
        return <GraduationCap className="w-6 h-6 text-skyline-600" />;
      case 'AlertTriangle':
        return <AlertTriangle className="w-6 h-6 text-amber-600" />;
      case 'Key':
        return <Key className="w-6 h-6 text-terracotta-600" />;
      default:
        return <Sparkles className="w-6 h-6 text-matcha-600" />;
    }
  };

  const handleSelectScenario = (scenario: EducationalScenario) => {
    sound.playFanfare();
    startScenarioGame(scenario, studentSession?.characterName);
  };

  return (
    <ModalShell
      title="Pädagogische Lernszenarien"
      subtitle="Wähle ein fokussiertes Unterrichtsmodul (45 Min.) oder den vollen Lebenslauf"
      icon="🎯"
      iconBgColor="bg-amber-100 text-amber-800"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {scenarios.map((sc) => (
          <div
            key={sc.id}
            className="p-6 rounded-3xl bg-gray-50/80 hover:bg-white border-2 border-gray-200 hover:border-terracotta-400 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="p-3 rounded-2xl bg-white border border-gray-200 shadow-2xs">
                  {getScenarioIcon(sc.icon)}
                </div>
                <span className="text-[10px] font-extrabold px-3 py-1 bg-gray-200 text-gray-700 rounded-full flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {sc.targetAgeRange}
                </span>
              </div>

              <h3 className="font-black text-base text-gray-900 mb-1">{sc.title}</h3>
              <p className="text-xs font-bold text-terracotta-600 mb-2">{sc.subtitle}</p>
              <p className="text-xs text-gray-600 leading-relaxed mb-4">{sc.description}</p>
            </div>

            <div className="pt-4 border-t border-gray-200 flex items-center justify-between">
              <span className="text-[10px] font-bold text-gray-500 flex items-center gap-1">
                <Target className="w-3 h-3 text-matcha-600" />
                {sc.focusTopic}
              </span>

              <button
                type="button"
                onClick={() => handleSelectScenario(sc)}
                className="px-4 py-2 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
              >
                Starten
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ModalShell>
  );
};
