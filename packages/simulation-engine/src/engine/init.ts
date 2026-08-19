import {
  Character,
  GameState,
  LifeGoal,
  MonthlyBudget,
  StartCondition,
  StartConditionId,
} from '@goal/shared-types';
import { calculateGermanPayroll } from '../math/taxPension';

export const START_CONDITIONS: Record<StartConditionId, StartCondition> = {
  FAMILY_SUPPORT: {
    id: 'FAMILY_SUPPORT',
    title: 'Gute familiäre Unterstützung',
    description:
      'Deine Eltern unterstützen dich mit 200 € Taschengeld/Zuschuss im Monat und etwas Startkapital.',
    startingGiroBalance: 800,
    startingPocketMoney: 200,
    familySupportMonthly: 200,
    initialRentCost: 0,
  },
  NO_SUPPORT: {
    id: 'NO_SUPPORT',
    title: 'Selbstständiger Start',
    description:
      'Du stehst früh auf eigenen Beinen und musst dein Leben eigenständig ohne monatliche Zuschüsse finanzieren.',
    startingGiroBalance: 300,
    startingPocketMoney: 50,
    familySupportMonthly: 0,
    initialRentCost: 0,
  },
  CITY_EXPENSIVE: {
    id: 'CITY_EXPENSIVE',
    title: 'Großstadtleben',
    description:
      'Tolle Freizeit- und Karrieremöglichkeiten, aber hohe Lebenshaltungs- und Mietkosten.',
    startingGiroBalance: 600,
    startingPocketMoney: 150,
    familySupportMonthly: 150,
    initialRentCost: 0,
  },
  RURAL_CHEAP: {
    id: 'RURAL_CHEAP',
    title: 'Ländliche Region',
    description:
      'Günstige Lebenshaltungskosten, aber für Mobilität wird meist ein Fahrzeug benötigt.',
    startingGiroBalance: 500,
    startingPocketMoney: 100,
    familySupportMonthly: 100,
    initialRentCost: 0,
  },
};

export function createInitialGameState(
  character: Character,
  chosenGoals: LifeGoal[],
  seed: number = Date.now()
): GameState {
  const startCond =
    START_CONDITIONS[character.startCondition] ||
    START_CONDITIONS.FAMILY_SUPPORT;

  const initialBudget: MonthlyBudget = {
    grossSalary: 0,
    netSalary: 0,
    partnerContribution: 0,
    familySupport: startCond.familySupportMonthly,
    bafoegOrSecondaryIncome: 0,
    childBenefitTotal: 0,
    pensionPayoutMonthly: 0,
    investmentDividends: 0,
    totalIncome: startCond.familySupportMonthly,

    rentAndHousing: 0,
    utilitiesAndEnergy: 0,
    foodAndGroceries: 80,
    childCareAndSupport: 0,
    mobilityPublicTransitOrCar: 35,
    phoneInternetSubscriptions: 25,
    insurancesTotal: 0,
    loanRatesTotal: 0,
    bausparContributionsTotal: 0,
    bavAutoDeduction: 0,
    totalFixedExpenses: 140,

    leisureAndHobbies: 50,
    personalCareAndShopping: 30,
    totalVariableExpenses: 80,

    emergencyFundAutoSave: 20,
    etfAutoInvest: 0,
    totalSavingsTransfers: 20,

    monthlyCashflow:
      startCond.familySupportMonthly - (140 + 80 + 20),
  };

  return {
    version: '0.5.0',
    seed,
    currentAge: 16,
    currentYear: 1,
    currentMonth: 1,
    isPaused: true,
    speed: 1,
    isGameOver: false,
    activeLocation: 'HOME',

    character,
    goals: chosenGoals.map((g, idx) => ({
      ...g,
      priority: idx + 1,
      currentValue: 0,
      isAchieved: false,
    })),

    career: {
      type: 'SCHUELER',
      title: 'Schüler/in (Oberstufe / Realschule)',
      branch: 'Schulbildung',
      currentYear: 1,
      durationYears: 2,
      monthlySalaryGross: 0,
      monthlySalaryNet: 0,
      tuitionOrTrainingCostMonthly: 0,
      stressFactor: 30,
      timeCommitmentHoursWeekly: 35,
      careerAdvancementLevel: 0,
      isCompleted: false,
      fullTimeGrossSalary: 0,
      monthsSinceLastRaiseAttempt: 12,
      monthsSinceLastTraining: 24,
      monthsSinceLastJobSwitch: 12,
    },

    activeMobility: 'PUBLIC_TRANSIT',

    housing: {
      type: 'PARENTS',
      title: 'Bei den Eltern (Elternhaus)',
      monthlyWarmRent: 0,
      coldRent: 0,
      utilitiesCost: 0,
      depositPaid: 0,
    },

    family: {
      status: 'SINGLE',
      partnerSalaryNet: 0,
      sharingModel: 'SEPARATE',
      childrenCount: 0,
      childBenefitMonthly: 0,
      childcareCostMonthly: 0,
      childDirectExpensesMonthly: 0,
      isParentalLeaveActive: false,
      parentalLeaveMonthsRemaining: 0,
    },

    bausparContracts: [],

    tax: calculateGermanPayroll(0, 'I', false, 0, 16),

    pension: {
      accumulatedPensionPoints: 0,
      currentPensionPointValue: 39.32,
      projectedStatutoryPensionGross: 0,
      projectedStatutoryPensionNet: 0,
      bavMonthlyContribution: 0,
      bavEmployerMatchPercent: 0.15,
      bavAccumulatedBalance: 0,
      targetRetirementNetMonthly: 1800,
      projectedPensionGapMonthly: 1800,
      isRetired: false,
    },

    bankAccount: {
      giroBalance: startCond.startingGiroBalance,
      overdraftLimit: 500,
      overdraftInterestAnnual: 0.125,
      dispoWarningStage: 'NONE',
    },

    savingsAccount: {
      tagesgeldBalance: 200,
      interestRateAnnual: 0.025,
      autoSaveRateMonthly: 20,
    },

    investmentAccount: {
      etfBalance: 0,
      monthlySparrate: 0,
      totalDeposited: 0,
      averageAnnualReturn: 0.06,
    },

    insurances: [],
    loans: [],

    budget: initialBudget,

    metrics: {
      health: 90,
      happiness: 85,
      stress: 25,
      freeTimeHoursWeekly: 30,
      knowledgePoints: 20,
    },

    activeEvent: null,
    pastEvents: [],
    transactions: [
      {
        id: 'tx_init_1',
        age: 16,
        year: 1,
        month: 1,
        amount: startCond.startingGiroBalance,
        category: 'Startguthaben',
        description: 'Startguthaben auf dem Girokonto',
        isAutomatic: true,
      },
    ],
    historySnapshots: [
      {
        age: 16,
        year: 1,
        month: 1,
        giroBalance: startCond.startingGiroBalance,
        savingsBalance: 200,
        etfBalance: 0,
        propertyEquity: 0,
        bavBalance: 0,
        totalDebt: 0,
        netWorth: startCond.startingGiroBalance + 200,
        monthlyIncome: startCond.familySupportMonthly,
        monthlyExpenses: initialBudget.totalFixedExpenses + initialBudget.totalVariableExpenses,
        pensionPoints: 0,
        happiness: 85,
        health: 90,
        stress: 25,
      },
    ],
    unlockedAchievements: [],
  };
}
