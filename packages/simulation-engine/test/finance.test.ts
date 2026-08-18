import { describe, expect, it } from 'vitest';
import {
  calculateCashflow,
  calculateEmergencyFundMonths,
  calculateLoanMonthlyRate,
  calculateNetWorth,
  calculateOverdraftFeeMonthly,
  calculateSavingsGrowth,
  stepLoanOneMonth,
} from '../src/math/finance';
import { SeededRandom } from '../src/math/random';
import { MonthlyBudget, LoanItem } from '@goal/shared-types';

describe('Finanzmathematik Tests (finance.ts)', () => {
  it('berechnet den monatlichen Cashflow korrekt', () => {
    const budget: MonthlyBudget = {
      netSalary: 2200,
      familySupport: 0,
      bafoegOrSecondaryIncome: 0,
      investmentDividends: 0,
      totalIncome: 2200,

      rentAndHousing: 650,
      utilitiesAndEnergy: 120,
      foodAndGroceries: 300,
      mobilityPublicTransitOrCar: 80,
      phoneInternetSubscriptions: 40,
      insurancesTotal: 60,
      loanRatesTotal: 150,
      totalFixedExpenses: 1400,

      leisureAndHobbies: 200,
      personalCareAndShopping: 100,
      totalVariableExpenses: 300,

      emergencyFundAutoSave: 100,
      etfAutoInvest: 150,
      totalSavingsTransfers: 250,

      monthlyCashflow: 0,
    };

    const cashflow = calculateCashflow(budget);
    // 2200 - (1400 + 300 + 250) = 250
    expect(cashflow).toBe(250);
  });

  it('berechnet das Nettovermögen inklusive Disposchulden und Krediten', () => {
    const netWorthPositive = calculateNetWorth(
      { giroBalance: 1500, overdraftLimit: 500, overdraftInterestAnnual: 0.115 },
      { tagesgeldBalance: 5000, interestRateAnnual: 0.025, autoSaveRateMonthly: 50 },
      { etfBalance: 8000, monthlySparrate: 100, totalDeposited: 7000, averageAnnualReturn: 0.06 },
      [{ id: '1', type: 'KONSUM', title: 'Auto', principalInitial: 5000, principalRemaining: 2000, monthlyRate: 150, nominalInterestAnnual: 0.05, remainingMonths: 14, totalInterestPaid: 100 }]
    );
    // (1500 + 5000 + 8000) - 2000 = 12500
    expect(netWorthPositive).toBe(12500);

    const netWorthNegativeGiro = calculateNetWorth(
      { giroBalance: -400, overdraftLimit: 500, overdraftInterestAnnual: 0.115 },
      { tagesgeldBalance: 100, interestRateAnnual: 0.025, autoSaveRateMonthly: 0 },
      { etfBalance: 0, monthlySparrate: 0, totalDeposited: 0, averageAnnualReturn: 0.06 },
      []
    );
    // (0 + 100 + 0) - 400 = -300
    expect(netWorthNegativeGiro).toBe(-300);
  });

  it('berechnet Kreditannuität und Tilgungsplan korrekt', () => {
    // 5.000 € Kredit, 6% Jahreszins, 24 Monate
    const rate = calculateLoanMonthlyRate(5000, 0.06, 24);
    expect(rate).toBeGreaterThan(210);
    expect(rate).toBeLessThan(230);

    const loan: LoanItem = {
      id: 'test_loan',
      type: 'KONSUM',
      title: 'Möbelkredit',
      principalInitial: 1000,
      principalRemaining: 1000,
      monthlyRate: 100,
      nominalInterestAnnual: 0.12, // 12% p.a. -> 1% pro Monat
      remainingMonths: 11,
      totalInterestPaid: 0,
    };

    const step = stepLoanOneMonth(loan);
    // 1000 * 1% = 10 € Zins, Tilgung = 90 €, Restschuld = 910 €
    expect(step.interestPaid).toBe(10);
    expect(step.principalPaid).toBe(90);
    expect(step.updatedLoan.principalRemaining).toBe(910);
    expect(step.updatedLoan.remainingMonths).toBe(10);
  });

  it('berechnet Notgroschen-Monate und Dispo-Zinsen exakt', () => {
    const months = calculateEmergencyFundMonths(3600, 900, 300);
    // 3600 / (900 + 300) = 3.0 Monate
    expect(months).toBe(3);

    const dispoFee = calculateOverdraftFeeMonthly(-1000, 0.12);
    // 1000 * 1% = 10 €
    expect(dispoFee).toBe(10);
  });

  it('erzeugt reproduzierbare Pseudozufallszahlen mit Seed', () => {
    const rng1 = new SeededRandom(12345);
    const rng2 = new SeededRandom(12345);

    const sequence1 = [rng1.next(), rng1.next(), rng1.nextInt(1, 100)];
    const sequence2 = [rng2.next(), rng2.next(), rng2.nextInt(1, 100)];

    expect(sequence1).toEqual(sequence2);
  });
});
