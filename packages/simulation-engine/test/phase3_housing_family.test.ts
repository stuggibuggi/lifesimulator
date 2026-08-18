import { describe, it, expect } from 'vitest';
import {
  createInitialGameState,
  changeHousingOption,
  openBausparvertrag,
  stepBausparvertragOneMonth,
  updateFamilyRelationship,
  adjustChildrenCount,
  calculatePropertyAcquisitionCosts,
  calculateNetWorth,
  stepSimulationMonth,
  SeededRandom,
} from '../src';
import { AVAILABLE_HOUSING_OPTIONS, ALL_LIFE_EVENTS } from '@goal/game-content';

describe('Phase 3 & 4: Housing, Property Purchase, Family Finance & Age 45 Lifecycle', () => {
  it('calculates property acquisition costs accurately (~10% side costs)', () => {
    const purchasePrice = 280000;
    const costs = calculatePropertyAcquisitionCosts(purchasePrice);

    expect(costs.transferTax).toBe(14000); // 5.0%
    expect(costs.notaryAndRegistry).toBe(4200); // 1.5%
    expect(costs.brokerFee).toBe(9996); // 3.57%
    expect(costs.totalSideCosts).toBe(28196);
    expect(costs.totalInvestment).toBe(308196);
  });

  it('handles moving into a rental apartment and deducting Kaution', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );
    state.bankAccount.giroBalance = 3000;

    const rentalOption = AVAILABLE_HOUSING_OPTIONS.find((h) => h.type === 'RENT_APARTMENT')!;
    const stateWithFlat = changeHousingOption(state, rentalOption);

    expect(stateWithFlat.housing.type).toBe('RENT_APARTMENT');
    expect(stateWithFlat.housing.monthlyWarmRent).toBe(870);
    expect(stateWithFlat.bankAccount.giroBalance).toBe(3000 - rentalOption.depositRequired);
    expect(stateWithFlat.budget.rentAndHousing).toBe(870);
  });

  it('handles property purchase with down payment and mortgage loan creation', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );
    state.bankAccount.giroBalance = 60000;

    const propertyOption = AVAILABLE_HOUSING_OPTIONS.find((h) => h.type === 'PROPERTY_OWNERSHIP')!;
    const downPayment = 50000;
    const stateWithHouse = changeHousingOption(state, propertyOption, downPayment);

    expect(stateWithHouse.housing.type).toBe('PROPERTY_OWNERSHIP');
    expect(stateWithHouse.housing.propertyValue).toBe(280000);
    expect(stateWithHouse.loans.some((l) => l.type === 'IMMOBILIENDARLEHEN')).toBe(true);

    const mortgage = stateWithHouse.loans.find((l) => l.type === 'IMMOBILIENDARLEHEN')!;
    expect(mortgage.remainingMonths).toBe(300);
    expect(mortgage.monthlyRate).toBeGreaterThan(1200);
  });

  it('accumulates Bausparvertrag balance and identifies allocation readiness', () => {
    let bauspar = {
      id: 'b1',
      title: 'Bausparer',
      contractSum: 50000,
      accumulatedBalance: 19500,
      monthlyContribution: 500,
      interestSavingsRate: 0.015,
      interestLoanRate: 0.025,
      minimumSavingsRatio: 0.4,
      isAllotted: false,
    };

    expect(bauspar.isAllotted).toBe(false);

    // Step one month with 500 € contribution
    bauspar = stepBausparvertragOneMonth(bauspar, true);
    expect(bauspar.accumulatedBalance).toBeGreaterThanOrEqual(20000);
    expect(bauspar.isAllotted).toBe(true); // 20.000 / 50.000 = 40% (zuteilungsreif)
  });

  it('models family relationship, 3-accounts sharing and child benefits', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );

    const marriedState = updateFamilyRelationship(state, 'MARRIED', 'Sam', 2400, 'THREE_ACCOUNTS');
    expect(marriedState.family.status).toBe('MARRIED');
    expect(marriedState.family.sharingModel).toBe('THREE_ACCOUNTS');

    // Add 2 children
    const familyWithKids = adjustChildrenCount(marriedState, 2);
    expect(familyWithKids.family.childrenCount).toBe(2);
    expect(familyWithKids.family.childBenefitMonthly).toBe(500); // 2 * 250 €
    expect(familyWithKids.budget.childBenefitTotal).toBe(500);
  });

  it('correctly incorporates property equity and Bausparen into net worth', () => {
    const state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );
    state.bankAccount.giroBalance = 5000;
    state.savingsAccount.tagesgeldBalance = 10000;
    state.investmentAccount.etfBalance = 20000;
    state.housing.propertyValue = 300000;
    state.bausparContracts = [
      {
        id: 'b1',
        title: 'Bausparer',
        contractSum: 50000,
        accumulatedBalance: 15000,
        monthlyContribution: 100,
        interestSavingsRate: 0.015,
        interestLoanRate: 0.025,
        minimumSavingsRatio: 0.4,
        isAllotted: false,
      },
    ];

    const netWorth = calculateNetWorth(
      state.bankAccount,
      state.savingsAccount,
      state.investmentAccount,
      state.loans,
      state.housing,
      state.bausparContracts
    );

    // 5k + 10k + 20k + 300k + 15k = 350k
    expect(netWorth).toBe(350000);
  });

  it('simulates 29 years of life up to age 45', () => {
    let state = createInitialGameState(
      { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: '' },
      []
    );
    const rng = new SeededRandom(42);

    // Run 348 months (29 years from 16 to 45)
    for (let m = 0; m < 348; m++) {
      if (state.isGameOver) break;
      const res = stepSimulationMonth(state, ALL_LIFE_EVENTS, rng);
      state = res.nextState;
      // Auto-clear active events for headless stress testing
      if (state.activeEvent) {
        state.activeEvent = null;
        state.isPaused = false;
      }
    }

    expect(state.currentAge).toBeGreaterThanOrEqual(44);
  });
});
