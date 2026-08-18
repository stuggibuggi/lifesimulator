import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { AVAILABLE_HOUSING_OPTIONS } from '@goal/game-content';
import { HousingOption } from '@goal/shared-types';
import { calculatePropertyAcquisitionCosts } from '@goal/simulation-engine';
import { ModalShell } from './ModalShell';
import { sound } from '../audio/soundSynth';
import {
  Home,
  Check,
  Building,
  Key,
  ShieldCheck,
  PiggyBank,
  FileCheck,
  AlertCircle,
  TrendingUp,
} from 'lucide-react';

export const HousingModal: React.FC = () => {
  const {
    gameState,
    closeModal,
    handleChangeHousing,
    handleOpenBausparer,
  } = useGameStore();

  const [selectedHousing, setSelectedHousing] = useState<HousingOption | null>(null);
  const [downPayment, setDownPayment] = useState<number>(45000);
  const [bausparSum, setBausparSum] = useState<number>(50000);
  const [bausparRate, setBausparRate] = useState<number>(100);

  if (!gameState) return null;

  const currentHousing = gameState.housing;
  const giro = gameState.bankAccount.giroBalance;
  const tagesgeld = gameState.savingsAccount.tagesgeldBalance;
  const totalLiquid = Math.max(0, giro) + tagesgeld;

  const propertySideCosts = selectedHousing?.purchasePrice
    ? calculatePropertyAcquisitionCosts(selectedHousing.purchasePrice)
    : null;

  const handleSelectHousing = (option: HousingOption) => {
    if (option.type === 'PROPERTY_OWNERSHIP') {
      setSelectedHousing(option);
    } else {
      if (option.depositRequired > 0 && totalLiquid < option.depositRequired) {
        alert(
          `Nicht genügend Guthaben für die Mietkaution (${option.depositRequired.toLocaleString(
            'de-DE'
          )} € erforderlich)!`
        );
        return;
      }
      handleChangeHousing(option, 0);
    }
  };

  const handleConfirmPropertyPurchase = () => {
    if (!selectedHousing || !selectedHousing.purchasePrice) return;
    const minNeeded = selectedHousing.downPaymentMin || 45000;
    if (downPayment < minNeeded) {
      alert(`Mindesteigenkapital beträgt ${minNeeded.toLocaleString('de-DE')} €!`);
      return;
    }
    if (totalLiquid < downPayment) {
      alert(`Du hast nur ${totalLiquid.toLocaleString('de-DE')} € liquides Eigenkapital zur Verfügung!`);
      return;
    }

    handleChangeHousing(selectedHousing, downPayment);
    setSelectedHousing(null);
  };

  const handleStartBausparer = (e: React.FormEvent) => {
    e.preventDefault();
    handleOpenBausparer(bausparSum, bausparRate);
    alert(`Bausparvertrag über ${bausparSum.toLocaleString('de-DE')} € erfolgreich eröffnet!`);
  };

  return (
    <ModalShell
      title="Wohnungsmarkt, Miete & Eigentum"
      subtitle={`Aktuell: ${currentHousing.title} (Warmmiete/Kosten: ${currentHousing.monthlyWarmRent} €/Monat)`}
      icon="🏡"
      iconBgColor="bg-amber-100 text-amber-800"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Pedagogical Rule of Thumb */}
        <div className="bg-amber-50 border-2 border-amber-200 p-4 rounded-3xl text-xs text-amber-900 leading-relaxed font-medium">
          <strong>💡 30%-Wohnkosten-Faustregel:</strong> Deine Warmmiete sollte idealerweise maximal <strong>30 bis 35 %</strong> deines monatlichen Nettoeinkommens betragen. Beim Immobilienkauf sind ca. <strong>10 % Kaufnebenkosten</strong> (Grunderwerbsteuer, Notar, Grundbuch) reines Nebengeld, das nicht über das Darlehen getilgt wird!
        </div>

        {/* 4 Housing Options Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {AVAILABLE_HOUSING_OPTIONS.map((option) => {
            const isCurrent = currentHousing.type === option.type;
            const canAffordDeposit = option.depositRequired === 0 || totalLiquid >= option.depositRequired;

            return (
              <div
                key={option.type}
                className={`p-5 rounded-3xl border-2 transition-all flex flex-col justify-between ${
                  isCurrent
                    ? 'bg-matcha-50/70 border-matcha-400 shadow-sm'
                    : 'bg-gray-50 border-gray-200 hover:bg-white'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-extrabold text-sm text-gray-900">{option.title}</span>
                    <span className="text-xs font-black text-matcha-800">
                      {option.monthlyWarmRent} € / Mo
                    </span>
                  </div>

                  <p className="text-xs text-gray-600 mb-3">{option.description}</p>

                  <div className="bg-white p-3 rounded-2xl border border-gray-200 text-xs space-y-1 mb-4 shadow-2xs">
                    <div className="flex justify-between text-gray-700">
                      <span>Kaltmiete:</span>
                      <strong>{option.coldRent} €</strong>
                    </div>
                    <div className="flex justify-between text-gray-700">
                      <span>Nebenkosten & Heizung:</span>
                      <strong>{option.utilitiesCost} €</strong>
                    </div>
                    {option.depositRequired > 0 && (
                      <div className="flex justify-between text-gray-700">
                        <span>Mietkaution (3 Kaltmieten):</span>
                        <strong className={canAffordDeposit ? 'text-gray-900' : 'text-red-600'}>
                          {option.depositRequired.toLocaleString('de-DE')} €
                        </strong>
                      </div>
                    )}
                    {option.purchasePrice && (
                      <div className="flex justify-between text-indigo-900 font-bold pt-1 border-t border-gray-100">
                        <span>Kaufpreis:</span>
                        <span>{option.purchasePrice.toLocaleString('de-DE')} €</span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-200 flex items-center justify-between">
                  {!canAffordDeposit && (
                    <span className="text-[10px] text-red-600 font-bold flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      Kaution fehlt ({option.depositRequired} €)
                    </span>
                  )}

                  <button
                    type="button"
                    disabled={isCurrent || !canAffordDeposit}
                    onClick={() => handleSelectHousing(option)}
                    className={`ml-auto px-4 py-2 rounded-xl text-xs font-extrabold transition-all shadow-xs active:scale-95 flex items-center gap-1.5 cursor-pointer ${
                      isCurrent
                        ? 'bg-matcha-600 text-white cursor-default'
                        : !canAffordDeposit
                        ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                        : 'bg-terracotta-600 hover:bg-terracotta-700 text-white'
                    }`}
                  >
                    {isCurrent ? (
                      <>
                        <Check className="w-4 h-4" />
                        Aktuelle Wohnform
                      </>
                    ) : option.type === 'PROPERTY_OWNERSHIP' ? (
                      'Kaufrechner öffnen'
                    ) : (
                      'Einziehen'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Immobilienkauf Dialog / Rechner */}
        {selectedHousing && selectedHousing.purchasePrice && propertySideCosts && (
          <div className="p-6 rounded-3xl bg-indigo-50 border-2 border-indigo-200 animate-fadeIn">
            <h4 className="font-black text-base text-indigo-950 mb-2 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              Immobilien-Finanzierungsrechner ({selectedHousing.title})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs mb-4">
              <div className="bg-white p-3 rounded-2xl border border-indigo-200">
                <span className="text-gray-400 block text-[10px]">Kaufpreis der Immobilie:</span>
                <strong className="text-sm text-gray-900">{selectedHousing.purchasePrice.toLocaleString('de-DE')} €</strong>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-indigo-200">
                <span className="text-gray-400 block text-[10px]">Kaufnebenkosten (~10 % Notar, Steuern):</span>
                <strong className="text-sm text-red-600">+{propertySideCosts.totalSideCosts.toLocaleString('de-DE')} €</strong>
              </div>
              <div className="bg-white p-3 rounded-2xl border border-indigo-200">
                <span className="text-gray-400 block text-[10px]">Gesamtinvestition:</span>
                <strong className="text-sm text-indigo-900">{propertySideCosts.totalInvestment.toLocaleString('de-DE')} €</strong>
              </div>
            </div>

            <div className="mb-4">
              <label className="font-bold text-xs text-gray-700 block mb-1">
                Eigenkapitaleinsatz: {downPayment.toLocaleString('de-DE')} € (Verfügbar: {totalLiquid.toLocaleString('de-DE')} €)
              </label>
              <input
                type="range"
                min={selectedHousing.downPaymentMin || 45000}
                max={Math.max(selectedHousing.downPaymentMin || 45000, totalLiquid)}
                step={5000}
                value={downPayment}
                onChange={(e) => setDownPayment(Number(e.target.value))}
                className="w-full accent-indigo-600"
              />
              <span className="text-[10px] text-gray-500">
                Darlehenshöhe bei der Bank:{' '}
                <strong>
                  {Math.max(0, propertySideCosts.totalInvestment - downPayment).toLocaleString('de-DE')} €
                </strong>{' '}
                (Zins: 3,8 % über 25 Jahre)
              </span>
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedHousing(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={handleConfirmPropertyPurchase}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-sm cursor-pointer"
              >
                Immobilie kaufen & Darlehen abschließen
              </button>
            </div>
          </div>
        )}

        {/* Bausparvertrag Manager */}
        <div className="p-6 rounded-3xl bg-cozy-cream/60 border border-[#ede5cb]">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-black text-sm text-gray-900 flex items-center gap-2">
              <PiggyBank className="w-4 h-4 text-terracotta-600" />
              Bausparverträge ({gameState.bausparContracts?.length || 0})
            </h4>
          </div>

          {gameState.bausparContracts && gameState.bausparContracts.length > 0 ? (
            <div className="space-y-3 mb-4">
              {gameState.bausparContracts.map((b) => (
                <div key={b.id} className="bg-white p-4 rounded-2xl border border-gray-200 flex items-center justify-between text-xs shadow-2xs">
                  <div>
                    <h5 className="font-black text-gray-900">{b.title}</h5>
                    <p className="text-gray-500">
                      Angespart: <strong className="text-matcha-700">{Math.round(b.accumulatedBalance).toLocaleString('de-DE')} €</strong> von {b.contractSum.toLocaleString('de-DE')} € (Rate: {b.monthlyContribution} €/Mo)
                    </p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full font-bold text-[10px] ${b.isAllotted ? 'bg-matcha-100 text-matcha-800' : 'bg-gray-100 text-gray-600'}`}>
                    {b.isAllotted ? 'Zuteilungsreif 🎉' : 'In Ansparphase'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-gray-500 mb-4">Noch kein Bausparvertrag eröffnet.</p>
          )}

          {/* Formular für neuen Bausparer */}
          <form onSubmit={handleStartBausparer} className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Bausparsumme:</label>
              <select
                value={bausparSum}
                onChange={(e) => setBausparSum(Number(e.target.value))}
                className="w-full p-2 bg-white rounded-xl border border-gray-300 font-bold text-xs"
              >
                <option value={30000}>30.000 € (Renovierung/Startkapital)</option>
                <option value={50000}>50.000 € (Klassischer Wohnbausparer)</option>
                <option value={100000}>100.000 € (Großer Immobilienbausparer)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] font-bold text-gray-700 block mb-1">Monatliche Sparrate:</label>
              <input
                type="number"
                min={50}
                max={500}
                step={25}
                value={bausparRate}
                onChange={(e) => setBausparRate(Number(e.target.value))}
                className="w-full p-2 bg-white rounded-xl border border-gray-300 font-bold text-xs"
              />
            </div>

            <button
              type="submit"
              className="py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Bausparer abschließen
            </button>
          </form>
        </div>
      </div>
    </ModalShell>
  );
};
