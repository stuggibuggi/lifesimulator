import {
  BankAccount,
  Bausparvertrag,
  FamilyState,
  HousingState,
  InvestmentAccount,
  LoanItem,
  MonthlyBudget,
  SavingsAccount,
} from '@goal/shared-types';

/**
 * Finanzmathematische Hilfsfunktionen für die Lebenssimulation
 */

/**
 * Berechnet den monatlichen Cashflow aus den Budgetposten
 */
export function calculateCashflow(budget: MonthlyBudget): number {
  return (
    budget.totalIncome -
    (budget.totalFixedExpenses +
      budget.totalVariableExpenses +
      budget.totalSavingsTransfers)
  );
}

/**
 * Berechnet das Nettovermögen (Giro + Tagesgeld + ETF + Bausparen + Immobilienwert - Kredite)
 */
export function calculateNetWorth(
  bank: BankAccount,
  savings: SavingsAccount,
  investments: InvestmentAccount,
  loans: LoanItem[],
  housing?: HousingState,
  bausparer?: Bausparvertrag[]
): number {
  const propertyEquity = housing?.propertyValue || 0;
  const bausparBalance = bausparer
    ? bausparer.reduce((sum, b) => sum + b.accumulatedBalance, 0)
    : 0;

  const totalAssets =
    Math.max(0, bank.giroBalance) +
    savings.tagesgeldBalance +
    investments.etfBalance +
    propertyEquity +
    bausparBalance;

  const totalDebt = loans.reduce(
    (sum, loan) => sum + loan.principalRemaining,
    bank.giroBalance < 0 ? Math.abs(bank.giroBalance) : 0
  );

  return totalAssets - totalDebt;
}

/**
 * Berechnet die monatliche Annuität / Rate für einen Kredit
 * Formel: Rate = K * (q^n * (q-1)) / (q^n - 1) mit q = 1 + i
 */
export function calculateLoanMonthlyRate(
  principal: number,
  nominalAnnualInterest: number,
  months: number
): number {
  if (months <= 0) return principal;
  if (nominalAnnualInterest <= 0) {
    return Math.round((principal / months) * 100) / 100;
  }

  const monthlyInterestRate = nominalAnnualInterest / 12;
  const q = 1 + monthlyInterestRate;
  const qPowN = Math.pow(q, months);
  const monthlyRate = principal * ((qPowN * (q - 1)) / (qPowN - 1));

  return Math.round(monthlyRate * 100) / 100;
}

/**
 * Berechnet die erwarteten Gesamtzinskosten eines Kredits über die Laufzeit
 */
export function calculateTotalInterestProjected(
  principal: number,
  monthlyRate: number,
  months: number
): number {
  const totalPayments = monthlyRate * months;
  return Math.max(0, Math.round((totalPayments - principal) * 100) / 100);
}

/**
 * Berechnet den effektiven Jahreszins nach PAngV Näherungsformel
 */
export function calculateEffectiveInterestRate(
  nominalAnnualInterest: number,
  processingFeePercent: number = 0
): number {
  const m = 12;
  const nominalMonthly = nominalAnnualInterest / m;
  const compounded = Math.pow(1 + nominalMonthly, m) - 1;
  const withFees = compounded + processingFeePercent;
  return Math.round(withFees * 10000) / 10000;
}

/**
 * Simuliert einen Monat für ein Darlehen
 */
export function stepLoanOneMonth(loan: LoanItem): {
  updatedLoan: LoanItem;
  interestPaid: number;
  principalPaid: number;
} {
  if (loan.principalRemaining <= 0 || loan.remainingMonths <= 0) {
    return {
      updatedLoan: { ...loan, principalRemaining: 0, remainingMonths: 0 },
      interestPaid: 0,
      principalPaid: 0,
    };
  }

  const monthlyInterest =
    loan.principalRemaining * (loan.nominalInterestAnnual / 12);
  let principalPaid = loan.monthlyRate - monthlyInterest;

  if (principalPaid > loan.principalRemaining) {
    principalPaid = loan.principalRemaining;
  }

  const remaining = Math.max(0, loan.principalRemaining - principalPaid);
  const newRemainingMonths = Math.max(0, loan.remainingMonths - 1);

  return {
    updatedLoan: {
      ...loan,
      principalRemaining: Math.round(remaining * 100) / 100,
      remainingMonths: newRemainingMonths,
      totalInterestPaid:
        Math.round((loan.totalInterestPaid + monthlyInterest) * 100) / 100,
    },
    interestPaid: Math.round(monthlyInterest * 100) / 100,
    principalPaid: Math.round(principalPaid * 100) / 100,
  };
}

/**
 * Berechnet Zinseszins für Sparanlagen über n Monate
 */
export function calculateSavingsGrowth(
  currentBalance: number,
  monthlyContribution: number,
  annualInterestRate: number,
  months: number
): { finalBalance: number; totalContributions: number; totalInterestEarned: number } {
  const monthlyRate = annualInterestRate / 12;
  let balance = currentBalance;
  let totalContributions = 0;

  for (let i = 0; i < months; i++) {
    const interest = balance * monthlyRate;
    balance += interest + monthlyContribution;
    totalContributions += monthlyContribution;
  }

  const totalInterestEarned =
    balance - (currentBalance + totalContributions);

  return {
    finalBalance: Math.round(balance * 100) / 100,
    totalContributions: Math.round(totalContributions * 100) / 100,
    totalInterestEarned: Math.round(totalInterestEarned * 100) / 100,
  };
}

/**
 * Simuliert einen Monat für einen Bausparvertrag
 */
