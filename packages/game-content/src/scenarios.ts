import { EducationalScenario } from '@goal/shared-types';

export const EDUCATIONAL_SCENARIOS: EducationalScenario[] = [
  {
    id: 'SCENARIO_VOLL',
    title: 'Der volle Lebenslauf (16 bis 67 Jahre)',
    subtitle: 'Vom Schüler bis zum wohlverdienten Ruhestand',
    description:
      'Erlebe 51 Jahre deines Lebens: Ausbildung, erste eigene Wohnung, Partnerschaft, Familie, Vermögensaufbau und Altersvorsorge.',
    icon: 'Sparkles',
    targetAgeRange: '16 – 67 Jahre (51 Jahre)',
    startAge: 16,
    endAge: 67,
    initialCondition: 'FAMILY_SUPPORT',
    focusTopic: 'Ganzheitliche Lebens- und Finanzplanung',
    recommendedGoals: ['GOAL_AUSBILDUNG', 'GOAL_NOTGROSCHEN', 'GOAL_VERMOEGEN_50K'],
  },
  {
    id: 'SCENARIO_AUSBILDUNG',
    title: 'Die Ausbildungs-Challenge (16 bis 22 Jahre)',
    subtitle: 'Unterrichtsmodul: Berufseinstieg & Budgetierung',
    description:
      'Ideal für 45-minütige Schulstunden: Starte mit Ausbildungsvergütung, ziehe in ein WG-Zimmer und baue einen 3-Monats-Notgroschen auf.',
    icon: 'GraduationCap',
    targetAgeRange: '16 – 22 Jahre (6 Jahre)',
    startAge: 16,
    endAge: 22,
    initialCondition: 'FAMILY_SUPPORT',
    focusTopic: '50-30-20-Regel, Ausbildungsvergütung & Notgroschen',
    recommendedGoals: ['GOAL_AUSBILDUNG', 'GOAL_NOTGROSCHEN', 'GOAL_SCHULDENFREI'],
  },
  {
    id: 'SCENARIO_SCHULDENFALLE',
    title: 'Raus aus der Schuldenfalle (18 bis 28 Jahre)',
    subtitle: 'Unterrichtsmodul: Schuldenprävention & Umschuldung',
    description:
      'Du startest mit -1.800 € Disposchulden und 2 BNPL-Ratenkrediten. Schaffe den Turnaround durch Ausgabenstopp, Umschuldung und Budgetdisziplin!',
    icon: 'AlertTriangle',
    targetAgeRange: '18 – 28 Jahre (10 Jahre)',
    startAge: 18,
    endAge: 28,
    initialCondition: 'NO_SUPPORT',
    focusTopic: 'Dispozinsen, Effektivzins, Umschuldung & Schufa',
    recommendedGoals: ['GOAL_SCHULDENFREI', 'GOAL_NOTGROSCHEN', 'GOAL_VERMOEGEN_10K'],
  },
  {
    id: 'SCENARIO_EIGENHEIM',
    title: 'Der Weg zum Eigenheim (25 bis 45 Jahre)',
    subtitle: 'Unterrichtsmodul: Wohnen, Familie & Baufinanzierung',
    description:
      'Vom WG-Zimmer zur Familienimmobilie: Spare Eigenkapital mit Bausparverträgen an, meistere Kaufnebenkosten und sichere deine Familie mit dem 3-Konten-Modell ab.',
    icon: 'Key',
    targetAgeRange: '25 – 45 Jahre (20 Jahre)',
    startAge: 25,
    endAge: 45,
    initialCondition: 'FAMILY_SUPPORT',
    focusTopic: 'Mieten vs. Kaufen, 10 % Kaufnebenkosten & 3-Konten-Modell',
    recommendedGoals: ['GOAL_EIGENHEIM', 'GOAL_FAMILIE', 'GOAL_BAUSPARER'],
  },
];
