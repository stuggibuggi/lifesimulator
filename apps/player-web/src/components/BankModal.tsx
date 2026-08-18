import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { sound } from '../audio/soundSynth';
import {
  calculateEmergencyFundMonths,
  calculateLoanMonthlyRate,
  calculateEffectiveInterestRate,
  calculateTotalInterestProjected,
  calculateDebtRestructuringSavings,
} from '@goal/simulation-engine';
import { ModalShell } from './ModalShell';
import {
  Wallet,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  Coins,
  ArrowRightLeft,
  PiggyBank,
  PlusCircle,
  RefreshCw,
  Percent,
  Calculator,
} from 'lucide-react';

export const BankModal: React.FC = () => {
  const {
    gameState,
    closeModal,
    setActiveModal,
    handleSetSavingsRates,
    handleTakeLoan,
    handleRestructureDebt,
    handleRepayLoan,
  } = useGameStore();

  if (!gameState) return null;

  const [emergencyRate, setEmergencyRate] = useState(
    gameState.savingsAccount.autoSaveRateMonthly
  );
  const [etfRate, setEtfRate] = useState(
    gameState.investmentAccount.monthlySparrate
  );
  const [showLoanCalculator, setShowLoanCalculator] = useState(false);
  const [calcPrincipal, setCalcPrincipal] = useState(2500);
  const [calcMonths, setCalcMonths] = useState(24);
  const [calcInterest, setCalcInterest] = useState(0.069); // 6,9%

  const emergencyMonths = calculateEmergencyFundMonths(
    gameState.savingsAccount.tagesgeldBalance,
    gameState.budget.totalFixedExpenses,
    gameState.budget.totalVariableExpenses
  );

  const isDispoNegative = gameState.bankAccount.giroBalance < 0;
  const dispoDebt = Math.abs(gameState.bankAccount.giroBalance);
  const dispoWarning = gameState.bankAccount.dispoWarningStage || (isDispoNegative ? 'YELLOW' : 'NONE');

  // Umschuldungs-Berechnung
  const restructuringData = isDispoNegative
    ? calculateDebtRestructuringSavings(
        dispoDebt,
        gameState.bankAccount.overdraftInterestAnnual,
        0.065,
        24
      )
    : null;

  // Kreditrechner Werte
  const calcMonthlyRate = calculateLoanMonthlyRate(calcPrincipal, calcInterest, calcMonths);
  const calcEffektivzins = calculateEffectiveInterestRate(calcInterest);
  const calcTotalInterest = calculateTotalInterestProjected(calcPrincipal, calcMonthlyRate, calcMonths);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playPop();
    handleSetSavingsRates(emergencyRate, etfRate);
    alert('Sparraten wurden erfolgreich aktualisiert!');
  };

  const handleApplyCalculatedLoan = () => {
    handleTakeLoan('Ratenkredit (Anschaffung)', calcPrincipal, calcInterest, calcMonths, 'KONSUM');
    setShowLoanCalculator(false);
  };

  return (
    <ModalShell
      title="Stadt-Sparkasse & Konten"
      subtitle="Girokonto, Notgroschen, ETF-Vermögensaufbau & Schuldenprävention"
      icon="🏦"
      iconBgColor="bg-matcha-100 text-matcha-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* --- DISPO FRÜHWARNSYSTEM BANNER BEI NEGATIVEM KONTO --- */}
        {isDispoNegative && (
          <div
            className={`p-4 rounded-3xl border-3 animate-fadeIn ${
              dispoWarning === 'RED'
                ? 'bg-red-50 border-red-400 text-red-950'
                : dispoWarning === 'ORANGE'
                ? 'bg-amber-50 border-amber-400 text-amber-950'
                : 'bg-yellow-50 border-yellow-300 text-yellow-950'
            }`}
          >
            <div className="flex items-start gap-3">
              <AlertTriangle
                className={`w-6 h-6 shrink-0 mt-0.5 ${
                  dispoWarning === 'RED'
                    ? 'text-red-600 animate-bounce'
                    : dispoWarning === 'ORANGE'
                    ? 'text-amber-600'
                    : 'text-yellow-600'
                }`}
              />
              <div className="flex-1 text-xs">
                <div className="flex items-center justify-between">
                  <h4 className="font-black text-sm">
                    {dispoWarning === 'RED'
                      ? '🚨 AKUTE SCHULDENGEFAHR (Dispo-Limit fast erreicht!)'
                      : dispoWarning === 'ORANGE'
                      ? '⚠️ WARNUNG: Erhöhte Dispo-Verschuldung'
                      : 'ℹ️ Hinweis: Dein Girokonto ist im Minus'}
                  </h4>
                  <span className="font-extrabold px-2 py-0.5 rounded-full bg-white/80 border text-[10px]">
                    12,5 % Dispozins p. a.
                  </span>
                </div>

                <p className="mt-1 leading-relaxed">
                  Du zahlst aktuell monatlich ca.{' '}
                  <strong>
                    {Math.round((dispoDebt * (gameState.bankAccount.overdraftInterestAnnual / 12)) * 100) / 100} €
                  </strong>{' '}
                  rein an Dispozinsen an die Bank. Nutze deine Ersparnisse oder den Umschuldungs-Assistenten!
                </p>

                {/* 1-Click Umschuldungs-Option */}
                {restructuringData && (
                  <div className="mt-3 p-3 bg-white rounded-2xl border border-amber-200 flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 text-skyline-600 shrink-0" />
                      <span>
                        <strong>Umschuldungs-Vorschlag:</strong> Dispo ({dispoDebt} €) ablösen durch Ratenkredit zu 6,5 % (24 Monate zu je {restructuringData.newMonthlyRate} €/Mo).
                        <span className="text-matcha-700 font-bold block sm:inline sm:ml-1">
                          Ersparnis: {restructuringData.savingsTotal} € Zinsen!
                        </span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRestructureDebt(24, 0.065)}
                      className="px-4 py-2 bg-matcha-600 hover:bg-matcha-700 text-white rounded-xl font-black text-xs shrink-0 shadow-xs active:scale-95 cursor-pointer"
                    >
                      Jetzt umschulden
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* 3 Account Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Girokonto */}
          <div
            className={`p-5 rounded-3xl border-2 transition-all ${
              gameState.bankAccount.giroBalance < 0
                ? 'bg-red-50/50 border-red-300'
                : 'bg-gray-50 border-gray-200'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-gray-700" />
                <span className="font-extrabold text-sm text-gray-800">Girokonto</span>
              </div>
              <span className="text-xs text-gray-400 font-semibold">Laufend</span>
            </div>

            <div className="my-2">
              <div
                className={`text-2xl font-black ${
                  gameState.bankAccount.giroBalance < 0
                    ? 'text-red-600'
                    : 'text-gray-900'
                }`}
              >
                {Math.round(gameState.bankAccount.giroBalance).toLocaleString('de-DE')} €
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                Dispo-Limit: {gameState.bankAccount.overdraftLimit} € (12,5 % Zins)
              </span>
              <button
                type="button"
                onClick={() => setActiveModal('TRANSACTIONS_MODAL')}
                className="mt-3 w-full px-3 py-2 rounded-xl bg-white border border-gray-300 hover:border-matcha-500 text-xs font-extrabold text-gray-800 transition-all active:scale-95 cursor-pointer"
              >
                Kontoauszug anzeigen
              </button>
            </div>
          </div>

          {/* Tagesgeldkonto (Notgroschen) */}
          <div className="p-5 rounded-3xl bg-matcha-50/60 border-2 border-matcha-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-matcha-700" />
                <span className="font-extrabold text-sm text-matcha-900">Tagesgeld (Notgroschen)</span>
              </div>
              <span className="text-xs text-matcha-600 font-black">2,5 % p. a.</span>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-matcha-900">
                {Math.round(gameState.savingsAccount.tagesgeldBalance).toLocaleString('de-DE')} €
              </div>
              <div className="flex items-center gap-1 mt-1 text-[11px] font-bold text-matcha-800">
                <span>Puffer: {emergencyMonths} Monatsausgaben</span>
                {emergencyMonths >= 3 ? '✅' : '⚠️'}
              </div>
            </div>
          </div>

          {/* ETF-Depot */}
          <div className="p-5 rounded-3xl bg-skyline-50/60 border-2 border-skyline-200">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-skyline-700" />
                <span className="font-extrabold text-sm text-skyline-900">ETF-Weltportfolio</span>
              </div>
              <span className="text-xs text-skyline-600 font-black">~6,0 % p. a.</span>
            </div>

            <div className="my-2">
              <div className="text-2xl font-black text-skyline-900">
                {Math.round(gameState.investmentAccount.etfBalance).toLocaleString('de-DE')} €
              </div>
              <span className="text-[11px] text-gray-500 font-medium">
                Eingezahlt: {Math.round(gameState.investmentAccount.totalDeposited).toLocaleString('de-DE')} €
              </span>
            </div>
          </div>
        </div>

        {/* Sparraten & Vermögensaufbau Formular */}
        <form onSubmit={handleSaveRates} className="p-6 rounded-3xl bg-cozy-cream/60 border border-[#ede5cb]">
          <h3 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
            <PiggyBank className="w-5 h-5 text-terracotta-600" />
            Automatische monatliche Sparraten konfigurieren
          </h3>
          <p className="text-xs text-gray-600 mb-6 leading-relaxed">
            Deine Sparraten werden jeden Monat automatisch vom Girokonto abgebucht, sofern Guthaben vorhanden ist.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Slider Notgroschen */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-matcha-600" /> Notgroschen-Sparrate
                </span>
                <span className="font-black text-sm text-matcha-700">{emergencyRate} € / Mo</span>
              </div>
              <input
                type="range"
                min={0}
                max={300}
                step={10}
                value={emergencyRate}
                onChange={(e) => setEmergencyRate(Number(e.target.value))}
                className="w-full accent-matcha-600 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Empfohlen: Mindestens 20–50 €/Monat bis 3 Monatsausgaben erreicht sind.
              </span>
            </div>

            {/* Slider ETF */}
            <div className="bg-white p-4 rounded-2xl border border-gray-200">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold text-xs text-gray-800 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-skyline-600" /> ETF-Sparplan (Welt-Portfolio)
                </span>
                <span className="font-black text-sm text-skyline-700">{etfRate} € / Mo</span>
              </div>
              <input
                type="range"
                min={0}
                max={400}
                step={25}
                value={etfRate}
                onChange={(e) => setEtfRate(Number(e.target.value))}
                className="w-full accent-skyline-600 cursor-pointer"
              />
              <span className="text-[10px] text-gray-400 mt-1 block">
                Langfristiger Zinseszins-Vermögensaufbau (10–30 Jahre Horizont).
              </span>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button
              type="submit"
              className="px-6 py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Sparraten speichern
            </button>
          </div>
        </form>

        {/* Bestehende Kredite */}
        {gameState.loans.length > 0 && (
          <div className="p-5 rounded-3xl bg-gray-50 border border-gray-200">
            <h4 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2">
              <Coins className="w-4 h-4 text-terracotta-600" />
              Laufende Kredite & Verbindlichkeiten ({gameState.loans.length})
            </h4>

            <div className="space-y-3">
              {gameState.loans.map((loan) => (
                <div
                  key={loan.id}
                  className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-gray-900">{loan.title}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 uppercase">
                        {loan.type}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Restschuld: <strong className="text-red-700">{loan.principalRemaining.toLocaleString('de-DE')} €</strong> • Rate: <strong>{loan.monthlyRate} €/Mo</strong> • Noch {loan.remainingMonths} Monate
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleRepayLoan(loan.id, 200)}
                      disabled={gameState.bankAccount.giroBalance < 200}
                      className="px-3 py-1.5 bg-gray-100 hover:bg-matcha-100 text-gray-800 hover:text-matcha-900 rounded-xl text-xs font-bold transition-all disabled:opacity-40 cursor-pointer"
                    >
                      Sondertilgung (200 €)
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interaktiver Kreditrechner Trigger */}
        <div className="p-5 rounded-3xl bg-skyline-50/50 border border-skyline-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Calculator className="w-5 h-5 text-skyline-600" />
              <div>
                <h4 className="font-black text-sm text-gray-900">Kredit- & Ratenrechner (PAngV)</h4>
                <p className="text-xs text-gray-500">Transparente Kosten, Effektivzins und Zinseszins verstehen</p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowLoanCalculator(!showLoanCalculator)}
              className="px-4 py-2 bg-white hover:bg-skyline-100 text-skyline-800 border border-skyline-300 rounded-xl text-xs font-extrabold transition-all cursor-pointer"
            >
              {showLoanCalculator ? 'Rechner schließen' : 'Kreditrechner öffnen'}
            </button>
          </div>

          {showLoanCalculator && (
            <div className="mt-4 pt-4 border-t border-skyline-200 animate-fadeIn">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs mb-4">
                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Kreditsumme: {calcPrincipal.toLocaleString('de-DE')} €
                  </label>
                  <input
                    type="range"
                    min={500}
                    max={15000}
                    step={500}
                    value={calcPrincipal}
                    onChange={(e) => setCalcPrincipal(Number(e.target.value))}
                    className="w-full accent-skyline-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Laufzeit: {calcMonths} Monate ({Math.round(calcMonths / 12)} Jahre)
                  </label>
                  <input
                    type="range"
                    min={12}
                    max={60}
                    step={6}
                    value={calcMonths}
                    onChange={(e) => setCalcMonths(Number(e.target.value))}
                    className="w-full accent-skyline-600"
                  />
                </div>

                <div>
                  <label className="font-bold text-gray-700 block mb-1">
                    Sollzins p. a.: {(calcInterest * 100).toFixed(1)} %
                  </label>
                  <select
                    value={calcInterest}
                    onChange={(e) => setCalcInterest(Number(e.target.value))}
                    className="w-full p-2 bg-white rounded-xl border border-skyline-300 font-bold"
                  >
                    <option value={0.039}>3,9 % (Günstiger Kfz-/Studienkredit)</option>
                    <option value={0.069}>6,9 % (Standard Ratenkredit)</option>
                    <option value={0.119}>11,9 % (Teurer Konsumkredit / BNPL)</option>
                  </select>
                </div>
              </div>

              {/* Calculated Summary Box */}
              <div className="bg-white p-4 rounded-2xl border border-skyline-200 grid grid-cols-3 gap-3 text-center mb-4">
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Monatliche Rate</span>
                  <p className="text-base font-black text-skyline-800">{calcMonthlyRate} € / Mo</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Effektiver Jahreszins</span>
                  <p className="text-base font-black text-gray-800">{(calcEffektivzins * 100).toFixed(2)} %</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-500 font-bold uppercase">Gesamte Zinskosten</span>
                  <p className="text-base font-black text-amber-700">+{calcTotalInterest.toLocaleString('de-DE')} €</p>
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleApplyCalculatedLoan}
                  className="px-5 py-2.5 bg-skyline-600 hover:bg-skyline-700 text-white rounded-xl font-extrabold shadow-sm active:scale-95 cursor-pointer"
                >
                  Diesen Kredit beantragen (+{calcPrincipal.toLocaleString('de-DE')} € aufs Giro)
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
