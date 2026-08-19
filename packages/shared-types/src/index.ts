/**
 * GOAL – Shared Types & Domain Models
 * Zentrales Typenpaket für Simulationskern, Frontend, Content und Auswertung.
 */

export type AvatarId =
  | 'student_boy'
  | 'student_girl'
  | 'creative_teen'
  | 'ambitious_teen'
  | 'apprentice_boy'
  | 'apprentice_girl'
  | 'alex'
  | 'mila'
  | 'robin'
  | 'samira'
  | 'leo';

export type StartConditionId =
  | 'FAMILY_SUPPORT'
  | 'NO_SUPPORT'
  | 'CITY_EXPENSIVE'
  | 'RURAL_CHEAP';

export interface StartCondition {
  id: StartConditionId;
  title: string;
  description: string;
  startingGiroBalance: number;
  startingPocketMoney: number;
  familySupportMonthly: number;
  initialRentCost: number;
}

export interface Character {
  name: string;
  avatar: AvatarId;
  startCondition: StartConditionId;
  bio: string;
}

export type GoalCategory =
  | 'EDUCATION'
  | 'CAREER'
  | 'WEALTH'
  | 'LIFESTYLE'
  | 'SECURITY'
  | 'FAMILY'
  | 'HOUSING'
  | 'PENSION';

export interface LifeGoal {
  id: string;
  title: string;
  description: string;
  category: GoalCategory;
  targetValue: number; // e.g. target net worth, emergency months, completed degrees, children, property, pension gap
  currentValue: number;
  targetUnit: string;
  isAchieved: boolean;
  priority: number; // 1 (highest) to 5
  conflictHint?: string;
  icon: string;
}

export type CareerType =
  | 'SCHUELER'
  | 'AUSBILDUNG'
  | 'STUDIUM'
  | 'QUEREINSTIEG'
  | 'ANGESTELLTER'
  | 'SELBSTSTAENDIG'
  | 'FUEHRUNGSKRAFT'
  | 'RUHESTAND'
  | 'ARBEITSLOS';

export interface CareerState {
  type: CareerType;
  title: string;
  branch: string;
  currentYear: number;
  durationYears: number;
  monthlySalaryGross: number; // Bruttogehalt
  monthlySalaryNet: number; // Nettogehalt
  tuitionOrTrainingCostMonthly: number;
  stressFactor: number; // 0-100
  timeCommitmentHoursWeekly: number;
  careerAdvancementLevel: number; // 0..5
  isCompleted: boolean;
  fullTimeGrossSalary: number;
  monthsSinceLastRaiseAttempt: number;
  monthsSinceLastTraining: number;
}

export interface BankAccount {
  giroBalance: number;
  overdraftLimit: number; // Dispo-Limit (z.B. 1.000 €)
  overdraftInterestAnnual: number; // z.B. 0.125 für 12,5 %
  dispoWarningStage: 'NONE' | 'YELLOW' | 'ORANGE' | 'RED';
}

export interface SavingsAccount {
  tagesgeldBalance: number;
  interestRateAnnual: number; // z.B. 0.025 für 2,5 %
  autoSaveRateMonthly: number; // Automatische monatliche Sparrate
}

export interface InvestmentAccount {
  etfBalance: number;
  monthlySparrate: number;
  totalDeposited: number;
  averageAnnualReturn: number; // z.B. 0.06 für 6 %
}

export type InsuranceType =
  | 'HAFTPFLICHT'
  | 'BERUFSUNFAEHIGKEIT'
  | 'ZAHNZUSATZ'
  | 'HAUSRAT'
  | 'KFZ_HAFTPFLICHT'
  | 'AUSLANDSKRANKEN'
  | 'RECHTSSCHUTZ'
  | 'SMARTPHONE'
  | 'RISIKOLEBEN';