export function stepBausparvertragOneMonth(
  contract: Bausparvertrag,
  canAffordContribution: boolean
): Bausparvertrag {
  const contribution = canAffordContribution ? contract.monthlyContribution : 0;
  const monthlyInterest =
    contract.accumulatedBalance * (contract.interestSavingsRate / 12);
  const newBalance = contract.accumulatedBalance + contribution + monthlyInterest;
  const isAllotted = newBalance >= contract.contractSum * contract.minimumSavingsRatio;

  return {
    ...contract,
    accumulatedBalance: Math.round(newBalance * 100) / 100,
    isAllotted,
  };
}

/**
 * Berechnet die Kaufnebenkosten einer Immobilie (Grunderwerbsteuer, Notar, Grundbuch, Makler ~10%)
 */
export function calculatePropertyAcquisitionCosts(purchasePrice: number): {
  transferTax: number; // Grunderwerbsteuer (z.B. 5,0%)
  notaryAndRegistry: number; // Notar & Grundbuch (1,5%)
  brokerFee: number; // Maklercourtage (3,57%)
  totalSideCosts: number; // Gesamte Kaufnebenkosten (~10,07%)
  totalInvestment: number;
} {
  const transferTax = Math.round(purchasePrice * 0.05 * 100) / 100;
  const notaryAndRegistry = Math.round(purchasePrice * 0.015 * 100) / 100;
  const brokerFee = Math.round(purchasePrice * 0.0357 * 100) / 100;
  const totalSideCosts = transferTax + notaryAndRegistry + brokerFee;

  return {
    transferTax,
    notaryAndRegistry,
    brokerFee,
    totalSideCosts: Math.round(totalSideCosts * 100) / 100,
    totalInvestment: Math.round((purchasePrice + totalSideCosts) * 100) / 100,
  };
}

/**
 * Berechnet, wie viele Monate die Notfallrücklage die Monatsausgaben deckt
 */
export function calculateEmergencyFundMonths(
  tagesgeld: number,
  monthlyFixedExpenses: number,
  monthlyVariableExpenses: number
): number {
  const totalExpenses = monthlyFixedExpenses + monthlyVariableExpenses;
  if (totalExpenses <= 0) return 12;
  return Math.round((tagesgeld / totalExpenses) * 10) / 10;
}

/**
 * Berechnet Dispo-Zinsen für einen überzogenen Kontostand
 */
export function calculateOverdraftFeeMonthly(
  giroBalance: number,
  annualOverdraftRate: number
): number {
  if (giroBalance >= 0) return 0;
  const debt = Math.abs(giroBalance);
  const monthlyFee = debt * (annualOverdraftRate / 12);
  return Math.round(monthlyFee * 100) / 100;
}

/**
 * Ermittelt die Dispo-Warnstufe anhand des Kontostands und Limits
 */
export function calculateDispoWarningStage(
  giroBalance: number,
  overdraftLimit: number
): 'NONE' | 'YELLOW' | 'ORANGE' | 'RED' {
  if (giroBalance >= 0) return 'NONE';
  const debt = Math.abs(giroBalance);
  if (debt > overdraftLimit || debt >= 2000) return 'RED';
  if (debt >= 750) return 'ORANGE';
  return 'YELLOW';
}

/**
 * Berechnet die Zinsersparnis bei Umschuldung von Dispo in Ratenkredit
 */
export function calculateDebtRestructuringSavings(
  debtAmount: number,
  dispoAnnualInterest: number,
  installmentAnnualInterest: number,
  termMonths: number
): {
  dispoTotalInterest: number;
  installmentTotalInterest: number;
  savingsTotal: number;
  newMonthlyRate: number;
} {
  const dispoMonthlyRate = calculateLoanMonthlyRate(debtAmount, dispoAnnualInterest, termMonths);
  const dispoTotalInterest = calculateTotalInterestProjected(debtAmount, dispoMonthlyRate, termMonths);

  const newMonthlyRate = calculateLoanMonthlyRate(debtAmount, installmentAnnualInterest, termMonths);
  const installmentTotalInterest = calculateTotalInterestProjected(debtAmount, newMonthlyRate, termMonths);

  const savingsTotal = Math.max(0, Math.round((dispoTotalInterest - installmentTotalInterest) * 100) / 100);

  return {
    dispoTotalInterest,
    installmentTotalInterest,
    savingsTotal,
    newMonthlyRate,
  };
}

/**
 * Realistische Schadensregulierung unter Berücksichtigung von Wartezeiten, Deckungssummen und Selbstbeteiligung
 */
export function calculateInsuranceClaimPayout(
  claimGrossAmount: number,
  coverageLimit: number,
  deductible: number,
  waitingPeriodMonthsRemaining: number,
  hasExclusionClause: boolean = false
): {
  isCovered: boolean;
  payoutAmount: number;
  playerOutOfPocket: number;
  rejectionReason?: string;
} {
  if (hasExclusionClause) {
    return {
      isCovered: false,
      payoutAmount: 0,
      playerOutOfPocket: claimGrossAmount,
      rejectionReason: 'Schaden abgelehnt: Vorerkrankung / vertraglicher Leistungsausschluss.',
    };
  }

  if (waitingPeriodMonthsRemaining > 0) {
    return {
      isCovered: false,
      payoutAmount: 0,
      playerOutOfPocket: claimGrossAmount,
      rejectionReason: `Schaden abgelehnt: Vertrag befindet sich noch in der Wartezeit (${waitingPeriodMonthsRemaining} Monate verbleibend).`,
    };
  }

  const coveredAmount = Math.min(claimGrossAmount, coverageLimit);
  const payoutAmount = Math.max(0, coveredAmount - deductible);
  const playerOutOfPocket = claimGrossAmount - payoutAmount;

  return {
    isCovered: true,
    payoutAmount: Math.round(payoutAmount * 100) / 100,
    playerOutOfPocket: Math.round(playerOutOfPocket * 100) / 100,
  };
}
