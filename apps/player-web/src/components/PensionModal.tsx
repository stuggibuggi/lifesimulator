import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { calculatePensionOverview } from '@goal/simulation-engine';
import { ModalShell } from './ModalShell';
import {
  TrendingUp,
  Building,
  Shield,
  Layers,
  Award,
  AlertTriangle,
  Check,
  Percent,
} from 'lucide-react';

export const PensionModal: React.FC = () => {
  const {
    gameState,
    closeModal,
    handleSetBavContribution,
  } = useGameStore();

  if (!gameState) return null;

  const { pension, career, investmentAccount } = gameState;
  const [bavInput, setBavInput] = useState(pension.bavMonthlyContribution || 100);

  const pensionOverview = calculatePensionOverview(
    pension.accumulatedPensionPoints,
    pension.targetRetirementNetMonthly,
    pension.bavAccumulatedBalance,
    investmentAccount.etfBalance
  );

  const handleSaveBav = (e: React.FormEvent) => {
    e.preventDefault();
    handleSetBavContribution(bavInput);
    alert(`Betriebliche Altersvorsorge über ${bavInput} €/Monat (zzgl. 15% Chefzuschuss) aktiviert!`);
  };

  return (
    <ModalShell
      title="Altersvorsorge & 3-Schichten-Modell"
      subtitle="Gesetzliche Rente, Betriebsrente (bAV) & Rentenlücken-Rechner"
      icon="🏖️"
      iconBgColor="bg-indigo-100 text-indigo-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Rentenlücken-Dashboard */}
        <div className="p-6 rounded-3xl bg-indigo-50/70 border-2 border-indigo-200">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-4">
            <div>
              <span className="text-xs font-black text-indigo-800 uppercase tracking-wider">
                Dein Ruhestands-Status (Renteneintritt mit 67 Jahren)
              </span>
              <h3 className="text-xl font-black text-indigo-950 mt-0.5">
                Voraussichtliche Gesamtrente: {Math.round(pensionOverview.totalProjectedRetirementNet).toLocaleString('de-DE')} € Netto / Monat
              </h3>
            </div>

            <div className="bg-white px-4 py-2 rounded-2xl border border-indigo-200 text-right shrink-0">
              <span className="text-[10px] text-gray-400 font-bold uppercase block">Zielabdeckung</span>
              <span className={`text-base font-black ${pensionOverview.coverageRatioPercent >= 80 ? 'text-matcha-700' : 'text-amber-700'}`}>
                {pensionOverview.coverageRatioPercent} % der Wunschrente
              </span>
            </div>
          </div>

          {/* Rentenlücke Alert */}
          {pensionOverview.pensionGapMonthly > 0 ? (
            <div className="bg-amber-100/80 border border-amber-300 p-3.5 rounded-2xl flex items-center justify-between gap-3 text-xs text-amber-950 font-medium">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-700 shrink-0" />
                <span>
                  <strong>Monatliche Rentenlücke: {Math.round(pensionOverview.pensionGapMonthly).toLocaleString('de-DE')} €</strong> (Differenz zu deiner Wunschrente von {pension.targetRetirementNetMonthly.toLocaleString('de-DE')} €).
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-matcha-100/80 border border-matcha-300 p-3.5 rounded-2xl flex items-center gap-2 text-xs text-matcha-950 font-bold">
              <Check className="w-5 h-5 text-matcha-700 shrink-0" />
              <span>🎉 Hervorragend! Deine Rentenlücke ist durch bAV und ETF-Vorsorge vollständig geschlossen!</span>
            </div>
          )}
        </div>

        {/* Die 3 Schichten im Detail */}
        <div>
          <h4 className="font-extrabold text-sm text-gray-800 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            Die 3 Schichten der Altersvorsorge
          </h4>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Schicht 1: Gesetzliche Rente */}
            <div className="p-5 rounded-3xl bg-gray-50 border-2 border-gray-200 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-gray-500 uppercase">1. Basisversorgung</span>
                  <span className="text-lg">🏛️</span>
                </div>
                <h5 className="font-extrabold text-sm text-gray-900 mb-1">Gesetzliche Rente</h5>
                <p className="text-xs text-gray-600 mb-3">
                  Gesammelte Entgeltpunkte: <strong>{pension.accumulatedPensionPoints} EP</strong> (Wert: 39,32 €/EP).
                </p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-gray-200 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Monatlich Netto</span>
                <p className="text-base font-black text-gray-900">
                  ~{Math.round(pensionOverview.statutoryNet).toLocaleString('de-DE')} € / Mo
                </p>
              </div>
            </div>

            {/* Schicht 2: bAV */}
            <div className="p-5 rounded-3xl bg-skyline-50/70 border-2 border-skyline-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-skyline-800 uppercase">2. Betrieblich</span>
                  <span className="text-lg">🏢</span>
                </div>
                <h5 className="font-extrabold text-sm text-skyline-950 mb-1">Betriebsrente (bAV)</h5>
                <p className="text-xs text-gray-600 mb-3">
                  Angespartes bAV-Kapital: <strong>{Math.round(pension.bavAccumulatedBalance).toLocaleString('de-DE')} €</strong> (inkl. 15% Chefzuschuss).
                </p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-skyline-200 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Monatlich Netto</span>
                <p className="text-base font-black text-skyline-900">
                  +{Math.round(pensionOverview.bavEstimatedMonthlyPayout).toLocaleString('de-DE')} € / Mo
                </p>
              </div>
            </div>

            {/* Schicht 3: Private ETF-Vorsorge */}
            <div className="p-5 rounded-3xl bg-matcha-50/70 border-2 border-matcha-300 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-black text-matcha-800 uppercase">3. Private Vorsorge</span>
                  <span className="text-lg">📈</span>
                </div>
                <h5 className="font-extrabold text-sm text-matcha-950 mb-1">Weltweites ETF-Depot</h5>
                <p className="text-xs text-gray-600 mb-3">
                  Depotwert: <strong>{Math.round(investmentAccount.etfBalance).toLocaleString('de-DE')} €</strong> (4%-Entnahmeregel).
                </p>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-matcha-200 text-center">
                <span className="text-[10px] text-gray-400 font-bold uppercase">Monatlich Netto</span>
                <p className="text-base font-black text-matcha-900">
                  +{Math.round(pensionOverview.etfEstimatedMonthlyPayout).toLocaleString('de-DE')} € / Mo
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* bAV Konfigurator */}
        <form onSubmit={handleSaveBav} className="p-6 rounded-3xl bg-cozy-cream/60 border border-[#ede5cb]">
          <h4 className="font-black text-sm text-gray-900 mb-2 flex items-center gap-2">
            <Building className="w-4 h-4 text-terracotta-600" />
            Betriebliche Altersvorsorge (bAV) einrichten / anpassen
          </h4>
          <p className="text-xs text-gray-600 mb-4 leading-relaxed">
            Wähle deinen monatlichen Beitrag aus der Entgeltumwandlung (wird direkt vom Bruttogehalt abgezogen, spart Steuern). Dein Arbeitgeber legt gesetzlich verpflichtet <strong>+15 % Zuschuss</strong> dazu!
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
            <div className="sm:col-span-2">
              <label className="font-bold text-xs text-gray-700 block mb-1">
                Eigener bAV-Beitrag: {bavInput} € / Monat (Chef zahlt +{Math.round(bavInput * 0.15)} € = {Math.round(bavInput * 1.15)} € Gesamtsparbetrag)
              </label>
              <input
                type="range"
                min={0}
                max={250}
                step={25}
                value={bavInput}
                onChange={(e) => setBavInput(Number(e.target.value))}
                className="w-full accent-terracotta-600"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              bAV-Vertrag speichern
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};
