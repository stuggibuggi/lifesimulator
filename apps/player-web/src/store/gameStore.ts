import { create } from 'zustand';
import {
  Character,
  EducationalScenario,
  EventChoice,
  FinancialSharingModel,
  GameState,
  HousingOption,
  InsuranceContract,
  LifeEvent,
  LifeGoal,
  MobilityOption,
  RelationshipStatus,
  TaxClass,
  TownLocationId,
} from '@goal/shared-types';
import {
  createInitialGameState,
  stepSimulationMonth,
  applyEventChoice,
  toggleInsuranceContract,
  setMonthlySavingsRates,
  takeLoan,
  restructureDebtToInstallmentLoan,
  repayLoanPartial,
  setMobilityOption,
  changeHousingOption,
  openBausparvertrag,
  updateFamilyRelationship,
  adjustChildrenCount,
  setBavMonthlyContribution,
  setTaxParameters,
  changeCareerPath,
  calculateGermanPayroll,
  SeededRandom,
  requestSalaryRaise,
  setEmploymentHours,
  changeEmployedJob,
  startFurtherTraining,
  abortEducationPath,
  applyLearningCard,
} from '@goal/simulation-engine';
import {
  ALL_LIFE_EVENTS,
  ALL_LIFE_GOALS,
  CAREER_ACTION_CONSTANTS,
  CAREER_OPTIONS,
  EducationCareerOption,
  EDUCATIONAL_SCENARIOS,
  getLearningCardForLifeEvent,
  JOB_SWITCH_OPTIONS,
} from '@goal/game-content';
import { sound } from '../audio/soundSynth';
import confetti from 'canvas-confetti';
import {
  enhanceLearningTip,
  fetchClassroomTipOverrides,
  fetchPublishedContent,
  getStudentSession,
  saveCloudRun,
  type TipEnhancementRequest,
} from '../api/client';
import { evaluateLifeRun } from '@goal/scoring-engine';

export type GamePhase =
  | 'WELCOME'
  | 'SCENARIO_SELECT'
  | 'CHARACTER_CREATION'
  | 'GOAL_SELECTION'
  | 'CAREER_SELECTION'
  | 'PLAYING'
  | 'EVALUATION';

export type ActiveModal =
  | TownLocationId
  | 'BUDGET_MODAL'
  | 'GOALS_MODAL'
  | 'TRANSACTIONS_MODAL'
  | 'LEARNING_MODAL'
  | 'MOBILITY_MODAL'
  | 'HOUSING_MODAL'
  | 'FAMILY_MODAL'
  | 'PENSION_MODAL'
  | 'TAX_MODAL'
  | 'CLASSROOM_MODAL'
  | 'SCENARIO_SELECTION_MODAL'
  | 'PHONE_MODAL'
  | 'TEACHER_AUTH_MODAL'
  | 'CONTENT_ADMIN_MODAL'
  | 'JOIN_CLASS_MODAL'
  | null;

export type CloudSaveStatus = 'idle' | 'saving' | 'saved' | 'error' | 'offline';

export type TipRequestStatus = 'idle' | 'loading' | 'ready' | 'failed';

export interface EventChoiceFeedback {
  eventId: string;
  choiceId: string;
  eventTitle: string;
  choiceLabel: string;
  learningTip: string;
  financialImpact: number;
  age: number;
  scenarioId?: string;
  hasClassroomTipOverride: boolean;
  tipSource: 'static' | 'classroom' | 'llm';
  tipRequestStatus: TipRequestStatus;
  canRetry: boolean;
  phoneTipCardId?: string;
}

interface GameStoreState {
  gameState: GameState | null;
  gamePhase: GamePhase;
  activeModal: ActiveModal;
  tempCharacter: Character | null;
  tempGoals: LifeGoal[];
  selectedScenario: EducationalScenario | null;
  contentEvents: LifeEvent[];
  contentScenarios: EducationalScenario[];
  classroomTipOverrides: Record<string, string>;
  prng: SeededRandom | null;
  eventChoiceFeedback: EventChoiceFeedback | null;
  pendingPhoneTipCardId: string | null;
  careerActionFeedback: string | null;
  cloudSaveStatus: CloudSaveStatus;
  cloudSaveMessage?: string;
  cloudSaveAt?: number;

  // Actions
  startNewGame: () => void;
  loadPublishedContent: () => Promise<void>;
  startScenarioGame: (scenario: EducationalScenario, characterName?: string) => void;
  setTempCharacter: (char: Character) => void;
  confirmCharacterAndGoToGoals: () => void;
  setTempGoals: (goals: LifeGoal[]) => void;
  confirmGoalsAndGoToCareer: () => void;
  selectStartingCareer: (option: EducationCareerOption) => void;

