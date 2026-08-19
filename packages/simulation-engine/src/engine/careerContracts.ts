import { CAREER_ACTION_CONSTANTS, CAREER_OPTIONS, JOB_SWITCH_OPTIONS } from '@goal/game-content';
import { CareerState, GameState, TransactionRecord } from '@goal/shared-types';
import { calculateCashflow } from '../math/finance';
import { calculateGermanPayroll } from '../math/taxPension';

export type RaiseMode = 'soft' | 'hard';

export type RaiseResult =
  | { ok: true; mode: RaiseMode; kind: 'soft' | 'hard_success' | 'hard_fail'; message: string }
  | { ok: false; reason: 'not_employed' | 'cooldown'; message: string };

export type CareerActionRng = { next(): number };

function isEmployed(career: CareerState): boolean {
  return career.type === 'ANGESTELLTER';
}

function clampMetric(value: number): number {
  return Math.max(0, Math.min(100, value));
}

function createTransaction(
  state: GameState,
  idPrefix: string,
  amount: number,
  category: string,
  description: string
): TransactionRecord {
  return {
    id: `${idPrefix}_${Date.now()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount,
    category,
    description,
    isAutomatic: false,
  };
}

export function withUpdatedCareerGross(state: GameState, career: CareerState): GameState {
  const hours = career.timeCommitmentHoursWeekly || 40;
  const gross = Math.round((career.fullTimeGrossSalary * hours) / 40);
  const updatedCareer = { ...career, monthlySalaryGross: gross };
  const tax = calculateGermanPayroll(
    gross,
    state.tax.taxClass,
    state.tax.hasChurchTax,
    state.family.childrenCount,
    state.currentAge
  );
  const budget = {
    ...state.budget,
    grossSalary: gross,
    netSalary: tax.netMonthly,
    totalIncome:
      tax.netMonthly +
      state.budget.partnerContribution +
      state.budget.familySupport +
      state.budget.bafoegOrSecondaryIncome +
      state.budget.childBenefitTotal +
      state.budget.investmentDividends,
  };
  budget.monthlyCashflow = calculateCashflow(budget);

  return {
    ...state,
    career: { ...updatedCareer, monthlySalaryNet: tax.netMonthly },
    tax,
    budget,
  };
}

export const refreshCareerPayroll = withUpdatedCareerGross;

export function requestSalaryRaise(
  state: GameState,
  mode: RaiseMode,
  rng: CareerActionRng
): { state: GameState; result: RaiseResult } {
  if (!isEmployed(state.career)) {
    return {
      state,
      result: {
        ok: false,
        reason: 'not_employed',
        message: 'Gehaltserhöhungen sind nur in einer Anstellung möglich.',
      },
    };
  }

  if (state.career.monthsSinceLastRaiseAttempt < CAREER_ACTION_CONSTANTS.raiseCooldownMonths) {
    return {
      state,
      result: {
        ok: false,
        reason: 'cooldown',
        message: 'Du kannst erst nach der Abklingzeit wieder eine Gehaltserhöhung anfragen.',
      },
    };
  }

  if (mode === 'soft') {
    const career = {
      ...state.career,
      fullTimeGrossSalary: Math.round(
        state.career.fullTimeGrossSalary * CAREER_ACTION_CONSTANTS.softRaiseFactor
      ),
      monthsSinceLastRaiseAttempt: 0,
    };

    return {
      state: withUpdatedCareerGross(state, career),
      result: {
        ok: true,
        mode,
        kind: 'soft',
        message: 'Deine moderate Gehaltserhöhung wurde angenommen.',
      },
    };
  }

  const chance = Math.min(
    CAREER_ACTION_CONSTANTS.hardRaiseMaxChance,
    CAREER_ACTION_CONSTANTS.hardRaiseBaseChance +
      state.career.careerAdvancementLevel * CAREER_ACTION_CONSTANTS.hardRaiseChancePerLevel
  );
  const baseCareer = { ...state.career, monthsSinceLastRaiseAttempt: 0 };

  if (rng.next() < chance) {
    const career = {
      ...baseCareer,
      fullTimeGrossSalary: Math.round(
        state.career.fullTimeGrossSalary * CAREER_ACTION_CONSTANTS.hardRaiseFactor
      ),
    };

    return {
      state: withUpdatedCareerGross(state, career),
      result: {
        ok: true,
        mode,
        kind: 'hard_success',
        message: 'Deine selbstbewusste Verhandlung war erfolgreich.',
      },
    };
  }

  return {
    state: {
      ...state,
      career: baseCareer,
      metrics: {
        ...state.metrics,
        stress: clampMetric(state.metrics.stress + CAREER_ACTION_CONSTANTS.hardRaiseFailStress),
      },
    },
    result: {
      ok: true,
      mode,
      kind: 'hard_fail',
      message: 'Die harte Verhandlung wurde abgelehnt und erhöht deinen Stress.',
    },
  };
}

export function setEmploymentHours(state: GameState, hoursWeekly: 30 | 40): GameState {
  if (!isEmployed(state.career)) {
    return state;
  }

  const previousHours = state.career.timeCommitmentHoursWeekly || 40;
  const stressDelta = hoursWeekly < previousHours ? -6 : hoursWeekly > previousHours ? 6 : 0;
  const happinessDelta = hoursWeekly < previousHours ? 4 : hoursWeekly > previousHours ? -4 : 0;

  const career = {
    ...state.career,
    timeCommitmentHoursWeekly: hoursWeekly,
  };

  const updated = withUpdatedCareerGross(state, career);
  return {
    ...updated,
    metrics: {
      ...updated.metrics,
      stress: clampMetric(updated.metrics.stress + stressDelta),
      happiness: clampMetric(updated.metrics.happiness + happinessDelta),
    },
  };
}

export function changeEmployedJob(state: GameState, optionId: string): GameState {
  if (!isEmployed(state.career)) {
    return state;
  }

  const option = JOB_SWITCH_OPTIONS.find((candidate) => candidate.id === optionId);
  if (!option || state.bankAccount.giroBalance < option.transitionCostEuro) {
    return state;
  }

  const career = {
    ...state.career,
    title: option.title,
    branch: option.branch,
    fullTimeGrossSalary: Math.round(state.career.fullTimeGrossSalary * option.salaryFactor),
  };
  const updated = withUpdatedCareerGross(state, career);
  const transaction = createTransaction(
    state,
    'tx_career_switch',
    -option.transitionCostEuro,
    'Karrierewechsel',
    `Jobwechsel: ${option.title} (-${option.transitionCostEuro} €)`
  );

  return {
    ...updated,
    bankAccount: {
      ...updated.bankAccount,
      giroBalance: Math.round((updated.bankAccount.giroBalance - option.transitionCostEuro) * 100) / 100,
    },
    metrics: {
      ...updated.metrics,
      stress: clampMetric(updated.metrics.stress + option.stressDelta),
      happiness: clampMetric(updated.metrics.happiness + option.happinessDelta),
    },
    transactions: [transaction, ...updated.transactions].slice(0, 100),
  };
}

export function startFurtherTraining(state: GameState): GameState {
  if (
    !isEmployed(state.career) ||
    state.career.careerAdvancementLevel >= CAREER_ACTION_CONSTANTS.maxAdvancementLevel ||
    state.career.monthsSinceLastTraining < CAREER_ACTION_CONSTANTS.trainingCooldownMonths ||
    state.bankAccount.giroBalance < CAREER_ACTION_CONSTANTS.trainingCostEuro
  ) {
    return state;
  }

  const transaction = createTransaction(
    state,
    'tx_training',
    -CAREER_ACTION_CONSTANTS.trainingCostEuro,
    'Weiterbildung',
    `Weiterbildung gebucht (-${CAREER_ACTION_CONSTANTS.trainingCostEuro} €)`
  );

  return {
    ...state,
    career: {
      ...state.career,
      careerAdvancementLevel: state.career.careerAdvancementLevel + 1,
      monthsSinceLastTraining: 0,
    },
    bankAccount: {
      ...state.bankAccount,
      giroBalance:
        Math.round((state.bankAccount.giroBalance - CAREER_ACTION_CONSTANTS.trainingCostEuro) * 100) /
        100,
    },
    metrics: {
      ...state.metrics,
      stress: clampMetric(state.metrics.stress + CAREER_ACTION_CONSTANTS.trainingStressDelta),
      knowledgePoints: clampMetric(state.metrics.knowledgePoints + 10),
    },
    transactions: [transaction, ...state.transactions].slice(0, 100),
  };
}

export function abortEducationPath(state: GameState): GameState {
  if (state.career.type !== 'AUSBILDUNG' && state.career.type !== 'STUDIUM') {
    return state;
  }

  const quereinstieg = CAREER_OPTIONS.find((option) => option.id === 'PATH_QUEREINSTIEG');
  if (!quereinstieg) {
    return state;
  }

  const career: CareerState = {
    ...state.career,
    type: 'ANGESTELLTER',
    title: quereinstieg.title,
    branch: quereinstieg.branch,
    currentYear: 1,
    durationYears: quereinstieg.durationYears,
    monthlySalaryGross: quereinstieg.startingGrossAfterGraduation,
    monthlySalaryNet: quereinstieg.startingNetAfterGraduation,
    tuitionOrTrainingCostMonthly: 0,
    stressFactor: quereinstieg.stressFactor,
    timeCommitmentHoursWeekly: quereinstieg.timeCommitmentHoursWeekly,
    careerAdvancementLevel: 0,
    isCompleted: true,
    fullTimeGrossSalary: quereinstieg.startingGrossAfterGraduation,
    monthsSinceLastRaiseAttempt: CAREER_ACTION_CONSTANTS.raiseCooldownMonths,
    monthsSinceLastTraining: CAREER_ACTION_CONSTANTS.trainingCooldownMonths,
  };

  const updated = withUpdatedCareerGross(state, career);
  return {
    ...updated,
    metrics: {
      ...updated.metrics,
      stress: clampMetric(updated.metrics.stress + 15),
      happiness: clampMetric(updated.metrics.happiness - 10),
    },
  };
}
