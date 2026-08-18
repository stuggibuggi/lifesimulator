import { describe, it, expect } from 'vitest';
import {
  calculateGermanPayroll,
  calculateMonthlyPensionPoints,
  calculatePensionOverview,
  stepBavOneMonth,
  createInitialGameState,
  stepSimulationMonth,
  setBavMonthlyContribution,
  setTaxParameters,
  SeededRandom,
} from '../src';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS } from '@goal/game-content';

describe('Phase 5 & 6: Steuern, Altersvorsorge & Ruhestand (Alter 67)', () => {
  it('berechnet die Brutto-Netto-Lohnabrechnung nach deutschen Sozialversicherungsregeln', () => {
    // 3.500 € Brutto, Steuerklasse I, keine Kinder, Alter 25
    const payroll = calculateGermanPayroll(3500, 'I', false, 0, 25);

    expect(payroll.grossMonthly).toBe(3500);
    // RV: 9,3 % von 3500 = 325,50 €
    expect(payroll.pensionInsuranceMonthly).toBeCloseTo(325.5, 1);
    // KV: 8,4 % von 3500 = 294,00 €
    expect(payroll.healthInsuranceMonthly).toBeCloseTo(294.0, 1);
    // Gesamtsozialabgaben ~20–22 %
    expect(payroll.totalSocialDeductionsMonthly).toBeGreaterThan(700);
    expect(payroll.totalSocialDeductionsMonthly).toBeLessThan(800);
    // Nettoauszahlung
    expect(payroll.netMonthly).toBeGreaterThan(2100);
    expect(payroll.netMonthly).toBeLessThan(2400);
  });

  it('berücksichtigt Minijobs bis 538 € abgabenfrei', () => {
    const payroll = calculateGermanPayroll(520, 'I', false, 0, 17);
    expect(payroll.totalSocialDeductionsMonthly).toBe(0);
    expect(payroll.totalTaxesMonthly).toBe(0);
    expect(payroll.netMonthly).toBe(520);
  });

  it('berechnet Rentenpunkte (Entgeltpunkte) und gesetzliche Rente', () => {
    // Durchschnittsentgelt: 3.780 €/Mo = 1,0 EP pro Jahr
    const monthlyEp = calculateMonthlyPensionPoints(3780);
    expect(monthlyEp * 12).toBeCloseTo(1.0, 2);

    // 40 EP bei aktuellem Rentenwert von 39,32 €
    const overview = calculatePensionOverview(40, 2200, 0, 0);
    expect(overview.statutoryGross).toBeCloseTo(40 * 39.32, 1);
    expect(overview.statutoryNet).toBeGreaterThan(1200);
    expect(overview.pensionGapMonthly).toBeGreaterThan(800);
  });

  it('berechnet die betriebliche Altersvorsorge (bAV) mit 15 % AG-Zuschuss', () => {
    // 100 € AN-Beitrag + 15 € AG-Zuschuss = 115 € Monatssparrate
    const step1 = stepBavOneMonth(0, 100, 0.15, 0.035);
    expect(step1.totalContribution).toBe(115);
    expect(step1.newBalance).toBeCloseTo(115, 0);

    const step2 = stepBavOneMonth(step1.newBalance, 100, 0.15, 0.035);
    expect(step2.newBalance).toBeGreaterThan(230);
  });

  it('durchläuft den gesamten 51-Jahres-Lebenszyklus bis zum Renteneintritt mit 67 Jahren', () => {
    const goals = [ALL_LIFE_GOALS[0], ALL_LIFE_GOALS[1]];
    const rng = new SeededRandom(12345);
    let state = createInitialGameState(
      {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Test',
      },
      goals,
      12345
    );

    // bAV einrichten
    state = setBavMonthlyContribution(state, 100);

    // 51 Jahre = 612 Monate simulieren
    for (let month = 1; month <= 612; month++) {
      if (state.isGameOver) break;
      const res = stepSimulationMonth(state, ALL_LIFE_EVENTS, rng);
      state = res.nextState;
    }

    expect(state.currentAge).toBe(67);
    expect(state.isGameOver).toBe(true);
    expect(state.pension.bavAccumulatedBalance).toBeGreaterThan(1000);
    expect(state.historySnapshots.length).toBeGreaterThan(500);
  });
});
