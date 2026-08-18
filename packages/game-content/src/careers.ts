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
