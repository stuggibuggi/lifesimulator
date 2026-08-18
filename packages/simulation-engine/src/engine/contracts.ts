import {
  Bausparvertrag,
  CareerState,
  CareerType,
  FamilyState,
  FinancialSharingModel,
  GameState,
  HousingOption,
  HousingState,
  InsuranceContract,
  LoanItem,
  MobilityOption,
  RelationshipStatus,
  TaxClass,
  TransactionRecord,
} from '@goal/shared-types';
import {
  calculateCashflow,
  calculateEffectiveInterestRate,
  calculateLoanMonthlyRate,
  calculatePropertyAcquisitionCosts,
  calculateTotalInterestProjected,
} from '../math/finance';
import { calculateGermanPayroll, calculatePensionOverview } from '../math/taxPension';

/**
 * Schließt einen Versicherungsvertrag mit gewählter Selbstbeteiligung ab oder kündigt ihn
 */
export function toggleInsuranceContract(
  state: GameState,
  insurance: InsuranceContract,
  chosenDeductible: number = insurance.deductible,
  hasHealthPreConditionExclusion: boolean = false
): GameState {
  const existingIdx = state.insurances.findIndex((i) => i.type === insurance.type);
  let updatedInsurances: InsuranceContract[];

  if (existingIdx >= 0) {
    updatedInsurances = state.insurances.filter((i) => i.type !== insurance.type);
  } else {
    let premiumMultiplier = 1.0;
    if (chosenDeductible === 150) premiumMultiplier = 0.85;
    if (chosenDeductible === 300) premiumMultiplier = 0.72;

    const adjustedPremium = Math.round(insurance.monthlyPremium * premiumMultiplier * 100) / 100;

    const newContract: InsuranceContract = {
      ...insurance,
      deductible: chosenDeductible,
      monthlyPremium: adjustedPremium,
      waitingPeriodMonthsRemaining: insurance.initialWaitingPeriodMonths,
      hasHealthPreConditionExclusion,
      isActive: true,
    };

    updatedInsurances = [...state.insurances, newContract];
  }

  const totalInsurancesCost = updatedInsurances.reduce(
    (sum, ins) => sum + ins.monthlyPremium,
    0
  );

  const updatedBudget = {
    ...state.budget,
    insurancesTotal: Math.round(totalInsurancesCost * 100) / 100,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      Math.round(totalInsurancesCost * 100) / 100 +
      state.budget.loanRatesTotal +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };

  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    insurances: updatedInsurances,
    budget: updatedBudget,
  };
}

/**
 * Ändert die monatliche Sparrate (Notgroschen) oder ETF-Sparrate
 */
export function setMonthlySavingsRates(
  state: GameState,
  emergencyFundRate: number,
  etfRate: number
): GameState {
  const totalSavingsTransfers = emergencyFundRate + etfRate;
  const updatedBudget = {
    ...state.budget,
    emergencyFundAutoSave: emergencyFundRate,
    etfAutoInvest: etfRate,
    totalSavingsTransfers,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    savingsAccount: {
      ...state.savingsAccount,
      autoSaveRateMonthly: emergencyFundRate,
    },
    investmentAccount: {
      ...state.investmentAccount,
      monthlySparrate: etfRate,
    },
    budget: updatedBudget,
  };
}

/**
 * Richtet die betriebliche Altersvorsorge (bAV) ein
 */
export function setBavMonthlyContribution(
  state: GameState,
  monthlyContribution: number
): GameState {
  const updatedPension = {
    ...state.pension,
    bavMonthlyContribution: monthlyContribution,
  };

  const updatedBudget = {
    ...state.budget,
    bavAutoDeduction: monthlyContribution,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      state.budget.loanRatesTotal +
      state.budget.bausparContributionsTotal +
      monthlyContribution,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    pension: updatedPension,
    budget: updatedBudget,
    metrics: {
      ...state.metrics,
      knowledgePoints: Math.min(100, state.metrics.knowledgePoints + 5),
    },
  };
}

/**
 * Passt Steuerklasse und Kirchensteuer an
 */
