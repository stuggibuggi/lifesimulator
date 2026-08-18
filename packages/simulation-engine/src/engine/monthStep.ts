import {
  GameState,
  LifeEvent,
  SimulationSnapshot,
  TransactionRecord,
} from '@goal/shared-types';
import {
  calculateCashflow,
  calculateDispoWarningStage,
  calculateNetWorth,
  calculateOverdraftFeeMonthly,
  stepBausparvertragOneMonth,
  stepLoanOneMonth,
} from '../math/finance';
import {
  calculateGermanPayroll,
  calculateMonthlyPensionPoints,
  calculatePensionOverview,
  stepBavOneMonth,
} from '../math/taxPension';
import { SeededRandom } from '../math/random';
import { checkAndTriggerEvent } from './eventEngine';
import { updateGoalsProgress } from './goalEngine';

export interface StepMonthResult {
  nextState: GameState;
  triggeredEvent: LifeEvent | null;
}

/**
 * Führt genau einen Simulationsschritt (1 Monat) aus.
 * Pure Funktion: Gibt einen neuen Zustand bis Alter 67 (Renteneintritt) zurück.
 */
export function stepSimulationMonth(
  currentState: GameState,
  allEvents: LifeEvent[],
  rng: SeededRandom
): StepMonthResult {
  if (currentState.isGameOver) {
    return { nextState: currentState, triggeredEvent: null };
  }

  // 1. bAV & Rentenfortschritt
  const bavMonthly = currentState.pension?.bavMonthlyContribution || 0;
  const currentBavBalance = currentState.pension?.bavAccumulatedBalance || 0;
  const employerMatch = currentState.pension?.bavEmployerMatchPercent || 0.15;

  const updatedBav = stepBavOneMonth(
    currentBavBalance,
    bavMonthly,
    employerMatch
  );

  // 2. Brutto-Netto & Steuern ermitteln
  const grossSalary = currentState.career.monthlySalaryGross || 0;
  const updatedTax = calculateGermanPayroll(
    grossSalary,
    currentState.tax?.taxClass || 'I',
    currentState.tax?.hasChurchTax || false,
    currentState.family.childrenCount,
    currentState.currentAge
  );

  // 3. Rentenpunkte (Entgeltpunkte) gutschreiben
  const epGain = calculateMonthlyPensionPoints(grossSalary);
  const totalEp = (currentState.pension?.accumulatedPensionPoints || 0) + epGain;

  // 4. Rentenübersicht & Rentenlücke berechnen
  const pensionOverview = calculatePensionOverview(
    totalEp,
    currentState.pension?.targetRetirementNetMonthly || Math.max(1600, updatedTax.netMonthly * 0.8),
    updatedBav.newBalance,
    currentState.investmentAccount.etfBalance
  );

  const updatedPension = {
    ...currentState.pension,
    accumulatedPensionPoints: Math.round(totalEp * 1000) / 1000,
    projectedStatutoryPensionGross: pensionOverview.statutoryGross,
    projectedStatutoryPensionNet: pensionOverview.statutoryNet,
    bavAccumulatedBalance: updatedBav.newBalance,
    projectedPensionGapMonthly: pensionOverview.pensionGapMonthly,
  };

  // 5. Einnahmen buchen (inkl. Kindergeld, Partnerbeitrag, Rente falls im Ruhestand)
  const childBenefitTotal = currentState.family.childrenCount * 250;
  let partnerContribution = 0;
  if (currentState.family.status !== 'SINGLE' && currentState.family.partnerSalaryNet > 0) {
    if (currentState.family.sharingModel === 'THREE_ACCOUNTS') {
      partnerContribution = Math.round(
        (currentState.budget.rentAndHousing +
          currentState.budget.foodAndGroceries +
          currentState.budget.childCareAndSupport) * 0.5
      );
    } else if (currentState.family.sharingModel === 'JOINT_POOL') {
      partnerContribution = currentState.family.partnerSalaryNet;
    }
  }

  const isRetired = currentState.pension?.isRetired || currentState.currentAge >= 67;
  const effectiveNetSalary = isRetired ? 0 : updatedTax.netMonthly;
  const pensionPayout = isRetired ? pensionOverview.totalProjectedRetirementNet : 0;

  const monthlyIncome =
    effectiveNetSalary +
    pensionPayout +
    partnerContribution +
    currentState.budget.familySupport +
    currentState.budget.bafoegOrSecondaryIncome +
    childBenefitTotal +
    currentState.budget.investmentDividends;

  // 6. Fixe & variable Ausgaben berechnen
  const childExpenses =
    currentState.family.childrenCount *
    (currentState.family.childcareCostMonthly + currentState.family.childDirectExpensesMonthly);

  const monthlyExpenses =
    currentState.budget.totalFixedExpenses +
    currentState.budget.totalVariableExpenses;

  // 7. Girokontostand vor Transfers
  let newGiro = currentState.bankAccount.giroBalance + monthlyIncome - monthlyExpenses;

  // 8. Automatische Sparraten ausführen
  let newTagesgeld = currentState.savingsAccount.tagesgeldBalance;
  let newEtf = currentState.investmentAccount.etfBalance;
  let etfDeposited = currentState.investmentAccount.totalDeposited;

  const emergencySave = currentState.savingsAccount.autoSaveRateMonthly;
  if (emergencySave > 0 && newGiro >= emergencySave) {
    newGiro -= emergencySave;
    newTagesgeld += emergencySave;
  }

  const etfSave = currentState.investmentAccount.monthlySparrate;
  if (etfSave > 0 && newGiro >= etfSave) {
    newGiro -= etfSave;
    newEtf += etfSave;
    etfDeposited += etfSave;
  }

  // 9. Bausparverträge monatlich ansparen
  const updatedBausparer = (currentState.bausparContracts || []).map((b) => {
    const canAfford = newGiro >= b.monthlyContribution;
    if (canAfford) {
      newGiro -= b.monthlyContribution;
    }
    return stepBausparvertragOneMonth(b, canAfford);
  });

  // 10. Zinsen & Dispo-Gebühren
  if (newGiro < 0) {
    const dispoFee = calculateOverdraftFeeMonthly(
      newGiro,
      currentState.bankAccount.overdraftInterestAnnual
    );
    newGiro -= dispoFee;
  }

  // Tagesgeldzinsen
  const savingsInterestMonthly =
    newTagesgeld * (currentState.savingsAccount.interestRateAnnual / 12);
  newTagesgeld += savingsInterestMonthly;

  // ETF-Wertentwicklung (Langfristiger Zinseszins)
  const monthlyBaseReturn = currentState.investmentAccount.averageAnnualReturn / 12;
  const marketFluctuation = rng.nextGaussian(0, 0.03);
  const monthlyTotalReturn = monthlyBaseReturn + marketFluctuation;
  newEtf = Math.max(0, newEtf * (1 + monthlyTotalReturn));

  // 11. Kredite & Immobiliendarlehen fortschreiben
  const updatedLoans = currentState.loans
    .map((loan) => {
      const step = stepLoanOneMonth(loan);
      return step.updatedLoan;
    })
    .filter((l) => l.principalRemaining > 0);

  const updatedLoanRatesTotal = updatedLoans.reduce((sum, l) => sum + l.monthlyRate, 0);

  // 12. Versicherungen: Wartezeiten reduzieren
  const updatedInsurances = currentState.insurances.map((ins) => {
    if (ins.isActive && ins.waitingPeriodMonthsRemaining > 0) {
      return {
        ...ins,
        waitingPeriodMonthsRemaining: Math.max(0, ins.waitingPeriodMonthsRemaining - 1),
      };
    }
    return ins;
  });

  // 13. Karriere & Gehaltsentwicklung
  let updatedCareer = { ...currentState.career };
  if (currentState.currentMonth === 12) {
    updatedCareer.currentYear += 1;

    if (updatedCareer.isCompleted && updatedCareer.type === 'ANGESTELLTER') {
      updatedCareer.monthlySalaryGross = Math.round(updatedCareer.monthlySalaryGross * 1.025);
      updatedCareer.monthlySalaryNet = updatedTax.netMonthly;
    }

    if (
      !updatedCareer.isCompleted &&
      updatedCareer.currentYear > updatedCareer.durationYears
    ) {
      updatedCareer.isCompleted = true;
      if (updatedCareer.type === 'AUSBILDUNG') {
        updatedCareer.type = 'ANGESTELLTER';
        updatedCareer.title = `Fachkraft (${updatedCareer.branch})`;
        updatedCareer.monthlySalaryGross = Math.max(3000, Math.round(updatedCareer.monthlySalaryGross * 2.2));
      } else if (updatedCareer.type === 'STUDIUM') {
        updatedCareer.type = 'ANGESTELLTER';
        updatedCareer.title = `Bachelor / Junior (${updatedCareer.branch})`;
        updatedCareer.monthlySalaryGross = Math.max(3800, Math.round(updatedCareer.monthlySalaryGross * 2.8));
      }
    }
  }

  // 14. Elternzeit fortschreiben
  let updatedFamily = { ...currentState.family };
  if (updatedFamily.isParentalLeaveActive && updatedFamily.parentalLeaveMonthsRemaining > 0) {
    updatedFamily.parentalLeaveMonthsRemaining -= 1;
    if (updatedFamily.parentalLeaveMonthsRemaining === 0) {
      updatedFamily.isParentalLeaveActive = false;
    }
  }

  // 15. Metriken dynamisch anpassen
  let updatedHealth = currentState.metrics.health;
  let updatedHappiness = currentState.metrics.happiness;
  let updatedStress = currentState.metrics.stress;

  const warningStage = calculateDispoWarningStage(newGiro, currentState.bankAccount.overdraftLimit);
  if (warningStage === 'RED') {
    updatedStress = Math.min(100, updatedStress + 6);
    updatedHappiness = Math.max(0, updatedHappiness - 4);
  } else if (warningStage === 'ORANGE') {
    updatedStress = Math.min(100, updatedStress + 3);
    updatedHappiness = Math.max(0, updatedHappiness - 2);
  } else if (warningStage === 'YELLOW') {
    updatedStress = Math.min(100, updatedStress + 1);
  } else if (newTagesgeld > monthlyExpenses * 3) {
    updatedStress = Math.max(10, updatedStress - 1);
    updatedHappiness = Math.min(100, updatedHappiness + 1);
  }

  // 16. Aktualisiertes Budget
  const bausparRatesTotal = updatedBausparer.reduce((sum, b) => sum + b.monthlyContribution, 0);

  const updatedBudget = {
    ...currentState.budget,
    grossSalary: updatedCareer.monthlySalaryGross,
    netSalary: effectiveNetSalary,
    partnerContribution,
    childBenefitTotal,
    pensionPayoutMonthly: pensionPayout,
    totalIncome:
      effectiveNetSalary +
      pensionPayout +
      partnerContribution +
      currentState.budget.familySupport +
      currentState.budget.bafoegOrSecondaryIncome +
      childBenefitTotal +
      currentState.budget.investmentDividends,
    childCareAndSupport: childExpenses,
    loanRatesTotal: updatedLoanRatesTotal,
    bausparContributionsTotal: bausparRatesTotal,
    bavAutoDeduction: bavMonthly,
    totalFixedExpenses:
      currentState.budget.rentAndHousing +
      currentState.budget.utilitiesAndEnergy +
      currentState.budget.foodAndGroceries +
      childExpenses +
      currentState.budget.mobilityPublicTransitOrCar +
      currentState.budget.phoneInternetSubscriptions +
      currentState.budget.insurancesTotal +
      updatedLoanRatesTotal +
      bausparRatesTotal +
      bavMonthly,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  // 17. Monatliche Transaktion
  const monthTx: TransactionRecord = {
    id: `tx_mo_${currentState.currentAge}_${currentState.currentMonth}_${rng.nextInt(100, 999)}`,
    age: currentState.currentAge,
    year: currentState.currentYear,
    month: currentState.currentMonth,
    amount: Math.round((monthlyIncome - monthlyExpenses) * 100) / 100,
    category: isRetired ? 'Rentenauszahlung' : 'Monatsabschluss',
    description: isRetired
      ? `Gesetzliche + bAV + ETF-Rente (+${monthlyIncome} €)`
      : `Gehalt Netto (+${effectiveNetSalary} €), Fixe & var. Ausgaben (-${monthlyExpenses} €)`,
    isAutomatic: true,
  };

  // 18. Datum & Ruhestand (Lebenslauf bis Alter 67 = 51 Jahre)
  let nextMonth = currentState.currentMonth + 1;
  let nextAge = currentState.currentAge;
  let nextYear = currentState.currentYear;
  let isGameOver = false;

  if (nextMonth > 12) {
    nextMonth = 1;
    nextAge += 1;
    nextYear += 1;
  }

  if (nextAge >= 67 && nextMonth === 1) {
    isGameOver = true;
  }

  // Zwischenzustand
  let interimState: GameState = {
    ...currentState,
    currentAge: nextAge,
    currentYear: nextYear,
    currentMonth: nextMonth,
    isGameOver,
    career: updatedCareer,
    family: updatedFamily,
    bausparContracts: updatedBausparer,
    tax: updatedTax,
    pension: updatedPension,
    insurances: updatedInsurances,
    bankAccount: {
      ...currentState.bankAccount,
      giroBalance: Math.round(newGiro * 100) / 100,
      dispoWarningStage: warningStage,
    },
    savingsAccount: {
      ...currentState.savingsAccount,
      tagesgeldBalance: Math.round(newTagesgeld * 100) / 100,
    },
    investmentAccount: {
      ...currentState.investmentAccount,
      etfBalance: Math.round(newEtf * 100) / 100,
      totalDeposited: etfDeposited,
    },
    loans: updatedLoans,
    budget: updatedBudget,
    metrics: {
      health: updatedHealth,
      happiness: updatedHappiness,
      stress: updatedStress,
      freeTimeHoursWeekly: isRetired
        ? 45
        : Math.max(5, 45 - updatedCareer.timeCommitmentHoursWeekly - updatedFamily.childrenCount * 3),
      knowledgePoints: Math.min(100, currentState.metrics.knowledgePoints + 1),
    },
    transactions: [monthTx, ...currentState.transactions].slice(0, 100),
  };

  // 19. Ziele prüfen
  interimState.goals = updateGoalsProgress(interimState);

  // 20. Snapshot erstellen
  const snapshot: SimulationSnapshot = {
    age: nextAge,
    year: nextYear,
    month: nextMonth,
    giroBalance: interimState.bankAccount.giroBalance,
    savingsBalance: interimState.savingsAccount.tagesgeldBalance,
    etfBalance: interimState.investmentAccount.etfBalance,
    propertyEquity: interimState.housing.propertyValue || 0,
    bavBalance: updatedBav.newBalance,
    totalDebt: updatedLoans.reduce(
      (sum, l) => sum + l.principalRemaining,
      interimState.bankAccount.giroBalance < 0
        ? Math.abs(interimState.bankAccount.giroBalance)
        : 0
    ),
    netWorth: calculateNetWorth(
      interimState.bankAccount,
      interimState.savingsAccount,
      interimState.investmentAccount,
      interimState.loans,
      interimState.housing,
      interimState.bausparContracts
    ),
    monthlyIncome: interimState.budget.totalIncome,
    monthlyExpenses:
      interimState.budget.totalFixedExpenses +
      interimState.budget.totalVariableExpenses,
    pensionPoints: updatedPension.accumulatedPensionPoints,
    happiness: interimState.metrics.happiness,
    health: interimState.metrics.health,
    stress: interimState.metrics.stress,
  };

  interimState.historySnapshots = [
    ...interimState.historySnapshots,
    snapshot,
  ].slice(-612); // Bis zu 51 Jahre Historie

  // 21. Zufallsereignis prüfen
  const triggeredEvent = isGameOver
    ? null
    : checkAndTriggerEvent(allEvents, interimState, rng);

  if (triggeredEvent) {
    interimState.activeEvent = triggeredEvent;
    interimState.isPaused = true;
  }

  return {
    nextState: interimState,
    triggeredEvent,
  };
}