  stepMonth: () => void;
  stepYear: () => void;
  togglePause: () => void;
  setSpeed: (speed: 1 | 2 | 5) => void;

  handleEventChoice: (choice: EventChoice) => void;
  dismissEventFeedback: () => void;
  retryEnhancedTip: () => void;
  handleToggleInsurance: (insurance: InsuranceContract, deductible?: number, healthPreCondition?: boolean) => void;
  handleSetSavingsRates: (emergencyRate: number, etfRate: number) => void;
  handleTakeLoan: (title: string, amount: number, interest: number, months: number, type?: any) => void;
  handleRestructureDebt: (termMonths?: number, interestRate?: number) => void;
  handleRepayLoan: (loanId: string, amount: number) => void;
  handleSetMobility: (option: MobilityOption) => void;
  handleChangeHousing: (option: HousingOption, downPaymentGiro?: number) => void;
  handleOpenBausparer: (contractSum?: number, monthlyContribution?: number) => void;
  handleUpdateFamily: (status: RelationshipStatus, partnerName?: string, partnerSalary?: number, sharingModel?: FinancialSharingModel) => void;
  handleAdjustChildren: (newCount: number) => void;
  handleSetBavContribution: (monthlyContribution: number) => void;
  handleSetTaxParameters: (taxClass: TaxClass, hasChurchTax: boolean) => void;
  handleRequestSalaryRaise: (mode: 'soft' | 'hard') => void;
  handleChangeEmployedJob: (optionId: string) => void;
  handleSetEmploymentHours: (hoursWeekly: 30 | 40) => void;
  handleStartFurtherTraining: () => void;
  handleAbortEducationPath: () => void;
  handleCompleteLearningCard: (cardId: string) => void;
  clearPendingPhoneTip: () => void;

  setActiveModal: (modal: ActiveModal) => void;
  closeModal: () => void;

  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  exportSaveState: () => string;
  importSaveState: (jsonStr: string) => boolean;
  resetGame: () => void;
}

const STORAGE_KEY = 'GOAL_LIFE_SIM_SAVE_V1';
let cloudSaveCounter = 0;

function persistLocal(state: GameState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Ignore
  }
}

function createEventChoiceFeedback(
  updatedState: GameState,
  eventId: string,
  eventTitle: string,
  choice: EventChoice,
  scenarioId?: string,
  overrideTip?: string
): EventChoiceFeedback {
  const appliedChoice = [...updatedState.pastEvents]
    .reverse()
    .find((pastEvent) => pastEvent.eventId === eventId && pastEvent.choiceId === choice.id);
  const hasClassroomTipOverride = Boolean(overrideTip?.trim());

  return {
    eventId,
    choiceId: choice.id,
    eventTitle,
    choiceLabel: choice.label,
    learningTip: overrideTip?.trim() || choice.learningTip,
    financialImpact: appliedChoice?.financialImpact ?? choice.costImmediate,
    age: updatedState.currentAge,
    scenarioId,
    hasClassroomTipOverride,
    tipSource: hasClassroomTipOverride ? 'classroom' : 'static',
    tipRequestStatus: 'idle',
    canRetry: false,
    phoneTipCardId: getLearningCardForLifeEvent(eventId)?.id,
  };
}

export function shouldRequestEnhancedTip(
  feedback: Pick<EventChoiceFeedback, 'learningTip' | 'hasClassroomTipOverride'>
): boolean {
  return !feedback.hasClassroomTipOverride && feedback.learningTip.trim().length > 0;
}

export function markTipRequestLoading(feedback: EventChoiceFeedback): EventChoiceFeedback {
  if (!shouldRequestEnhancedTip(feedback)) {
    return {
      ...feedback,
      tipRequestStatus: feedback.hasClassroomTipOverride ? 'idle' : 'ready',
      canRetry: false,
    };
  }

  return {
    ...feedback,
    tipRequestStatus: 'loading',
    canRetry: false,
  };
}

export type TipEnhancementResult = {
  enabled: boolean;
  tip: string;
};

