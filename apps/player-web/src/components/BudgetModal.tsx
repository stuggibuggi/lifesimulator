import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ModalShell } from './ModalShell';
import { ArrowDownCircle, ArrowUpCircle, PiggyBank } from 'lucide-react';

export const BudgetModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();

  if (!gameState) return null;

  const budget = gameState.budget;
  const totalIncome = budget.totalIncome;
  const fixedPercent = totalIncome > 0 ? Math.round((budget.totalFixedExpenses / totalIncome) * 100) : 0;
  const varPercent = totalIncome > 0 ? Math.round((budget.totalVariableExpenses / totalIncome) * 100) : 0;
  const savingsPercent = totalIncome > 0 ? Math.round((budget.totalSavingsTransfers / totalIncome) * 100) : 0;

  return (
    <ModalShell
      title="Monatsbudget & Cashflow"
      subtitle="50-30-20 Struktur deiner monatlichen Einnahmen und Ausgaben"
      icon="📊"
      iconBgColor="bg-skyline-100 text-skyline-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* 50-30-20 Visual Progress Bar */}
        <div className="bg-cozy-cream/60 p-5 rounded-3xl border border-[#ede5cb]">
          <div className="flex items-center justify-between text-xs font-black mb-2">
            <span className="text-terracotta-700">Fixkosten: {fixedPercent}% (Ziel: ~50%)</span>
            <span className="text-amber-700">Wünsche & Freizeit: {varPercent}% (Ziel: ~30%)</span>
            <span className="text-matcha-700">Sparen & Vorsorge: {savingsPercent}% (Ziel: ~20%)</span>
          </div>

          <div className="h-4 w-full bg-gray-200 rounded-full overflow-hidden flex shadow-inner">
            <div
              style={{ width: `${Math.min(100, fixedPercent)}%` }}
              className="bg-terracotta-400 h-full transition-all"
            />
            <div
              style={{ width: `${Math.min(100, varPercent)}%` }}
              className="bg-amber-400 h-full transition-all"
            />
            <div
              style={{ width: `${Math.min(100, savingsPercent)}%` }}
              className="bg-matcha-500 h-full transition-all"
            />
          </div>
        </div>

        {/* Breakdown Grid: Income vs Expenses */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Einnahmen */}
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
              <ArrowUpCircle className="w-5 h-5 text-matcha-600" />
              <h3 className="font-black text-sm text-gray-900">Monatliche Einnahmen</h3>
              <span className="ml-auto font-black text-matcha-700 text-sm">
                +{Math.round(budget.totalIncome).toLocaleString('de-DE')} €
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-700">
                <span>Nettogehalt:</span>
                <span className="font-bold text-gray-900">{budget.netSalary} €</span>
              </div>
              {budget.partnerContribution > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Partner-Haushaltsbeitrag:</span>
                  <span className="font-bold text-gray-900">+{budget.partnerContribution} €</span>
                </div>
              )}
              {budget.childBenefitTotal > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Kindergeld:</span>
                  <span className="font-bold text-gray-900">+{budget.childBenefitTotal} €</span>
                </div>
              )}
              {budget.familySupport > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Unterstützung Familie:</span>
                  <span className="font-bold text-gray-900">+{budget.familySupport} €</span>
                </div>
              )}
              {budget.pensionPayoutMonthly > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Rentenauszahlung:</span>
                  <span className="font-bold text-gray-900">+{budget.pensionPayoutMonthly} €</span>
                </div>
              )}
            </div>
          </div>

          {/* Ausgaben */}
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200">
            <div className="flex items-center gap-2 mb-4 pb-2 border-b border-gray-200">
              <ArrowDownCircle className="w-5 h-5 text-terracotta-600" />
              <h3 className="font-black text-sm text-gray-900">Monatliche Fixkosten</h3>
              <span className="ml-auto font-black text-terracotta-700 text-sm">
                -{Math.round(budget.totalFixedExpenses).toLocaleString('de-DE')} €
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-gray-700">
                <span>Miete / Wohnen:</span>
                <span className="font-bold text-gray-900">-{budget.rentAndHousing} €</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Lebensmittel & Ernährung:</span>
                <span className="font-bold text-gray-900">-{budget.foodAndGroceries} €</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Mobilität (ÖPNV/Auto):</span>
                <span className="font-bold text-gray-900">-{budget.mobilityPublicTransitOrCar} €</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Telefon / Internet:</span>
                <span className="font-bold text-gray-900">-{budget.phoneInternetSubscriptions} €</span>
              </div>
              <div className="flex justify-between text-gray-700">
                <span>Versicherungsbeiträge:</span>
                <span className="font-bold text-gray-900">-{budget.insurancesTotal} €</span>
              </div>
              {budget.loanRatesTotal > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Kreditraten:</span>
                  <span className="font-bold text-red-700">-{budget.loanRatesTotal} €</span>
                </div>
              )}
              {budget.bausparContributionsTotal > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Bauspar-Beiträge:</span>
                  <span className="font-bold text-amber-700">-{budget.bausparContributionsTotal} €</span>
                </div>
              )}
              {budget.bavAutoDeduction > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>bAV Betriebsrente:</span>
                  <span className="font-bold text-indigo-700">-{budget.bavAutoDeduction} €</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Net Cashflow Summary Box */}
        <div className="p-5 rounded-3xl bg-matcha-50/80 border-2 border-matcha-300 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <PiggyBank className="w-8 h-8 text-matcha-700" />
            <div>
              <h4 className="font-black text-sm text-matcha-950">Monatlicher Netto-Cashflow</h4>
              <p className="text-xs text-matcha-800">
                Verbleibt nach allen Fix- und variablen Kosten sowie automatischen Sparüberträgen auf dem Girokonto.
              </p>
            </div>
          </div>

          <div className="text-2xl font-black text-matcha-900 shrink-0">
            {budget.monthlyCashflow >= 0 ? '+' : ''}
            {Math.round(budget.monthlyCashflow).toLocaleString('de-DE')} €
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
