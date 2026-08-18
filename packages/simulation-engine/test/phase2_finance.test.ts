import { describe, it, expect } from 'vitest';
import {
  calculateEffectiveInterestRate,
  calculateTotalInterestProjected,
  calculateDispoWarningStage,
  calculateDebtRestructuringSavings,
  calculateInsuranceClaimPayout,
  calculateLoanMonthlyRate,
  createInitialGameState,
  restructureDebtToInstallmentLoan,
  toggleInsuranceContract,
  setMobilityOption,
} from '../src';
import { AVAILABLE_INSURANCES, AVAILABLE_MOBILITY_OPTIONS } from '@goal/game-content';

describe('Phase 2: Financial Math, Loan Comparison & Insurance Claims', () => {
  it('correctly calculates effective interest rate and total projected interest', () => {
    const nominalInterest = 0.069; // 6,9%
    const effective = calculateEffectiveInterestRate(nominalInterest);
    expect(effective).toBeGreaterThanOrEqual(0.069);
    expect(effective).toBeLessThan(0.075);

    const principal = 3000;
    const rate = calculateLoanMonthlyRate(principal, nominalInterest, 24);
    expect(rate).toBeGreaterThan(130);
    expect(rate).toBeLessThan(140);

    const totalInterest = calculateTotalInterestProjected(principal, rate, 24);
    expect(totalInterest).toBeGreaterThan(200);
    expect(totalInterest).toBeLessThan(300);
  });

  it('correctly determines dispo warning stages based on overdraft balance', () => {
    expect(calculateDispoWarningStage(200, 1000)).toBe('NONE');
    expect(calculateDispoWarningStage(0, 1000)).toBe('NONE');
    expect(calculateDispoWarningStage(-300, 1000)).toBe('YELLOW');
    expect(calculateDispoWarningStage(-900, 1000)).toBe('ORANGE');
    expect(calculateDispoWarningStage(-1500, 1000)).toBe('RED');
    expect(calculateDispoWarningStage(-2500, 3000)).toBe('RED');
  });

  it('calculates accurate interest savings upon debt restructuring', () => {
    const dispoDebt = 2000;
    const dispoRate = 0.135; // 13,5%
    const installmentRate = 0.065; // 6,5%
    const savings = calculateDebtRestructuringSavings(dispoDebt, dispoRate, installmentRate, 24);

    expect(savings.savingsTotal).toBeGreaterThan(100);
    expect(savings.dispoTotalInterest).toBeGreaterThan(savings.installmentTotalInterest);
    expect(savings.newMonthlyRate).toBeGreaterThan(80);
  });

  it('correctly simulates debt restructuring on game state', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );

    // Force negative giro balance (in dispo)
    state.bankAccount.giroBalance = -1500;
    state.bankAccount.dispoWarningStage = 'RED';

    const restructured = restructureDebtToInstallmentLoan(state, 24, 0.065);
    expect(restructured.bankAccount.giroBalance).toBe(0);
    expect(restructured.bankAccount.dispoWarningStage).toBe('NONE');
    expect(restructured.loans.length).toBe(1);
    expect(restructured.loans[0].principalRemaining).toBe(1500);
    expect(restructured.loans[0].type).toBe('KONSUM');
  });

  it('calculates insurance claim payouts with deductible and waiting period rules', () => {
    // 1. Fully covered with 150 € deductible
    const claim1 = calculateInsuranceClaimPayout(1200, 10000000, 150, 0);
    expect(claim1.isCovered).toBe(true);
    expect(claim1.payoutAmount).toBe(1050);
    expect(claim1.playerOutOfPocket).toBe(150);

    // 2. Rejection due to active waiting period
    const claim2 = calculateInsuranceClaimPayout(1200, 10000000, 150, 4);
    expect(claim2.isCovered).toBe(false);
    expect(claim2.payoutAmount).toBe(0);
    expect(claim2.playerOutOfPocket).toBe(1200);
    expect(claim2.rejectionReason).toContain('Wartezeit');

    // 3. Rejection due to pre-existing exclusion clause
    const claim3 = calculateInsuranceClaimPayout(1200, 10000000, 0, 0, true);
    expect(claim3.isCovered).toBe(false);
    expect(claim3.rejectionReason).toContain('Vorerkrankung');
  });

  it('allows selecting different deductibles and applies proper premium discounts', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );

    const haftpflicht = AVAILABLE_INSURANCES.find((i) => i.type === 'HAFTPFLICHT')!;
    const stateWith150SB = toggleInsuranceContract(state, haftpflicht, 150);

    const contract = stateWith150SB.insurances.find((i) => i.type === 'HAFTPFLICHT')!;
    expect(contract.deductible).toBe(150);
    expect(contract.monthlyPremium).toBeLessThan(haftpflicht.monthlyPremium);
  });

  it('handles mobility transitions smoothly (Deutschlandticket vs. Car)', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );

    const carOption = AVAILABLE_MOBILITY_OPTIONS.find((o) => o.type === 'CAR_FINANCED')!;
    const stateWithCar = setMobilityOption(state, carOption);

    expect(stateWithCar.activeMobility).toBe('CAR_FINANCED');
    expect(stateWithCar.loans.length).toBe(1);
    expect(stateWithCar.loans[0].type).toBe('AUTOKREDIT');
    expect(stateWithCar.budget.mobilityPublicTransitOrCar).toBe(carOption.monthlyCost);
  });
});