export type InsuranceImportanceTier =
  | 'ESSENTIAL'       // Absolutes Must-Have (z.B. Privathaftpflicht, BU)
  | 'RECOMMENDED'     // Sehr sinnvoll (z.B. Auslandskranken, Zahnzusatz, Risikoleben)
  | 'OPTIONAL'        // Nach Bedarf (z.B. Hausrat, Rechtsschutz)
  | 'QUESTIONABLE';   // Oft unnötig (z.B. Smartphone)

export interface InsuranceContract {
  id: string;
  type: InsuranceType;
  name: string;
  providerName: string;
  monthlyPremium: number;
  coverageLimit: number;
  deductible: number;
  availableDeductibles: number[];
  waitingPeriodMonthsRemaining: number;
  initialWaitingPeriodMonths: number;
  importanceTier: InsuranceImportanceTier;
  isActive: boolean;
  explanation: string;
  healthPreConditionRequired?: boolean;
  hasHealthPreConditionExclusion?: boolean;
}

export type LoanType =
  | 'DISPO'
  | 'KONSUM'
  | 'STUDIENKREDIT'
  | 'AUTOKREDIT'
  | 'BNPL'
  | 'LEASING'
  | 'IMMOBILIENDISPO'
  | 'IMMOBILIENDARLEHEN';

export interface LoanItem {
  id: string;
  type: LoanType;
  title: string;
  principalInitial: number;
  principalRemaining: number;
  monthlyRate: number;
  nominalInterestAnnual: number;
  effectiveInterestAnnual: number;
  totalInterestProjected: number;
  remainingMonths: number;
  totalInterestPaid: number;
  isOverdue?: boolean;
  lateFeeAccrued?: number;
}

export type MobilityType =
  | 'PUBLIC_TRANSIT'
  | 'CAR_CASH'
  | 'CAR_FINANCED'
  | 'CAR_LEASING';

export interface MobilityOption {
  type: MobilityType;
  title: string;
  description: string;
  acquisitionCost: number;
  monthlyCost: number;
  stressDelta: number;
  happinessDelta: number;
  co2EcoPoints: number; // 0-100
}

// --- WOHNEN & IMMOBILIEN ---
export type HousingType =
  | 'PARENTS'
  | 'SHARED_APARTMENT'
  | 'RENT_APARTMENT'
  | 'PROPERTY_OWNERSHIP';

export interface HousingOption {
  type: HousingType;
  title: string;
  description: string;
  monthlyWarmRent: number;
  coldRent: number;
  utilitiesCost: number;
  depositRequired: number;
  purchasePrice?: number;
  purchaseSideCosts?: number;
  downPaymentMin?: number;
  stressDelta: number;
  happinessDelta: number;
}

export interface HousingState {
  type: HousingType;
  title: string;
  monthlyWarmRent: number;
  coldRent: number;
  utilitiesCost: number;
  depositPaid: number;
  propertyValue?: number;
  propertyLoanId?: string;
}

export interface Bausparvertrag {
  id: string;
  title: string;
  contractSum: number;
  accumulatedBalance: number;
  monthlyContribution: number;
  interestSavingsRate: number;
  interestLoanRate: number;
  minimumSavingsRatio: number;
  isAllotted: boolean;
}

// --- PARTNERSCHAFT & FAMILIE ---
export type RelationshipStatus =
  | 'SINGLE'
  | 'PARTNERSHIP'
  | 'MARRIED';

export type FinancialSharingModel =
  | 'SEPARATE'         // Getrennte Kassen (50:50)
  | 'THREE_ACCOUNTS'   // 3-Konten-Modell (Haushaltskonto + 2 Privatkonten)
  | 'JOINT_POOL';      // Gemeinsamer Topf

export interface FamilyState {
  status: RelationshipStatus;
  partnerName?: string;
  partnerSalaryNet: number;
  sharingModel: FinancialSharingModel;
  childrenCount: number;
  childBenefitMonthly: number;
  childcareCostMonthly: number;
  childDirectExpensesMonthly: number;
  isParentalLeaveActive: boolean;
  parentalLeaveMonthsRemaining: number;
}

