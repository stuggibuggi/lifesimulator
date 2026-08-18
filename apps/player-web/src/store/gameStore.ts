import { create } from 'zustand';
import {
  Character,
  EducationalScenario,
  EventChoice,
  FinancialSharingModel,
  GameState,
  HousingOption,
  InsuranceContract,
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
} from '@goal/simulation-engine';
import { ALL_LIFE_EVENTS, ALL_LIFE_GOALS, CAREER_OPTIONS, EducationCareerOption, EDUCATIONAL_SCENARIOS } from '@goal/game-content';
import { sound } from '../audio/soundSynth';
import confetti from 'canvas-confetti';

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
  | null;

interface GameStoreState {
  gameState: GameState | null;
  gamePhase: GamePhase;
  activeModal: ActiveModal;
  tempCharacter: Character | null;
  tempGoals: LifeGoal[];
  selectedScenario: EducationalScenario | null;
  prng: SeededRandom | null;

  // Actions
  startNewGame: () => void;
  startScenarioGame: (scenario: EducationalScenario) => void;
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

  setActiveModal: (modal: ActiveModal) => void;
  closeModal: () => void;

  saveToLocalStorage: () => void;
  loadFromLocalStorage: () => boolean;
  exportSaveState: () => string;
  importSaveState: (jsonStr: string) => boolean;
  resetGame: () => void;
}

const STORAGE_KEY = 'GOAL_LIFE_SIM_SAVE_V1';

function sanitizeGameState(state: any): GameState {
  return {
    ...state,
    version: '0.5.0',
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
  prng: null,

  startNewGame: () => {
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
      selectedScenario: EDUCATIONAL_SCENARIOS[0],
      activeModal: null,
    });
  },

  startScenarioGame: (scenario) => {
    sound.playFanfare();
    const defaultCharacter: Character = {
      name: 'Alex',
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
    const state = createInitialGameState(defaultCharacter, goals, seed);
    state.currentAge = scenario.startAge;

    set({
      gameState: state,
      selectedScenario: scenario,
      prng: rng,
      gamePhase: 'PLAYING',
      activeModal: null,
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
      },
      option.rentEstimated,
      option.mobilityEstimated
    );

    set({
      gameState: state,
      prng: rng,
      gamePhase: 'PLAYING',
      activeModal: null,
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
    const result = stepSimulationMonth(gameState, ALL_LIFE_EVENTS, rng);

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
      return;
    }

    set({
      gameState: result.nextState,
      prng: rng,
    });

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(result.nextState));
    } catch {
      // Ignore
    }
  },

  stepYear: () => {
    const { gameState, prng } = get();
    if (!gameState || gameState.isGameOver) return;

    const rng = prng || new SeededRandom(gameState.seed);
    let state = gameState;

    for (let i = 0; i < 12; i++) {
      if (state.isGameOver) break;
      const res = stepSimulationMonth(state, ALL_LIFE_EVENTS, rng);
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
    const updatedState = applyEventChoice(gameState, gameState.activeEvent, choice);

    const newAchieved = updatedState.goals.some(
      (g, idx) => g.isAchieved && !gameState.goals[idx].isAchieved
    );
    if (newAchieved) {
      sound.playFanfare();
      confetti({ particleCount: 80, spread: 60 });
    }

    set({ gameState: updatedState });
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

  setActiveModal: (modal) => {
    sound.playPop();
    set({ activeModal: modal });
  },

  closeModal: () => {
    sound.playPop();
    set({ activeModal: null });
  },

  saveToLocalStorage: () => {
    const { gameState } = get();
    if (!gameState) return;
    sound.playPop();
    localStorage.setItem(STORAGE_KEY, JSON.stringify(gameState));
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
      prng: null,
    });
  },
}));
