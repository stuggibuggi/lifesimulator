import { CareerState } from '@goal/shared-types';

export interface EducationCareerOption {
  id: string;
  type: CareerState['type'];
  title: string;
  branch: string;
  description: string;
  durationYears: number;
  monthlySalaryGross: number;
  monthlySalaryNet: number;
  startingGrossAfterGraduation: number;
  startingNetAfterGraduation: number;
  timeCommitmentHoursWeekly: number;
  stressFactor: number;
  rentEstimated: number;
  mobilityEstimated: number;
  pedagogicalTip: string;
}

export const CAREER_OPTIONS: EducationCareerOption[] = [
  {
    id: 'PATH_AUSBILDUNG',
    type: 'AUSBILDUNG',
    title: 'Duale Ausbildung (z. B. Fachinformatik / Mechatronik)',
    branch: 'Duale Berufsausbildung',
    description:
      '3 Jahre praxisnahe Ausbildung im Betrieb und in der Berufsschule mit fester monatlicher Ausbildungsvergütung.',
    durationYears: 3,
    monthlySalaryGross: 1150,
    monthlySalaryNet: 950,
    startingGrossAfterGraduation: 3300,
    startingNetAfterGraduation: 2350,
    timeCommitmentHoursWeekly: 38,
    stressFactor: 35,
    rentEstimated: 350,
    mobilityEstimated: 49,
    pedagogicalTip:
      'Guter Mittelweg: Du verdienst von Tag 1 an eigenes Geld und wirst eine gefragte Fachkraft.',
  },
  {
    id: 'PATH_STUDIUM',
    type: 'STUDIUM',
    title: 'Bachelor-Studium (z. B. Wirtschaft, Informatik, Lehramt)',
    branch: 'Hochschulstudium',
    description:
      '3,5 Jahre Vollzeitstudium. Finanzierung über BAföG, Werkstudentenjob oder familiäre Unterstützung.',
    durationYears: 3,
    monthlySalaryGross: 950,
    monthlySalaryNet: 850,
    startingGrossAfterGraduation: 4200,
    startingNetAfterGraduation: 2850,
    timeCommitmentHoursWeekly: 42,
    stressFactor: 45,
    rentEstimated: 420,
    mobilityEstimated: 35,
    pedagogicalTip:
      'Verzicht in der Studienzeit kann sich langfristig durch höhere Einstiegsgehälter und Karrierechancen auszahlen.',
  },
  {
    id: 'PATH_QUEREINSTIEG',
    type: 'ANGESTELLTER',
    title: 'Direkter Berufseinstieg / Quereinstieg',
    branch: 'Dienstleistung & Facharbeit',
    description:
      'Sofortiges volles Gehalt ab 18 Jahren ohne mehrjährige Ausbildungs- oder Studienphase.',
    durationYears: 1,
    monthlySalaryGross: 2450,
    monthlySalaryNet: 1850,
    startingGrossAfterGraduation: 2900,
    startingNetAfterGraduation: 2150,
    timeCommitmentHoursWeekly: 40,
    stressFactor: 40,
    rentEstimated: 550,
    mobilityEstimated: 75,
    pedagogicalTip:
      'Sofortiges Einkommen und Unabhängigkeit, aber das spätere Gehaltspotenzial steigt ohne Weiterbildung langsamer.',
  },
];

export const CAREER_ACTION_CONSTANTS = {
  softRaiseFactor: 1.02,
  hardRaiseFactor: 1.08,
  hardRaiseBaseChance: 0.35,
  hardRaiseChancePerLevel: 0.08,
  hardRaiseMaxChance: 0.75,
  hardRaiseFailStress: 12,
  raiseCooldownMonths: 12,
  trainingCostEuro: 1200,
  trainingStressDelta: 5,
  trainingCooldownMonths: 24,
  careerDeltaGrossFactor: 1.05,
  maxAdvancementLevel: 5,
} as const;

export interface JobSwitchOption {
  id: string;
  title: string;
  branch: string;
  salaryFactor: number; // applied to fullTimeGrossSalary
  transitionCostEuro: number;
  stressDelta: number;
  happinessDelta: number;
}

export const JOB_SWITCH_OPTIONS: JobSwitchOption[] = [
  {
    id: 'JOB_SWITCH_IT_SERVICE',
    title: 'IT-Systembetreuung',
    branch: 'IT & Digitalisierung',
    salaryFactor: 1.08,
    transitionCostEuro: 400,
    stressDelta: 5,
    happinessDelta: 10,
  },
  {
    id: 'JOB_SWITCH_PUBLIC',
    title: 'Öffentlicher Dienst (Sachbearbeitung)',
    branch: 'Verwaltung',
    salaryFactor: 0.95,
    transitionCostEuro: 200,
    stressDelta: -8,
    happinessDelta: 5,
  },
  {
    id: 'JOB_SWITCH_SALES',
    title: 'Außendienst / Kundenberatung',
    branch: 'Vertrieb',
    salaryFactor: 1.12,
    transitionCostEuro: 600,
    stressDelta: 12,
    happinessDelta: 5,
  },
];