// --- STEUERN & BRUTTO/NETTO (Phase 5) ---
export type TaxClass = 'I' | 'II' | 'III' | 'IV' | 'V' | 'VI';

export interface TaxState {
  taxClass: TaxClass;
  hasChurchTax: boolean;
  grossMonthly: number;
  incomeTaxMonthly: number;
  solidaritySurchargeMonthly: number;
  churchTaxMonthly: number;
  pensionInsuranceMonthly: number; // 9,3% RV
  healthInsuranceMonthly: number; // 7,3% + 1,1% Zusatzbeitrag KV
  nursingInsuranceMonthly: number; // 2,2% PV
  unemploymentInsuranceMonthly: number; // 1,3% AV
  totalSocialDeductionsMonthly: number;
  totalTaxesMonthly: number;
  netMonthly: number;
}

// --- ALTERSVORSORGE & 3-SCHICHTEN-MODELL (Phase 5) ---
export interface PensionState {
  accumulatedPensionPoints: number; // Entgeltpunkte (EP)
  currentPensionPointValue: number; // z.B. 39,32 € pro Punkt
  projectedStatutoryPensionGross: number; // Gesetzliche Bruttorente
  projectedStatutoryPensionNet: number; // Gesetzliche Nettorente (nach KV/PV & Steuer)
  bavMonthlyContribution: number; // Betriebliche Altersvorsorge (bAV)
  bavEmployerMatchPercent: number; // Mind. 15% AG-Zuschuss
  bavAccumulatedBalance: number; // bAV Vermögen
  targetRetirementNetMonthly: number; // Wunschrente im Alter
  projectedPensionGapMonthly: number; // Rentenlücke
  isRetired: boolean;
}

// --- SZENARIEN & KLASSENZIMMER (Phase 6) ---
export interface EducationalScenario {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  targetAgeRange: string;
  startAge: number;
  endAge: number;
  initialCondition: StartConditionId;
  focusTopic: string;
  recommendedGoals: string[];
}

export interface CertificateData {
  studentName: string;
  completionDate: string;
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  overallScore: number;
  finalNetWorth: number;
  finalEmergencyMonths: number;
  goalsAchievedCount: number;
  goalsTotalCount: number;
  pensionCoveragePercent: number;
  co2Score: number;
  keyStrengths: string[];
}

export interface MonthlyBudget {
  // Einnahmen
  grossSalary: number;
  netSalary: number;
  partnerContribution: number;
  familySupport: number;
  bafoegOrSecondaryIncome: number;
  childBenefitTotal: number;
  pensionPayoutMonthly: number; // Rente im Ruhestand
  investmentDividends: number;
  totalIncome: number;

  // Fixkosten
  rentAndHousing: number;
  utilitiesAndEnergy: number;
  foodAndGroceries: number;
  childCareAndSupport: number;
  mobilityPublicTransitOrCar: number;
  phoneInternetSubscriptions: number;
  insurancesTotal: number;
  loanRatesTotal: number;
  bausparContributionsTotal: number;
  bavAutoDeduction: number; // bAV Entgeltumwandlung
  totalFixedExpenses: number;

  // Variable Kosten
  leisureAndHobbies: number;
  personalCareAndShopping: number;
  totalVariableExpenses: number;

  // Sparen & Investieren
  emergencyFundAutoSave: number;
  etfAutoInvest: number;
  totalSavingsTransfers: number;

  // Netto-Cashflow
  monthlyCashflow: number;
}

export interface LifeMetrics {
  health: number; // 0-100
  happiness: number; // 0-100
  stress: number; // 0-100
  freeTimeHoursWeekly: number; // 0-50
  knowledgePoints: number; // 0-100
}

export type EventCategory =
  | 'FINANCIAL'
  | 'CAREER'
  | 'HEALTH'
  | 'SOCIAL'
  | 'LIFESTYLE'
  | 'SURPRISE'
  | 'INSURANCE_CLAIM'
  | 'DEBT_TRAP'
  | 'HOUSING'
  | 'FAMILY'
  | 'PENSION_TAX';