export function applyTipEnhancementResult(
  current: EventChoiceFeedback | null,
  requested: Pick<EventChoiceFeedback, 'eventId' | 'choiceId'>,
  result: TipEnhancementResult | null,
  failed = false
): Partial<Pick<{ eventChoiceFeedback: EventChoiceFeedback }, 'eventChoiceFeedback'>> {
  if (
    !current ||
    current.eventId !== requested.eventId ||
    current.choiceId !== requested.choiceId ||
    current.hasClassroomTipOverride ||
    current.tipSource === 'classroom'
  ) {
    return {};
  }

  if (failed || result == null) {
    return {
      eventChoiceFeedback: {
        ...current,
        tipSource: 'static',
        tipRequestStatus: 'failed',
        canRetry: true,
      },
    };
  }

  const enhanced = result.tip.trim();
  const original = current.learningTip.trim();
  if (result.enabled && enhanced && enhanced !== original) {
    return {
      eventChoiceFeedback: {
        ...current,
        learningTip: enhanced,
        tipSource: 'llm',
        tipRequestStatus: 'ready',
        canRetry: false,
      },
    };
  }

  if (!result.enabled) {
    return {
      eventChoiceFeedback: {
        ...current,
        tipSource: 'static',
        tipRequestStatus: 'ready',
        canRetry: false,
      },
    };
  }

  return {
    eventChoiceFeedback: {
      ...current,
      tipSource: 'static',
      tipRequestStatus: 'failed',
      canRetry: true,
    },
  };
}

export function buildTipEnhancementPayload(feedback: EventChoiceFeedback): TipEnhancementRequest {
  return {
    learningTip: feedback.learningTip,
    eventId: feedback.eventId,
    choiceId: feedback.choiceId,
    age: feedback.age,
    scenarioId: feedback.scenarioId,
  };
}

function requestEnhancedTip(feedback: EventChoiceFeedback) {
  const requested = { eventId: feedback.eventId, choiceId: feedback.choiceId };
  void enhanceLearningTip(buildTipEnhancementPayload(feedback))
    .then((result) => {
      useGameStore.setState((state) =>
        applyTipEnhancementResult(state.eventChoiceFeedback, requested, result)
      );
    })
    .catch(() => {
      useGameStore.setState((state) =>
        applyTipEnhancementResult(state.eventChoiceFeedback, requested, null, true)
      );
    });
}

async function maybeCloudSave(state: GameState, force = false) {
  if (!getStudentSession()) {
    useGameStore.setState({
      cloudSaveStatus: 'idle',
      cloudSaveMessage: undefined,
      cloudSaveAt: undefined,
    });
    return;
  }
  cloudSaveCounter += 1;
  const shouldSave =
    force ||
    state.isGameOver ||
    Boolean(state.activeEvent) ||
    cloudSaveCounter % 12 === 0;
  if (!shouldSave) return;

  useGameStore.setState({
    cloudSaveStatus: 'saving',
    cloudSaveMessage: 'Cloud-Save läuft…',
  });

  try {
    const extras = state.isGameOver
      ? (() => {
          const evaluation = evaluateLifeRun(state);
          return {
            overallScore: evaluation.overallScore,
            evaluation,
          };
        })()
      : undefined;
    await saveCloudRun(state, extras);
    useGameStore.setState({
      cloudSaveStatus: 'saved',
      cloudSaveMessage: 'Cloud-Spielstand gespeichert',
      cloudSaveAt: Date.now(),
    });
  } catch {
    // Offline / API down → localStorage remains source of truth
    useGameStore.setState({
      cloudSaveStatus: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'error',
      cloudSaveMessage: 'Cloud-Save fehlgeschlagen, lokal gespeichert',
    });
  }
}

