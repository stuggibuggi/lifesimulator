import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ModalShell } from './ModalShell';
import { Briefcase, GraduationCap, Clock, TrendingUp, Award } from 'lucide-react';

export const CareerModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();

  if (!gameState) return null;

  const career = gameState.career;

  return (
    <ModalShell
      title="Arbeitsplatz & Bildung"
      subtitle="Beruflicher Status, Gehalt und Qualifikationen"
      icon="💼"
      iconBgColor="bg-skyline-100 text-skyline-700"
      onClose={closeModal}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Current Position Overview */}
        <div className="bg-cozy-cream/60 p-6 rounded-3xl border border-[#ede5cb]">
          <div className="flex items-center justify-between mb-3">
            <span className="bg-skyline-100 text-skyline-800 text-xs font-black px-3 py-1 rounded-full uppercase">
              {career.type}
            </span>
            <span className="text-xs text-gray-500 font-bold">
              {career.isCompleted ? 'Abschluss vorhanden' : `Jahr ${career.currentYear} von ${career.durationYears}`}
            </span>
          </div>

          <h3 className="text-xl font-black text-gray-900 mb-1">{career.title}</h3>
          <p className="text-xs text-gray-500 font-bold mb-4">{career.branch}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-gray-700 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <span className="text-gray-400 block text-[10px]">Monatsgehalt Netto:</span>
              <span className="text-matcha-700 font-black text-sm">{career.monthlySalaryNet} €</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Wochenarbeitszeit:</span>
              <span>{career.timeCommitmentHoursWeekly} Std.</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Stressfaktor:</span>
              <span className="text-amber-700 font-black">{career.stressFactor} / 100</span>
            </div>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200 text-xs text-gray-600 leading-relaxed">
          <h4 className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
            <GraduationCap className="w-4 h-4 text-skyline-600" />
            Karriere- und Weiterbildungschancen
          </h4>
          <p>
            Mit jedem erfolgreichen Berufsjahr steigen deine Fachkompetenz und Gehaltschancen. Halte die Balance zwischen Arbeitszeit und Freizeit, um Überlastung und Burnout zu vermeiden!
          </p>
        </div>
      </div>
    </ModalShell>
  );
};