export function setTaxParameters(
  state: GameState,
  taxClass: TaxClass,
  hasChurchTax: boolean
): GameState {
  const updatedTax = calculateGermanPayroll(
    state.career.monthlySalaryGross,
    taxClass,
    hasChurchTax,
    state.family.childrenCount,
    state.currentAge
  );

  const updatedBudget = {
    ...state.budget,
    netSalary: updatedTax.netMonthly,
    totalIncome:
      updatedTax.netMonthly +
      state.budget.partnerContribution +
      state.budget.familySupport +
      state.budget.bafoegOrSecondaryIncome +
      state.budget.childBenefitTotal +
      state.budget.investmentDividends,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    tax: updatedTax,
    career: {
      ...state.career,
      monthlySalaryNet: updatedTax.netMonthly,
    },
    budget: updatedBudget,
  };
}

/**
 * Schließt einen Kredit ab
 */
export function takeLoan(
  state: GameState,
  title: string,
  principal: number,
  nominalAnnualInterest: number,
  durationMonths: number,
  type: LoanItem['type'] = 'KONSUM'
): GameState {
  const monthlyRate = calculateLoanMonthlyRate(
    principal,
    nominalAnnualInterest,
    durationMonths
  );
  const effectiveAnnual = calculateEffectiveInterestRate(nominalAnnualInterest);
  const totalInterest = calculateTotalInterestProjected(principal, monthlyRate, durationMonths);

  const newLoan: LoanItem = {
    id: `loan_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
    type,
    title,
    principalInitial: principal,
    principalRemaining: principal,
    monthlyRate,
    nominalInterestAnnual: nominalAnnualInterest,
    effectiveInterestAnnual: effectiveAnnual,
    totalInterestProjected: totalInterest,
    remainingMonths: durationMonths,
    totalInterestPaid: 0,
  };

  const updatedLoans = [...state.loans, newLoan];
  const totalLoanRates = updatedLoans.reduce((sum, l) => sum + l.monthlyRate, 0);

  const updatedBudget = {
    ...state.budget,
    loanRatesTotal: Math.round(totalLoanRates * 100) / 100,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      Math.round(totalLoanRates * 100) / 100 +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  const tx: TransactionRecord = {
    id: `tx_loan_${Date.now()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount: principal,
    category: 'Kreditaufnahme',
    description: `Auszahlung Kredit: ${title} (+${principal} €)`,
    isAutomatic: false,
  };

  return {
    ...state,
    bankAccount: {
      ...state.bankAccount,
      giroBalance: state.bankAccount.giroBalance + principal,
    },
    loans: updatedLoans,
    budget: updatedBudget,
    transactions: [tx, ...state.transactions].slice(0, 100),
  };
}

/**
 * Umschuldung von teurem Dispo in günstigen Ratenkredit
 */
export function restructureDebtToInstallmentLoan(
  state: GameState,
  termMonths: number = 24,
  installmentAnnualInterest: number = 0.065
): GameState {
  if (state.bankAccount.giroBalance >= 0) {
    return state;
  }

  const debtAmount = Math.abs(state.bankAccount.giroBalance);
  const monthlyRate = calculateLoanMonthlyRate(
    debtAmount,
    installmentAnnualInterest,
    termMonths
  );
  const effectiveAnnual = calculateEffectiveInterestRate(installmentAnnualInterest);
  const totalInterest = calculateTotalInterestProjected(debtAmount, monthlyRate, termMonths);

  const consolidationLoan: LoanItem = {
    id: `loan_umschuldung_${Date.now()}`,
    type: 'KONSUM',
    title: 'Umschuldungskredit (Dispo-Ablösung)',
    principalInitial: debtAmount,
    principalRemaining: debtAmount,
    monthlyRate,
    nominalInterestAnnual: installmentAnnualInterest,
    effectiveInterestAnnual: effectiveAnnual,
    totalInterestProjected: totalInterest,
    remainingMonths: termMonths,
    totalInterestPaid: 0,
  };

  const updatedLoans = [...state.loans, consolidationLoan];
  const totalLoanRates = updatedLoans.reduce((sum, l) => sum + l.monthlyRate, 0);

  const updatedBudget = {
    ...state.budget,
    loanRatesTotal: Math.round(totalLoanRates * 100) / 100,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      Math.round(totalLoanRates * 100) / 100 +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  const tx: TransactionRecord = {
    id: `tx_umschuld_${Date.now()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount: debtAmount,
    category: 'Umschuldung',
    description: `Dispo ausgeglichen durch Ratenkredit (+${debtAmount} €)`,
    isAutomatic: false,
  };

  return {
    ...state,
    bankAccount: {
      ...state.bankAccount,
      giroBalance: 0,
      dispoWarningStage: 'NONE',
    },
    loans: updatedLoans,
    budget: updatedBudget,
    transactions: [tx, ...state.transactions].slice(0, 100),
    metrics: {
      ...state.metrics,
      stress: Math.max(10, state.metrics.stress - 15),
      knowledgePoints: Math.min(100, state.metrics.knowledgePoints + 5),
    },
  };
}

/**
 * Sonderzahlung auf einen Kredit leisten
 */
export function repayLoanPartial(
  state: GameState,
  loanId: string,
  amount: number
): GameState {
  if (state.bankAccount.giroBalance < amount) {
    return state;
  }

  const updatedLoans = state.loans.map((l) => {
    if (l.id === loanId) {
      const remaining = Math.max(0, l.principalRemaining - amount);
      return {
        ...l,
        principalRemaining: remaining,
        remainingMonths: remaining === 0 ? 0 : l.remainingMonths,
      };
    }
    return l;
  }).filter(l => l.principalRemaining > 0);

  const totalLoanRates = updatedLoans.reduce((sum, l) => sum + l.monthlyRate, 0);
  const updatedBudget = {
    ...state.budget,
    loanRatesTotal: Math.round(totalLoanRates * 100) / 100,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      Math.round(totalLoanRates * 100) / 100 +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  const tx: TransactionRecord = {
    id: `tx_repay_${Date.now()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount: -amount,
    category: 'Sondertilgung',
    description: `Sondertilgung Kredit (-${amount} €)`,
    isAutomatic: false,
  };

  return {
    ...state,
    bankAccount: {
      ...state.bankAccount,
      giroBalance: state.bankAccount.giroBalance - amount,
    },
    loans: updatedLoans,
    budget: updatedBudget,
    transactions: [tx, ...state.transactions].slice(0, 100),
  };
}

/**
 * Eröffnet einen Bausparvertrag
 */
export function openBausparvertrag(
  state: GameState,
  contractSum: number = 50000,
  monthlyContribution: number = 100
): GameState {
  const newContract: Bausparvertrag = {
    id: `bauspar_${Date.now()}`,
    title: `Bausparer (${contractSum.toLocaleString('de-DE')} €)`,
    contractSum,
    accumulatedBalance: 0,
    monthlyContribution,
    interestSavingsRate: 0.015,
    interestLoanRate: 0.025,
    minimumSavingsRatio: 0.4,
    isAllotted: false,
  };

  const updatedContracts = [...(state.bausparContracts || []), newContract];
  const totalBausparRates = updatedContracts.reduce((sum, b) => sum + b.monthlyContribution, 0);

  const updatedBudget = {
    ...state.budget,
    bausparContributionsTotal: totalBausparRates,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      state.budget.loanRatesTotal +
      totalBausparRates +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    bausparContracts: updatedContracts,
    budget: updatedBudget,
    metrics: {
      ...state.metrics,
      knowledgePoints: Math.min(100, state.metrics.knowledgePoints + 5),
    },
  };
}

/**
 * Ändert die Wohnform
 */
export function changeHousingOption(
  state: GameState,
  option: HousingOption,
  downPaymentGiro: number = 0
): GameState {
  let updatedGiro = state.bankAccount.giroBalance;
  let newLoans = [...state.loans];
  let propertyValue = 0;
  let propertyLoanId: string | undefined = undefined;

  if (option.depositRequired > 0 && option.type !== 'PROPERTY_OWNERSHIP') {
    updatedGiro -= option.depositRequired;
  }

  if (option.type === 'PROPERTY_OWNERSHIP' && option.purchasePrice) {
    const acquisition = calculatePropertyAcquisitionCosts(option.purchasePrice);
    const totalNeeded = acquisition.totalInvestment;
    const loanPrincipal = Math.max(0, totalNeeded - downPaymentGiro);

    updatedGiro -= downPaymentGiro;
    propertyValue = option.purchasePrice;

    const mortgageMonthlyRate = calculateLoanMonthlyRate(loanPrincipal, 0.038, 300);
    const effectiveMortgage = calculateEffectiveInterestRate(0.038);
    const totalMortgageInterest = calculateTotalInterestProjected(loanPrincipal, mortgageMonthlyRate, 300);

    propertyLoanId = `loan_mortgage_${Date.now()}`;
    newLoans.push({
      id: propertyLoanId,
      type: 'IMMOBILIENDARLEHEN',
      title: `Baufinanzierung (${option.title})`,
      principalInitial: loanPrincipal,
      principalRemaining: loanPrincipal,
      monthlyRate: mortgageMonthlyRate,
      nominalInterestAnnual: 0.038,
      effectiveInterestAnnual: effectiveMortgage,
      totalInterestProjected: totalMortgageInterest,
      remainingMonths: 300,
      totalInterestPaid: 0,
    });
  }

  const newHousingState: HousingState = {
    type: option.type,
    title: option.title,
    monthlyWarmRent: option.monthlyWarmRent,
    coldRent: option.coldRent,
    utilitiesCost: option.utilitiesCost,
    depositPaid: option.depositRequired,
    propertyValue,
    propertyLoanId,
  };

  const totalLoanRates = newLoans.reduce((sum, l) => sum + l.monthlyRate, 0);

  const updatedBudget = {
    ...state.budget,
    rentAndHousing: option.monthlyWarmRent,
    loanRatesTotal: Math.round(totalLoanRates * 100) / 100,
    totalFixedExpenses:
      option.monthlyWarmRent +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      Math.round(totalLoanRates * 100) / 100 +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  const tx: TransactionRecord = {
    id: `tx_house_${Date.now()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount: option.type === 'PROPERTY_OWNERSHIP' ? -downPaymentGiro : -option.depositRequired,
    category: 'Wohnungswechsel',
    description: `Wohnform gewählt: ${option.title}`,
    isAutomatic: false,
  };

  return {
    ...state,
    housing: newHousingState,
    bankAccount: {
      ...state.bankAccount,
      giroBalance: Math.round(updatedGiro * 100) / 100,
    },
    loans: newLoans,
    budget: updatedBudget,
    metrics: {
      ...state.metrics,
      stress: Math.max(0, Math.min(100, state.metrics.stress + option.stressDelta)),
      happiness: Math.max(0, Math.min(100, state.metrics.happiness + option.happinessDelta)),
    },
    transactions: [tx, ...state.transactions].slice(0, 100),
  };
}

/**
 * Aktualisiert Partnerschafts- und Familienstatus
 */
export function updateFamilyRelationship(
  state: GameState,
  status: RelationshipStatus,
  partnerName: string = 'Robin',
  partnerSalaryNet: number = 2200,
  sharingModel: FinancialSharingModel = 'THREE_ACCOUNTS'
): GameState {
  const updatedFamily: FamilyState = {
    ...state.family,
    status,
    partnerName,
    partnerSalaryNet,
    sharingModel,
  };

  // Bei Heirat: Steuerklasse IV/IV oder III/V möglich
  const newTaxClass: TaxClass = status === 'MARRIED' ? 'IV' : 'I';
  const updatedTax = calculateGermanPayroll(
    state.career.monthlySalaryGross,
    newTaxClass,
    state.tax.hasChurchTax,
    state.family.childrenCount,
    state.currentAge
  );

  return {
    ...state,
    family: updatedFamily,
    tax: updatedTax,
    metrics: {
      ...state.metrics,
      happiness: Math.min(100, state.metrics.happiness + (status === 'MARRIED' ? 15 : 10)),
      stress: Math.max(0, state.metrics.stress - 5),
    },
  };
}

/**
 * Passt die Anzahl der Kinder an
 */
export function adjustChildrenCount(
  state: GameState,
  newCount: number
): GameState {
  const diff = newCount - state.family.childrenCount;
  const childExpenses = newCount * 550;

  const updatedFamily: FamilyState = {
    ...state.family,
    childrenCount: newCount,
    childBenefitMonthly: newCount * 250,
    childcareCostMonthly: 200,
    childDirectExpensesMonthly: 350,
    isParentalLeaveActive: diff > 0,
    parentalLeaveMonthsRemaining: diff > 0 ? 12 : 0,
  };

  const updatedTax = calculateGermanPayroll(
    state.career.monthlySalaryGross,
    state.tax.taxClass,
    state.tax.hasChurchTax,
    newCount,
    state.currentAge
  );

  const updatedBudget = {
    ...state.budget,
    childBenefitTotal: newCount * 250,
    childCareAndSupport: childExpenses,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      childExpenses +
      state.budget.mobilityPublicTransitOrCar +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      state.budget.loanRatesTotal +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    family: updatedFamily,
    tax: updatedTax,
    budget: updatedBudget,
    metrics: {
      ...state.metrics,
      happiness: Math.min(100, state.metrics.happiness + 20),
      stress: Math.min(100, state.metrics.stress + 15),
    },
  };
}

/**
 * Wechselt die Mobilitätsoption
 */
export function setMobilityOption(
  state: GameState,
  option: MobilityOption
): GameState {
  let updatedGiro = state.bankAccount.giroBalance;
  let newLoans = [...state.loans];

  if (option.acquisitionCost > 0) {
    if (option.type === 'CAR_CASH') {
      updatedGiro -= option.acquisitionCost;
    } else if (option.type === 'CAR_FINANCED') {
      const principal = option.acquisitionCost;
      const rate = calculateLoanMonthlyRate(principal, 0.059, 48);
      const effectiveAnnual = calculateEffectiveInterestRate(0.059);
      const totalInterest = calculateTotalInterestProjected(principal, rate, 48);

      newLoans.push({
        id: `loan_car_${Date.now()}`,
        type: 'AUTOKREDIT',
        title: 'Autokredit (Neuwagen/Jahreswagen)',
        principalInitial: principal,
        principalRemaining: principal,
        monthlyRate: rate,
        nominalInterestAnnual: 0.059,
        effectiveInterestAnnual: effectiveAnnual,
        totalInterestProjected: totalInterest,
        remainingMonths: 48,
        totalInterestPaid: 0,
      });
    }
  }

  const totalLoanRates = newLoans.reduce((sum, l) => sum + l.monthlyRate, 0);

  const updatedBudget = {
    ...state.budget,
    mobilityPublicTransitOrCar: option.monthlyCost,
    loanRatesTotal: Math.round(totalLoanRates * 100) / 100,
    totalFixedExpenses:
      state.budget.rentAndHousing +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      option.monthlyCost +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      Math.round(totalLoanRates * 100) / 100 +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };
  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  const tx: TransactionRecord = {
    id: `tx_mob_${Date.now()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount: option.type === 'CAR_CASH' ? -option.acquisitionCost : 0,
    category: 'Mobilität',
    description: `Mobilität gewählt: ${option.title} (${option.monthlyCost} €/Mo)`,
    isAutomatic: false,
  };

  return {
    ...state,
    activeMobility: option.type,
    bankAccount: {
      ...state.bankAccount,
      giroBalance: Math.round(updatedGiro * 100) / 100,
    },
    loans: newLoans,
    budget: updatedBudget,
    metrics: {
      ...state.metrics,
      stress: Math.max(0, Math.min(100, state.metrics.stress + option.stressDelta)),
      happiness: Math.max(0, Math.min(100, state.metrics.happiness + option.happinessDelta)),
    },
    transactions: [tx, ...state.transactions].slice(0, 100),
  };
}

/**
 * Ändert den Karriere- oder Bildungsweg
 */
export function changeCareerPath(
  state: GameState,
  newCareer: CareerState,
  updatedRent: number = state.budget.rentAndHousing,
  updatedMobility: number = state.budget.mobilityPublicTransitOrCar
): GameState {
  const updatedTax = calculateGermanPayroll(
    newCareer.monthlySalaryGross,
    state.tax.taxClass,
    state.tax.hasChurchTax,
    state.family.childrenCount,
    state.currentAge
  );

  const updatedBudget = {
    ...state.budget,
    grossSalary: newCareer.monthlySalaryGross,
    netSalary: updatedTax.netMonthly,
    rentAndHousing: updatedRent,
    mobilityPublicTransitOrCar: updatedMobility,
    totalIncome:
      updatedTax.netMonthly +
      state.budget.partnerContribution +
      state.budget.familySupport +
      state.budget.bafoegOrSecondaryIncome +
      state.budget.childBenefitTotal,
    totalFixedExpenses:
      updatedRent +
      state.budget.utilitiesAndEnergy +
      state.budget.foodAndGroceries +
      state.budget.childCareAndSupport +
      updatedMobility +
      state.budget.phoneInternetSubscriptions +
      state.budget.insurancesTotal +
      state.budget.loanRatesTotal +
      state.budget.bausparContributionsTotal +
      state.budget.bavAutoDeduction,
  };

  updatedBudget.monthlyCashflow = calculateCashflow(updatedBudget);

  return {
    ...state,
    career: {
      ...newCareer,
      monthlySalaryNet: updatedTax.netMonthly,
    },
    tax: updatedTax,
    budget: updatedBudget,
  };
}