export interface EventChoice {
  id: string;
  label: string;
  description: string;
  costImmediate: number;
  monthlyCostDelta?: number;
  healthDelta?: number;
  happinessDelta?: number;
  stressDelta?: number;
  knowledgeDelta?: number;
  careerDelta?: number;
  requiresInsurance?: InsuranceType;
  insuranceCoverageRate?: number;
  appliesDeductible?: boolean;
  learningTip: string;
}

export interface LifeEventEligibilityRules {
  hasHaftpflicht?: boolean;
  hasPartner?: boolean;
  isHomeOwner?: boolean;
  minEmergencyMonths?: number;
}

export interface LifeEvent {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  minAge: number;
  maxAge: number;
  probability: number;
  icon: string;
  imagePlaceholderId?: string;
  requires?: LifeEventEligibilityRules;
  excludes?: LifeEventEligibilityRules;
  choices: EventChoice[];
}

export interface TransactionRecord {
  id: string;
  age: number;
  year: number;
  month: number;
  amount: number;
  category: string;
  description: string;
  isAutomatic: boolean;
}

export interface SimulationSnapshot {
  age: number;
  year: number;
  month: number;
  giroBalance: number;
  savingsBalance: number;
  etfBalance: number;
  propertyEquity: number;
  bavBalance: number;
  totalDebt: number;
  netWorth: number;
  monthlyIncome: number;
  monthlyExpenses: number;
  pensionPoints: number;
  happiness: number;
  health: number;
  stress: number;
}

export type TownLocationId =
  | 'HOME'
  | 'SCHOOL_UNI'
  | 'WORK'
  | 'BANK'
  | 'INSURANCE_OFFICE'
  | 'MARKET'
  | 'PARK_SHRINE';

export interface GameState {
  version: string;
  seed: number;
  currentAge: number;
  currentYear: number; // Alter 16 bis 67 (Jahr 1 bis 51)
  currentMonth: number; // 1 bis 12
  /** Optional scenario end age (defaults to 67 for full life runs). */
  scenarioEndAge?: number;
  isPaused: boolean;
  speed: 1 | 2 | 5;
  isGameOver: boolean;
  activeLocation: TownLocationId;

  character: Character;
  goals: LifeGoal[];
  career: CareerState;
  activeMobility: MobilityType;
  housing: HousingState;
  family: FamilyState;
  bausparContracts: Bausparvertrag[];
  tax: TaxState;
  pension: PensionState;

  bankAccount: BankAccount;
  savingsAccount: SavingsAccount;
  investmentAccount: InvestmentAccount;
  insurances: InsuranceContract[];
  loans: LoanItem[];

  budget: MonthlyBudget;
  metrics: LifeMetrics;

  activeEvent: LifeEvent | null;
  pastEvents: {
    eventId: string;
    eventTitle: string;
    choiceId: string;
    choiceLabel: string;
    age: number;
    month: number;
    financialImpact: number;
  }[];

  transactions: TransactionRecord[];
  historySnapshots: SimulationSnapshot[];
  unlockedAchievements: string[];
}

export interface ScoreDimension {
  title: string;
  score: number; // 0-100
  weight: number;
  description: string;
  strengths: string[];
  improvements: string[];
}

export interface EvaluationResult {
  overallScore: number; // 0-100
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  verdictTitle: string;
  verdictSubtitle: string;
  dimensions: {
    goals: ScoreDimension;
    financialStability: ScoreDimension;
    riskProtection: ScoreDimension;
    health: ScoreDimension;
    happiness: ScoreDimension;
    financialLiteracy: ScoreDimension;
  };
  goalsAchievedCount: number;
  goalsTotalCount: number;
  finalNetWorth: number;
  finalEmergencyMonths: number;
  finalPensionMonthlyNet: number;
  certificate: CertificateData;
  keyTakeaways: string[];
  whatIfScenarios: {
    title: string;
    whatHappened: string;
    whatIfAlternative: string;
  }[];
}
