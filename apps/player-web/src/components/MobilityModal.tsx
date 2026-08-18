import React from 'react';
import { useGameStore } from '../store/gameStore';
import { AVAILABLE_MOBILITY_OPTIONS } from '@goal/game-content';
import { MobilityOption } from '@goal/shared-types';
import { sound } from '../audio/soundSynth';
import { ModalShell } from './ModalShell';
import { CheckCircle2, AlertTriangle, Leaf } from 'lucide-react';

export const MobilityModal: React.FC = () => {
  const { gameState, handleSetMobility, closeModal } = useGameStore();

  if (!gameState) return null;

  const currentMobility = gameState.activeMobility || 'PUBLIC_TRANSIT';

  const handleSelect = (option: MobilityOption) => {
    if (option.type === 'CAR_CASH' && gameState.bankAccount.giroBalance < option.acquisitionCost) {
      sound.playWarning();
      alert(`Nicht genügend Guthaben auf dem Girokonto (${gameState.bankAccount.giroBalance.toLocaleString('de-DE')} € vorhanden, ${option.acquisitionCost.toLocaleString('de-DE')} € benötigt)!`);
      return;
    }

    sound.playPop();
    handleSetMobility(option);
  };

  return (
    <ModalShell
      title="Marktplatz & Mobilitäts-Manager"
      subtitle="Vergleiche ÖPNV, Bar-Gebrauchtwagen, Kreditfinanzierung und Privatleasing"
      icon="🛒"
      iconBgColor="bg-emerald-100 text-emerald-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Current Mobility Status Banner */}
        <div className="bg-emerald-50 border-2 border-emerald-200 rounded-3xl p-5 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">
              Aktuell gewählte Mobilität
            </span>
            <h4 className="text-base font-black text-emerald-950">
              {AVAILABLE_MOBILITY_OPTIONS.find((o) => o.type === currentMobility)?.title || 'Deutschlandticket'}
            </h4>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400">
              Laufende Monatskosten
            </span>
            <div className="text-xl font-black text-emerald-900">
              {gameState.budget.mobilityPublicTransitOrCar} € / Monat
            </div>
          </div>
        </div>

        {/* Mobility Options Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_MOBILITY_OPTIONS.map((option) => {
            const isSelected = option.type === currentMobility;
            const canAffordCash = option.type !== 'CAR_CASH' || gameState.bankAccount.giroBalance >= option.acquisitionCost;

            return (
              <div
                key={option.type}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : 'border-gray-200 bg-gray-50/80 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-gray-900">{option.title}</span>
                    <span className="text-xs font-black text-emerald-700">{option.monthlyCost} € / Mo</span>
                  </div>

                  <p className="text-xs text-gray-600 mb-4 leading-relaxed">{option.description}</p>

                  <div className="bg-white p-3 rounded-2xl border border-gray-200 text-xs space-y-1.5 mb-4 shadow-2xs">
                    {option.acquisitionCost > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Einmalige Anschaffungskosten:</span>
                        <strong className="text-red-700">{option.acquisitionCost.toLocaleString('de-DE')} €</strong>
                      </div>
                    )}
                    <div className="flex justify-between text-gray-700">
                      <span>Monatliche Fixkosten:</span>
                      <strong>{option.monthlyCost} € / Mo</strong>
                    </div>
                    <div className="flex justify-between text-gray-700 items-center">
                      <span>Ökologie & CO2-Bilanz:</span>
                      <span className="flex items-center gap-1 text-matcha-700 font-bold">
                        <Leaf className="w-3.5 h-3.5" />
                        {option.co2EcoPoints} / 100 Punkte
                      </span>
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  {!canAffordCash && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      Guthaben reicht nicht ({option.acquisitionCost} € benötigt)
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={isSelected || !canAffordCash}
                    onClick={() => handleSelect(option)}
                    className={`ml-auto px-5 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white cursor-default'
                        : !canAffordCash
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-terracotta-600 hover:bg-terracotta-700 text-white'
                    }`}
                  >
                    {isSelected ? (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Aktiv
                      </>
                    ) : (
                      'Auswählen'
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