function sanitizeGameState(state: any): GameState {
  return {
    ...state,
    version: '0.5.0',
    career: {
      ...state.career,
      fullTimeGrossSalary:
        state.career?.fullTimeGrossSalary ??
        (state.career?.timeCommitmentHoursWeekly === 30
          ? Math.round((state.career?.monthlySalaryGross || 0) * 40 / 30)
          : state.career?.monthlySalaryGross || 0),
      monthsSinceLastRaiseAttempt: state.career?.monthsSinceLastRaiseAttempt ?? 12,
      monthsSinceLastTraining: state.career?.monthsSinceLastTraining ?? 24,
      monthsSinceLastJobSwitch: state.career?.monthsSinceLastJobSwitch ?? 12,
    },
    activeMobility: state.activeMobility || 'PUBLIC_TRANSIT',
    housing: state.housing || {
      type: 'PARENTS',
      title: 'Bei den Eltern (Elternhaus)',
      monthlyWarmRent: 0,
      coldRent: 0,
      utilitiesCost: 0,
      depositPaid: 0,
    },
    family: state.family || {
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
    bausparContracts: state.bausparContracts || [],
    tax: state.tax || calculateGermanPayroll(state.career?.monthlySalaryGross || 0, 'I', false, 0, state.currentAge || 16),
    pension: state.pension || {
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
      ...state.bankAccount,
      dispoWarningStage: state.bankAccount?.dispoWarningStage || 'NONE',
    },
    budget: {
      ...state.budget,
      grossSalary: state.budget?.grossSalary || state.career?.monthlySalaryGross || 0,
      partnerContribution: state.budget?.partnerContribution || 0,
      childBenefitTotal: state.budget?.childBenefitTotal || 0,
      pensionPayoutMonthly: state.budget?.pensionPayoutMonthly || 0,
      childCareAndSupport: state.budget?.childCareAndSupport || 0,
      bausparContributionsTotal: state.budget?.bausparContributionsTotal || 0,
      bavAutoDeduction: state.budget?.bavAutoDeduction || 0,
    },
    insurances: state.insurances || [],
    loans: state.loans || [],
    goals: state.goals || [],
    pastEvents: state.pastEvents || [],
    transactions: state.transactions || [],
    historySnapshots: state.historySnapshots || [],
    unlockedAchievements: state.unlockedAchievements || [],
  };
}

export const useGameStore = create<GameStoreState>((set, get) => ({
  gameState: null,
  gamePhase: 'WELCOME',
  activeModal: null,
  tempCharacter: null,
  tempGoals: [],
  selectedScenario: null,
  contentEvents: ALL_LIFE_EVENTS,
  contentScenarios: EDUCATIONAL_SCENARIOS,
  classroomTipOverrides: {},
  prng: null,
  eventChoiceFeedback: null,
  pendingPhoneTipCardId: null,
  careerActionFeedback: null,
  cloudSaveStatus: 'idle',
  cloudSaveMessage: undefined,
  cloudSaveAt: undefined,

  startNewGame: () => {
    const scenarios = get().contentScenarios.length ? get().contentScenarios : EDUCATIONAL_SCENARIOS;
    sound.playPop();
    set({
      gamePhase: 'CHARACTER_CREATION',
      tempCharacter: {
        name: 'Alex',
        avatar: 'student_boy',
        startCondition: 'FAMILY_SUPPORT',
        bio: 'Möchte eigene Ziele verwirklichen und klug mit Geld umgehen.',
      },
      tempGoals: [],
      selectedScenario: scenarios[0],
      activeModal: null,
      eventChoiceFeedback: null,
      pendingPhoneTipCardId: null,
      careerActionFeedback: null,
      cloudSaveStatus: 'idle',
      cloudSaveMessage: undefined,
      cloudSaveAt: undefined,
    });
  },

  loadPublishedContent: async () => {
    const fallback = {
      contentEvents: ALL_LIFE_EVENTS,
      contentScenarios: EDUCATIONAL_SCENARIOS,
      classroomTipOverrides: {},
    };

    try {
      const bundle = await fetchPublishedContent();
      const session = getStudentSession();
      let classroomTipOverrides: Record<string, string> = {};

      if (session?.classroomId && session.sessionToken) {
        try {
          const data = await fetchClassroomTipOverrides(session.classroomId, {
            studentToken: session.sessionToken,
          });
          classroomTipOverrides = Object.fromEntries(
            (data.tipOverrides || []).map((override) => [override.eventId, override.tipText])
          );
        } catch {
          classroomTipOverrides = {};
        }
      }

      set({
        contentEvents: bundle.events?.length ? bundle.events : ALL_LIFE_EVENTS,
        contentScenarios: bundle.scenarios?.length ? bundle.scenarios : EDUCATIONAL_SCENARIOS,
        classroomTipOverrides,
      });
    } catch {
      set(fallback);
    }
  },

  startScenarioGame: (scenario, characterName) => {
    sound.playFanfare();
    const safeCharacterName = characterName?.trim().slice(0, 40) || 'Alex';
    const defaultCharacter: Character = {
      name: safeCharacterName,
      avatar: 'student_boy',
      startCondition: scenario.initialCondition,
      bio: scenario.subtitle,
    };

    const goals: LifeGoal[] = scenario.recommendedGoals.map((gId, idx) => {
      const g = ALL_LIFE_GOALS.find((goal) => goal.id === gId) || ALL_LIFE_GOALS[0];
      return { ...g, priority: idx + 1 };
    });

    const seed = Date.now();
    const rng = new SeededRandom(seed);
    let state = createInitialGameState(defaultCharacter, goals, seed);
    state.currentAge = scenario.startAge;
    state.scenarioEndAge = scenario.endAge;
    state.currentYear = Math.max(1, scenario.startAge - 15);

    if (scenario.id === 'SCENARIO_SCHULDENFALLE') {
      state.bankAccount.giroBalance = -1800;
      state.bankAccount.dispoWarningStage = 'ORANGE';
      state.loans = [
        {
          id: 'loan_bnpl_1',
          type: 'BNPL',
          title: 'BNPL Ratenkauf Elektronik',
          principalInitial: 450,
          principalRemaining: 450,
          monthlyRate: 75,
          nominalInterestAnnual: 0.129,
          effectiveInterestAnnual: 0.137,
          totalInterestProjected: 75,
          remainingMonths: 6,
          totalInterestPaid: 0,
        },
        {
          id: 'loan_bnpl_2',
          type: 'BNPL',
          title: 'BNPL Mode-Abo',
          principalInitial: 280,
          principalRemaining: 280,
          monthlyRate: 70,
          nominalInterestAnnual: 0.149,
          effectiveInterestAnnual: 0.16,
          totalInterestProjected: 60,
          remainingMonths: 4,
          totalInterestPaid: 0,
        },
      ];
      state.budget.loanRatesTotal = 145;
      state.budget.totalFixedExpenses += 145;
    }

    if (scenario.id === 'SCENARIO_AUSBILDUNG') {
      const ausbildung = CAREER_OPTIONS.find((c) => c.id === 'PATH_AUSBILDUNG');
      if (ausbildung) {
        state = changeCareerPath(
          state,
          {
            type: ausbildung.type,
            title: ausbildung.title,
            branch: ausbildung.branch,
            currentYear: 1,
            durationYears: ausbildung.durationYears,
            monthlySalaryGross: ausbildung.monthlySalaryGross,
            monthlySalaryNet: ausbildung.monthlySalaryNet,
            tuitionOrTrainingCostMonthly: 0,
            stressFactor: ausbildung.stressFactor,
            timeCommitmentHoursWeekly: ausbildung.timeCommitmentHoursWeekly,
            careerAdvancementLevel: 0,
            isCompleted: false,
            fullTimeGrossSalary: ausbildung.monthlySalaryGross,
            monthsSinceLastRaiseAttempt: 12,
            monthsSinceLastTraining: 24,
            monthsSinceLastJobSwitch: 12,
          },
          ausbildung.rentEstimated,
          ausbildung.mobilityEstimated
        );
      }
    }

    if (scenario.id === 'SCENARIO_EIGENHEIM') {
      const job = CAREER_OPTIONS.find((c) => c.id === 'PATH_QUEREINSTIEG') || CAREER_OPTIONS[0];
      state = changeCareerPath(
        state,
        {
          type: job.type,
          title: job.title,
          branch: job.branch,
          currentYear: 3,
          durationYears: job.durationYears,
          monthlySalaryGross: job.startingGrossAfterGraduation || job.monthlySalaryGross,
          monthlySalaryNet: job.startingNetAfterGraduation || job.monthlySalaryNet,
          tuitionOrTrainingCostMonthly: 0,
          stressFactor: job.stressFactor,
          timeCommitmentHoursWeekly: job.timeCommitmentHoursWeekly,
          careerAdvancementLevel: 1,
          isCompleted: true,
          fullTimeGrossSalary: job.startingGrossAfterGraduation || job.monthlySalaryGross,
          monthsSinceLastRaiseAttempt: 12,
          monthsSinceLastTraining: 24,
          monthsSinceLastJobSwitch: 12,
        },
        470,
        49
      );
      state.housing = {
        type: 'SHARED_APARTMENT',
        title: 'WG-Zimmer (Wohngemeinschaft)',
        monthlyWarmRent: 470,
        coldRent: 380,
        utilitiesCost: 90,
        depositPaid: 1140,
      };
    }

    set({
      gameState: state,
      selectedScenario: scenario,
      prng: rng,
      gamePhase: 'PLAYING',
      activeModal: null,
      eventChoiceFeedback: null,
      pendingPhoneTipCardId: null,
      careerActionFeedback: null,
      cloudSaveStatus: 'idle',
      cloudSaveMessage: getStudentSession() ? 'Cloud-Save bereit' : undefined,
      cloudSaveAt: undefined,
    });
  },

  setTempCharacter: (char) => {
    set({ tempCharacter: char });
  },

  confirmCharacterAndGoToGoals: () => {
    sound.playPop();
    set({ gamePhase: 'GOAL_SELECTION' });
  },

  setTempGoals: (goals) => {
    set({ tempGoals: goals });
  },

  confirmGoalsAndGoToCareer: () => {
    sound.playPop();
    set({ gamePhase: 'CAREER_SELECTION' });
  },

  selectStartingCareer: (option) => {
    sound.playFanfare();
    const { tempCharacter, tempGoals } = get();
    if (!tempCharacter || tempGoals.length === 0) return;

    const seed = Date.now();
    const rng = new SeededRandom(seed);
    let state = createInitialGameState(tempCharacter, tempGoals, seed);

    state = changeCareerPath(
      state,
      {
        type: option.type,
        title: option.title,
        branch: option.branch,
        currentYear: 1,
        durationYears: option.durationYears,
        monthlySalaryGross: option.monthlySalaryGross,
        monthlySalaryNet: option.monthlySalaryNet,
        tuitionOrTrainingCostMonthly: 0,
        stressFactor: option.stressFactor,
        timeCommitmentHoursWeekly: option.timeCommitmentHoursWeekly,
        careerAdvancementLevel: 0,
        isCompleted: false,
        fullTimeGrossSalary: option.monthlySalaryGross,
        monthsSinceLastRaiseAttempt: 12,
        monthsSinceLastTraining: 24,
        monthsSinceLastJobSwitch: 12,
      },
      option.rentEstimated,
      option.mobilityEstimated
    );

    set({
      gameState: state,
      prng: rng,
      gamePhase: 'PLAYING',
      activeModal: null,
      eventChoiceFeedback: null,
      pendingPhoneTipCardId: null,
      careerActionFeedback: null,
      cloudSaveStatus: 'idle',
      cloudSaveMessage: undefined,
      cloudSaveAt: undefined,
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore
    }
  },

  stepMonth: () => {
    const { gameState, prng } = get();
    if (!gameState || gameState.isGameOver) return;

    const rng = prng || new SeededRandom(gameState.seed);
    const events = get().contentEvents.length ? get().contentEvents : ALL_LIFE_EVENTS;
    const result = stepSimulationMonth(gameState, events, rng);

    if (result.nextState.bankAccount.giroBalance < 0 && gameState.bankAccount.giroBalance >= 0) {
      sound.playWarning();
    } else {
      sound.playCoin();
    }

    if (result.triggeredEvent) {
      sound.playEventAlert();
    }

    if (result.nextState.isGameOver) {
      sound.playFanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      set({
        gameState: result.nextState,
        gamePhase: 'EVALUATION',
      });
      persistLocal(result.nextState);
      void maybeCloudSave(result.nextState, true);
      return;
    }

    set({
      gameState: result.nextState,
      prng: rng,
    });

    persistLocal(result.nextState);
    void maybeCloudSave(result.nextState, Boolean(result.triggeredEvent));
  },

  stepYear: () => {
    const { gameState, prng } = get();
    if (!gameState || gameState.isGameOver) return;

    const rng = prng || new SeededRandom(gameState.seed);
    let state = gameState;

    for (let i = 0; i < 12; i++) {
      if (state.isGameOver) break;
      const events = get().contentEvents.length ? get().contentEvents : ALL_LIFE_EVENTS;
      const res = stepSimulationMonth(state, events, rng);
      state = res.nextState;
      if (res.triggeredEvent) {
        sound.playEventAlert();
        set({ gameState: state, prng: rng });
        return;
      }
    }

    sound.playCoin();
    if (state.isGameOver) {
      sound.playFanfare();
      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      set({ gameState: state, gamePhase: 'EVALUATION' });
    } else {
      set({ gameState: state, prng: rng });
    }
  },

  togglePause: () => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    set({
      gameState: { ...gameState, isPaused: !gameState.isPaused },
    });
  },

  setSpeed: (speed) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    set({
      gameState: { ...gameState, speed },
    });
  },

  handleEventChoice: (choice) => {
    const { gameState } = get();
    if (!gameState || !gameState.activeEvent) return;

    sound.playPop();
    const event = gameState.activeEvent;
    const updatedState = applyEventChoice(gameState, event, choice);
    const overrideTip = get().classroomTipOverrides[event.id];
    const scenarioId = get().selectedScenario?.id ?? getStudentSession()?.scenarioId ?? undefined;
    const eventChoiceFeedback = createEventChoiceFeedback(
      updatedState,
      event.id,
      event.title,
      choice,
      scenarioId,
      overrideTip
    );

    const newAchieved = updatedState.goals.some(
      (g, idx) => g.isAchieved && !gameState.goals[idx].isAchieved
    );
    if (newAchieved) {
      sound.playFanfare();
      confetti({ particleCount: 80, spread: 60 });
    }

    const feedback = shouldRequestEnhancedTip(eventChoiceFeedback)
      ? markTipRequestLoading(eventChoiceFeedback)
      : eventChoiceFeedback;

    set({
      gameState: updatedState,
      eventChoiceFeedback: feedback,
      pendingPhoneTipCardId: eventChoiceFeedback.phoneTipCardId ?? null,
    });
    persistLocal(updatedState);
    if (shouldRequestEnhancedTip(feedback)) {
      requestEnhancedTip(feedback);
    }
    void maybeCloudSave(updatedState, true);
  },

  dismissEventFeedback: () => {
    const { gameState } = get();
    sound.playPop();
    set({
      eventChoiceFeedback: null,
      gameState: gameState ? { ...gameState, activeEvent: null } : gameState,
    });
  },

  retryEnhancedTip: () => {
    const current = get().eventChoiceFeedback;
    if (!current?.canRetry || !shouldRequestEnhancedTip(current)) return;
    const loading = markTipRequestLoading(current);
    set({ eventChoiceFeedback: loading });
    requestEnhancedTip(loading);
  },

  handleToggleInsurance: (insurance, deductible, healthPreCondition) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    const updated = toggleInsuranceContract(
      gameState,
      insurance,
      deductible ?? insurance.deductible,
      healthPreCondition ?? false
    );
    set({ gameState: updated });
  },

  handleSetSavingsRates: (emergencyRate, etfRate) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    const updated = setMonthlySavingsRates(gameState, emergencyRate, etfRate);
    set({ gameState: updated });
  },

  handleTakeLoan: (title, amount, interest, months, type = 'KONSUM') => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playCoin();
    const updated = takeLoan(gameState, title, amount, interest, months, type);
    set({ gameState: updated });
  },

  handleRestructureDebt: (termMonths = 24, interestRate = 0.065) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playFanfare();
    const updated = restructureDebtToInstallmentLoan(gameState, termMonths, interestRate);
    set({ gameState: updated });
  },

  handleRepayLoan: (loanId, amount) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    const updated = repayLoanPartial(gameState, loanId, amount);
    set({ gameState: updated });
  },

  handleSetMobility: (option) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playCoin();
    const updated = setMobilityOption(gameState, option);
    set({ gameState: updated });
  },

  handleChangeHousing: (option, downPaymentGiro = 0) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playFanfare();
    const updated = changeHousingOption(gameState, option, downPaymentGiro);
    set({ gameState: updated });
  },

  handleOpenBausparer: (contractSum = 50000, monthlyContribution = 100) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playFanfare();
    const updated = openBausparvertrag(gameState, contractSum, monthlyContribution);
    set({ gameState: updated });
  },

  handleUpdateFamily: (status, partnerName = 'Robin', partnerSalary = 2200, sharingModel = 'THREE_ACCOUNTS') => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playFanfare();
    const updated = updateFamilyRelationship(gameState, status, partnerName, partnerSalary, sharingModel);
    set({ gameState: updated });
  },

  handleAdjustChildren: (newCount) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playFanfare();
    const updated = adjustChildrenCount(gameState, newCount);
    set({ gameState: updated });
  },

  handleSetBavContribution: (monthlyContribution) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playFanfare();
    const updated = setBavMonthlyContribution(gameState, monthlyContribution);
    set({ gameState: updated });
  },

  handleSetTaxParameters: (taxClass, hasChurchTax) => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    const updated = setTaxParameters(gameState, taxClass, hasChurchTax);
    set({ gameState: updated });
  },

  handleRequestSalaryRaise: (mode) => {
    const { gameState, prng } = get();
    if (!gameState) return;

    const rng = prng || new SeededRandom(gameState.seed);
    const { state: updated, result } = requestSalaryRaise(gameState, mode, rng);

    if (!result.ok || result.kind === 'hard_fail') {
      sound.playWarning();
    } else {
      sound.playCoin();
    }

    set({
      gameState: updated,
      prng: rng,
      careerActionFeedback: result.message,
    });
  },

  handleChangeEmployedJob: (optionId) => {
    const { gameState } = get();
    if (!gameState) return;

    const updated = changeEmployedJob(gameState, optionId);
    if (updated === gameState) {
      const option = JOB_SWITCH_OPTIONS.find((candidate) => candidate.id === optionId);
      const cooldownRemaining = Math.max(
        0,
        CAREER_ACTION_CONSTANTS.jobSwitchCooldownMonths -
          (gameState.career.monthsSinceLastJobSwitch ?? 12)
      );
      const feedback =
        option && gameState.career.title === option.title && gameState.career.branch === option.branch
          ? 'Das ist bereits dein aktueller Job.'
          : cooldownRemaining > 0
            ? `Jobwechsel wieder in ${cooldownRemaining} Monat(en) möglich.`
            : 'Der Jobwechsel ist aktuell nicht möglich.';
      sound.playWarning();
      set({ careerActionFeedback: feedback });
      return;
    }

    sound.playCoin();
    set({
      gameState: updated,
      careerActionFeedback: 'Du hast den Job erfolgreich gewechselt.',
    });
  },

  handleSetEmploymentHours: (hoursWeekly) => {
    const { gameState } = get();
    if (!gameState) return;

    const updated = setEmploymentHours(gameState, hoursWeekly);
    if (updated === gameState) {
      sound.playWarning();
      set({ careerActionFeedback: 'Die Arbeitszeit kann aktuell nicht geändert werden.' });
      return;
    }

    sound.playPop();
    set({
      gameState: updated,
      careerActionFeedback:
        hoursWeekly === 30
          ? 'Du arbeitest jetzt in Teilzeit mit 30 Stunden pro Woche.'
          : 'Du arbeitest jetzt wieder 40 Stunden pro Woche.',
    });
  },

  handleStartFurtherTraining: () => {
    const { gameState } = get();
    if (!gameState) return;

    const updated = startFurtherTraining(gameState);
    if (updated === gameState) {
      sound.playWarning();
      set({ careerActionFeedback: 'Die Weiterbildung ist aktuell nicht möglich.' });
      return;
    }

    sound.playCoin();
    set({
      gameState: updated,
      careerActionFeedback: 'Weiterbildung gebucht: Dein Karrierelevel steigt.',
    });
  },

  handleAbortEducationPath: () => {
    const { gameState } = get();
    if (!gameState) return;

    const updated = abortEducationPath(gameState);
    if (updated === gameState) {
      sound.playWarning();
      set({ careerActionFeedback: 'Der Abbruch ist für diesen Karriereweg nicht möglich.' });
      return;
    }

    sound.playWarning();
    set({
      gameState: updated,
      careerActionFeedback: 'Ausbildung/Studium abgebrochen: Du startest jetzt im Quereinstieg.',
    });
  },

  handleCompleteLearningCard: (cardId) => {
    const { gameState } = get();
    if (!gameState) return;

    const updated = applyLearningCard(gameState, cardId);
    if (updated === gameState) {
      sound.playPop();
      return;
    }

    sound.playFanfare();
    set({
      gameState: updated,
      pendingPhoneTipCardId:
        get().pendingPhoneTipCardId === cardId ? null : get().pendingPhoneTipCardId,
    });
    persistLocal(updated);
    void maybeCloudSave(updated, true);
  },

  clearPendingPhoneTip: () => {
    sound.playPop();
    set({ pendingPhoneTipCardId: null });
  },

  setActiveModal: (modal) => {
    sound.playPop();
    set({ activeModal: modal });
  },

  closeModal: () => {
    sound.playPop();
    set({ activeModal: null, careerActionFeedback: null });
  },

  saveToLocalStorage: () => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    persistLocal(gameState);
    void maybeCloudSave(gameState, true);
  },

  loadFromLocalStorage: () => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (!saved) return false;
      const parsed = JSON.parse(saved);
      if (!parsed.character || !parsed.goals) return false;
      const sanitized = sanitizeGameState(parsed);

      sound.playFanfare();
      set({
        gameState: sanitized,
        prng: new SeededRandom(sanitized.seed),
        gamePhase: sanitized.isGameOver ? 'EVALUATION' : 'PLAYING',
        activeModal: null,
        eventChoiceFeedback: null,
        pendingPhoneTipCardId: null,
        careerActionFeedback: null,
        cloudSaveStatus: 'idle',
        cloudSaveMessage: getStudentSession() ? 'Cloud-Save bereit' : undefined,
        cloudSaveAt: undefined,
      });
      return true;
    } catch {
      return false;
    }
  },

  exportSaveState: () => {
    const { gameState } = get();
    return gameState ? JSON.stringify(gameState, null, 2) : '';
  },

  importSaveState: (jsonStr) => {
    try {
      const parsed = JSON.parse(jsonStr);
      if (!parsed.character || !parsed.goals) return false;
      const sanitized = sanitizeGameState(parsed);

      sound.playFanfare();
      set({
        gameState: sanitized,
        prng: new SeededRandom(sanitized.seed),
        gamePhase: sanitized.isGameOver ? 'EVALUATION' : 'PLAYING',
        activeModal: null,
        eventChoiceFeedback: null,
        careerActionFeedback: null,
        cloudSaveStatus: 'idle',
        cloudSaveMessage: getStudentSession() ? 'Cloud-Save bereit' : undefined,
        cloudSaveAt: undefined,
      });
      return true;
    } catch {
      return false;
    }
  },

  resetGame: () => {
    sound.playPop();
    set({
      gameState: null,
      gamePhase: 'WELCOME',
      activeModal: null,
      tempCharacter: null,
      tempGoals: [],
      selectedScenario: null,
      contentEvents: ALL_LIFE_EVENTS,
      contentScenarios: EDUCATIONAL_SCENARIOS,
      classroomTipOverrides: {},
      prng: null,
      eventChoiceFeedback: null,
      pendingPhoneTipCardId: null,
      careerActionFeedback: null,
      cloudSaveStatus: 'idle',
      cloudSaveMessage: undefined,
      cloudSaveAt: undefined,
    });
  },
}));
