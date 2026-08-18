import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { AVAILABLE_INSURANCES } from '@goal/game-content';
import { InsuranceContract } from '@goal/shared-types';
import { sound } from '../audio/soundSynth';
import { ModalShell } from './ModalShell';
import {
  ShieldCheck,
  ShieldAlert,
  Check,
  Umbrella,
  Shield,
  Clock,
  HelpCircle,
} from 'lucide-react';

export const InsuranceModal: React.FC = () => {
  const { gameState, closeModal, handleToggleInsurance } = useGameStore();
  const [selectedDeductibles, setSelectedDeductibles] = useState<Record<string, number>>({});
  const [hasHealthPreCondition, setHasHealthPreCondition] = useState<Record<string, boolean>>({});

  if (!gameState) return null;

  const totalInsurancesCost = gameState.insurances.reduce(
    (sum, ins) => sum + ins.monthlyPremium,
    0
  );

  const handleDeductibleChange = (id: string, deductible: number) => {
    sound.playPop();
    setSelectedDeductibles((prev) => ({ ...prev, [id]: deductible }));
  };

  const handleHealthConditionToggle = (id: string) => {
    sound.playPop();
    setHasHealthPreCondition((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleToggle = (insurance: InsuranceContract) => {
    const chosenDeductible = selectedDeductibles[insurance.id] ?? insurance.deductible;
    const hasPreCondition = hasHealthPreCondition[insurance.id] ?? false;
    handleToggleInsurance(insurance, chosenDeductible, hasPreCondition);
  };

  return (
    <ModalShell
      title="Vertragsordner & Versicherungsbüro"
      subtitle={`Aktive Policen: ${gameState.insurances.length} (Gesamtbeitrag: ${Math.round(totalInsurancesCost * 100) / 100} €/Monat)`}
      icon="🛡️"
      iconBgColor="bg-amber-100 text-amber-800"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Info Banner: Versicherungs-Pyramide */}
        <div className="p-4 rounded-3xl bg-amber-50/80 border-2 border-amber-200 text-xs text-amber-950 flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div>
            <span className="font-extrabold block">Die goldene Versicherungs-Regel für Schüler:</span>
            <span className="leading-relaxed">
              Versichere nur Risiken, die dich finanziell ruinieren würden (z. B. <strong>Privathaftpflicht</strong> & <strong>Berufsunfähigkeit</strong>). Teure Smartphone- oder Brillenversicherungen kosten oft mehr als sie nützen!
            </span>
          </div>
        </div>

        {/* Insurance Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_INSURANCES.map((insurance) => {
            const activeContract = gameState.insurances.find((i) => i.type === insurance.type);
            const isCovered = !!activeContract;
            const currentDeductible = selectedDeductibles[insurance.id] ?? activeContract?.deductible ?? insurance.deductible;

            // Preisberechnung je nach SB
            let priceMultiplier = 1.0;
            if (currentDeductible === 150) priceMultiplier = 0.85;
            if (currentDeductible === 300) priceMultiplier = 0.72;
            const displayedPrice = Math.round(insurance.monthlyPremium * priceMultiplier * 100) / 100;

            const isBU = insurance.type === 'BERUFSUNFAEHIGKEIT';
            const healthExcluded = isCovered && activeContract?.hasHealthPreConditionExclusion;

            // Tier Styling
            const tierBadge =
              insurance.importanceTier === 'ESSENTIAL'
                ? { label: '🔥 Existenzschutz (Must-Have)', bg: 'bg-red-100 text-red-800 border-red-200' }
                : insurance.importanceTier === 'RECOMMENDED'
                ? { label: '⭐ Sehr empfohlen', bg: 'bg-matcha-100 text-matcha-800 border-matcha-200' }
                : insurance.importanceTier === 'OPTIONAL'
                ? { label: 'ℹ️ Optional nach Bedarf', bg: 'bg-skyline-100 text-skyline-800 border-skyline-200' }
                : { label: '⚠️ Oft unnötig / teuer', bg: 'bg-gray-200 text-gray-700 border-gray-300' };

            return (
              <div
                key={insurance.id}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  isCovered
                    ? 'border-matcha-500 bg-matcha-50/40 shadow-xs'
                    : 'border-gray-200 bg-gray-50/80 hover:bg-white'
                }`}
              >
                <div>
                  {/* Top Badge */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full border ${tierBadge.bg}`}>
                      {tierBadge.label}
                    </span>
                    <span className="text-xs font-black text-gray-900">{displayedPrice} € / Mo</span>
                  </div>

                  <h3 className="text-base font-black text-gray-900 mb-1">
                    {insurance.name}
                  </h3>

                  <p className="text-xs text-gray-600 leading-relaxed mb-3">
                    {insurance.explanation}
                  </p>

                  <div className="bg-white p-3 rounded-2xl border border-gray-200 text-xs space-y-1 mb-3">
                    <div className="flex justify-between text-gray-700">
                      <span>Deckungssumme:</span>
                      <strong className="text-gray-900">
                        {insurance.coverageLimit.toLocaleString('de-DE')} €
                      </strong>
                    </div>

                    {/* Wählbare Selbstbeteiligung */}
                    {insurance.availableDeductibles && insurance.availableDeductibles.length > 1 && (
                      <div className="pt-1.5 border-t border-gray-100 flex items-center justify-between">
                        <span className="text-[11px] text-gray-500 font-bold">Selbstbeteiligung:</span>
                        <div className="flex gap-1">
                          {insurance.availableDeductibles.map((sb) => (
                            <button
                              key={sb}
                              type="button"
                              disabled={isCovered}
                              onClick={() => handleDeductibleChange(insurance.id, sb)}
                              className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                currentDeductible === sb
                                  ? 'bg-amber-500 text-white shadow-2xs'
                                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                              } ${isCovered ? 'opacity-80' : 'cursor-pointer'}`}
                            >
                              {sb} €
                            </button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Wartezeit Status */}
                    {isCovered && activeContract.waitingPeriodMonthsRemaining > 0 && (
                      <div className="pt-1.5 border-t border-gray-100 flex items-center gap-1 text-[11px] text-amber-700 font-bold">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Noch {activeContract.waitingPeriodMonthsRemaining} Monate Wartezeit</span>
                      </div>
                    )}

                    {/* Vorerkrankungs-Ausschluss Hinweis */}
                    {healthExcluded && (
                      <div className="pt-1.5 border-t border-gray-100 text-[10px] text-red-600 font-bold">
                        ⚠️ Leistungsausschluss wegen angegebener Vorerkrankung aktiv!
                      </div>
                    )}
                  </div>

                  {/* Gesundheitsfragen bei BU */}
                  {isBU && !isCovered && (
                    <div className="mb-3 p-2.5 bg-skyline-50 rounded-xl border border-skyline-200 text-[11px]">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={hasHealthPreCondition[insurance.id] || false}
                          onChange={() => handleHealthConditionToggle(insurance.id)}
                          className="accent-skyline-600 rounded"
                        />
                        <span className="text-gray-700 font-bold">
                          Ich habe chronische Vorerkrankungen (Risikoprüfung / Ausschlussklausel)
                        </span>
                      </label>
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-200 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleToggle(insurance)}
                    className={`px-5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      isCovered
                        ? 'bg-red-50 hover:bg-red-100 text-red-700 border border-red-200'
                        : 'bg-matcha-600 hover:bg-matcha-700 text-white'
                    }`}
                  >
                    {isCovered ? (
                      'Vertrag kündigen'
                    ) : (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        Jetzt abschließen ({displayedPrice} €/Mo)
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </ModalShell>
  );
};
