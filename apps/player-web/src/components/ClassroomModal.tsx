import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { evaluateLifeRun } from '@goal/scoring-engine';
import { ModalShell } from './ModalShell';
import {
  QrCode,
  Printer,
} from 'lucide-react';

export const ClassroomModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();
  const [roomCode, setRoomCode] = useState('GOAL-KLASSE-9B');
  const [activeTab, setActiveTab] = useState<'CLASS' | 'CERTIFICATE'>('CLASS');

  if (!gameState) return null;

  const evaluation = evaluateLifeRun(gameState);
  const { certificate } = evaluation;

  const handlePrint = () => {
    window.print();
  };

  return (
    <ModalShell
      title="Schulklasse & Lehrer-Dashboard"
      subtitle="Klassen-Challenge, Raum-Code & Finanzführerschein-Zertifikat"
      icon="🎓"
      iconBgColor="bg-indigo-100 text-indigo-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Tab Switcher */}
        <div className="flex gap-2 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('CLASS')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'CLASS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            🏫 Klassen-Challenge & Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CERTIFICATE')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'CERTIFICATE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            📜 Finanzführerschein Zertifikat
          </button>
        </div>

        {/* TAB 1: Klassen Dashboard */}
        {activeTab === 'CLASS' && (
          <div className="space-y-6">
            {/* Room Code Card */}
            <div className="p-5 rounded-3xl bg-indigo-50/80 border-2 border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">Aktiver Schulklassen-Raum</span>
                <div className="text-2xl font-black text-indigo-950 tracking-widest mt-0.5">{roomCode}</div>
                <p className="text-xs text-gray-600 mt-1">
                  Schüler können sich mit diesem Code in der Challenge verbinden.
                </p>
              </div>

              <div className="bg-white p-3 rounded-2xl border border-indigo-200 flex items-center gap-2 shadow-2xs">
                <QrCode className="w-8 h-8 text-indigo-700" />
                <span className="text-xs font-bold text-gray-700">QR-Code scanbar</span>
              </div>
            </div>

            {/* Anonymisierte Klassenstatistik */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Klassendurchschnitt Note</span>
                <p className="text-2xl font-black text-matcha-800">2,1 (Gut)</p>
                <span className="text-[10px] text-gray-500">24 aktive Schüler</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Schuldenfallen vermieden</span>
                <p className="text-2xl font-black text-skyline-800">78 %</p>
                <span className="text-[10px] text-gray-500">Häufigste Falle: BNPL</span>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Erreichte Lebensziele</span>
                <p className="text-2xl font-black text-amber-800">82 %</p>
                <span className="text-[10px] text-gray-500">Notgroschen & Ausbildung</span>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: Finanzführerschein Zertifikat */}
        {activeTab === 'CERTIFICATE' && (
          <div>
            <div className="p-8 rounded-3xl bg-amber-50/60 border-4 border-amber-300 text-center relative mb-6 print:m-0">
              <div className="w-16 h-16 rounded-full bg-amber-200 text-amber-900 mx-auto flex items-center justify-center text-3xl shadow-sm mb-3">
                🏆
              </div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                Offizielles Finanzführerschein-Zertifikat
              </h3>
              <p className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mt-1">
                Lebenssimulation GOAL für Schüler & Jugendliche
              </p>

              <div className="my-6 py-4 border-y-2 border-amber-200/80">
                <p className="text-xs text-gray-600">Hiermit wird bescheinigt, dass</p>
                <h4 className="text-2xl font-black text-indigo-950 my-1">{certificate.studentName}</h4>
                <p className="text-xs text-gray-600">
                  die Lebens- und Finanzsimulation erfolgreich mit der Gesamtnote{' '}
                  <strong className="text-matcha-700 text-sm">{certificate.grade} ({certificate.overallScore} / 100 Punkten)</strong> abgeschlossen hat.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs mb-6">
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Endvermögen</span>
                  <strong>{certificate.finalNetWorth.toLocaleString('de-DE')} €</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Notgroschen</span>
                  <strong>{certificate.finalEmergencyMonths} Monate</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Ziele erreicht</span>
                  <strong>{certificate.goalsAchievedCount} / {certificate.goalsTotalCount}</strong>
                </div>
                <div className="bg-white p-2.5 rounded-xl border border-amber-200">
                  <span className="text-[10px] text-gray-400 font-bold uppercase block">Altersvorsorge</span>
                  <strong>{certificate.pensionCoveragePercent} %</strong>
                </div>
              </div>

              <p className="text-[10px] text-gray-400 font-medium">
                Ausgestellt am {certificate.completionDate} • GOAL Educational Framework
              </p>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                Zertifikat ausdrucken / als PDF speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
