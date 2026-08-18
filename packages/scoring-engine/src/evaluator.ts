import {
  CertificateData,
  EvaluationResult,
  GameState,
  ScoreDimension,
} from '@goal/shared-types';

/**
 * Berechnet die pädagogische und mehrdimensionale Lebensabschlussbewertung mit 67 Jahren (Ruhestand).
 */
export function evaluateLifeRun(state: GameState): EvaluationResult {
  // 1. ZIELERREICHUNG (Gewichtung: 30%)
  const totalGoals = state.goals.length;
  let weightedGoalScore = 0;
  let maxWeight = 0;
  let achievedCount = 0;

  state.goals.forEach((goal) => {
    const weight = 6 - goal.priority;
    maxWeight += weight;

    if (goal.isAchieved) {
      achievedCount++;
      weightedGoalScore += weight * 100;
    } else {
      const progressRatio = Math.min(1, Math.max(0, goal.currentValue / Math.max(1, goal.targetValue)));
      weightedGoalScore += weight * (progressRatio * 100);
    }
  });

  const goalsScore = maxWeight > 0 ? Math.round(weightedGoalScore / maxWeight) : 70;
  const goalsDimension: ScoreDimension = {
    title: 'Persönliche Zielerreichung',
    score: goalsScore,
    weight: 0.3,
    description: `${achievedCount} von ${totalGoals} priorisierten Lebenszielen erreicht.`,
    strengths: state.goals.filter((g) => g.isAchieved).map((g) => `Ziel erreicht: ${g.title}`),
    improvements: state.goals
      .filter((g) => !g.isAchieved)
      .map((g) => `Nicht ganz geschafft: ${g.title} (${Math.round((g.currentValue / Math.max(1, g.targetValue)) * 100)} %)`),
  };

  // 2. FINANZIELLE STABILITÄT & ALTERSVORSORGE (Gewichtung: 25%)
  const totalDebt = state.loans.reduce(
    (sum, l) => sum + l.principalRemaining,
    state.bankAccount.giroBalance < 0 ? Math.abs(state.bankAccount.giroBalance) : 0
  );
  const propertyEquity = state.housing?.propertyValue || 0;
  const bausparBalance = (state.bausparContracts || []).reduce(
    (sum, b) => sum + b.accumulatedBalance,
    0
  );
  const bavBalance = state.pension?.bavAccumulatedBalance || 0;

  const netWorth =
    state.bankAccount.giroBalance +
    state.savingsAccount.tagesgeldBalance +
    state.investmentAccount.etfBalance +
    propertyEquity +
    bausparBalance +
    bavBalance -
    totalDebt;

  const monthlyExpenses =
    state.budget.totalFixedExpenses + state.budget.totalVariableExpenses;
  const emergencyMonths =
    monthlyExpenses > 0
      ? state.savingsAccount.tagesgeldBalance / monthlyExpenses
      : 3;

  const statutoryNet = state.pension?.projectedStatutoryPensionNet || 0;
  const pensionGap = state.pension?.projectedPensionGapMonthly || 0;

  let finScore = 50;
  // Notgroschen
  if (emergencyMonths >= 3) finScore += 20;
  else if (emergencyMonths >= 1) finScore += 10;

  // Schuldenfreiheit im Alter
  if (totalDebt === 0) finScore += 15;
  else if (totalDebt < 5000) finScore += 5;
  else finScore -= 20;

  // Nettovermögen mit 67 Jahren
  if (netWorth >= 150000) finScore += 15;
  else if (netWorth >= 50000) finScore += 10;
  else if (netWorth < 0) finScore -= 25;

  // Rentenlücke geschlossen
  if (pensionGap === 0) finScore += 10;
  else if (pensionGap < 400) finScore += 5;

  finScore = Math.min(100, Math.max(0, finScore));
  const finDimension: ScoreDimension = {
    title: 'Finanzielle Stabilität & Altersvorsorge',
    score: finScore,
    weight: 0.25,
    description: `Nettovermögen: ${Math.round(netWorth).toLocaleString('de-DE')} €, Gesetzliche Rente (Netto): ${Math.round(statutoryNet).toLocaleString('de-DE')} € / Mo.`,
    strengths: [
      emergencyMonths >= 3 ? 'Notgroschen-Puffer sicher aufgebaut' : 'Liquiditätsreserve vorhanden',
      totalDebt === 0 ? 'Vollständig schuldenfrei in den Ruhestand gestartet' : 'Verbindlichkeiten kontrolliert',
      netWorth >= 100000 ? 'Über 100.000 € Vermögenspolster fürs Alter' : 'Solider Vermögensaufbau',
    ],
    improvements: [
      pensionGap > 300 ? `Rentenlücke von ${Math.round(pensionGap)} € durch bAV oder ETF-Sparplan schließen` : '',
      totalDebt > 0 ? 'Schulden vor Renteneintritt vollständig tilgen' : '',
    ].filter(Boolean),
  };

  // 3. RISIKOABSICHERUNG (Gewichtung: 15%)
  const hasHaftpflicht = state.insurances.some(
    (i) => i.type === 'HAFTPFLICHT' && i.isActive
  );
  const hasBU = state.insurances.some(
    (i) => i.type === 'BERUFSUNFAEHIGKEIT' && i.isActive
  );
  let riskScore = 40;
  if (hasHaftpflicht) riskScore += 35;
  if (hasBU) riskScore += 25;
  riskScore = Math.min(100, Math.max(0, riskScore));

  const riskDimension: ScoreDimension = {
    title: 'Angemessene Risikoabsicherung',
    score: riskScore,
    weight: 0.15,
    description: `${state.insurances.length} aktive Versicherungen für existenzielle Lebensrisiken.`,
    strengths: [
      hasHaftpflicht ? 'Privathaftpflicht vorhanden (existenzielle Absicherung)' : '',
      hasBU ? 'Berufsunfähigkeit abgesichert (Schutz der Arbeitskraft)' : '',
    ].filter(Boolean),
    improvements: [
      !hasHaftpflicht ? 'Wichtig: Unbedingt eine Privathaftpflicht abschließen!' : '',
      !hasBU ? 'Berufsunfähigkeitsversicherung zur Arbeitskraftabsicherung prüfen' : '',
    ].filter(Boolean),
  };

  // 4. GESUNDHEIT & VITALITÄT (Gewichtung: 10%)
  const healthScore = Math.min(100, Math.max(0, Math.round(state.metrics.health)));
  const healthDimension: ScoreDimension = {
    title: 'Gesundheit & Vitalität',
    score: healthScore,
    weight: 0.1,
    description: `Vitalitätswert: ${healthScore} / 100, Stresslevel: ${Math.round(state.metrics.stress)} / 100.`,
    strengths: [
      healthScore >= 75 ? 'Sehr gute körperliche und mentale Gesundheit' : 'Stabile Vitalitätsbasis',
    ],
    improvements: [
      healthScore < 70 ? 'Mehr Bewegung und Vorsorgeuntersuchungen einplanen' : '',
    ].filter(Boolean),
  };

  // 5. ZUFRIEDENHEIT & FAMILIE (Gewichtung: 10%)
  const happinessScore = Math.min(100, Math.max(0, Math.round(state.metrics.happiness)));
  const happinessDimension: ScoreDimension = {
    title: 'Lebenszufriedenheit & Familie',
    score: happinessScore,
    weight: 0.1,
    description: `Zufriedenheitswert: ${happinessScore} / 100, Kinder: ${state.family.childrenCount}.`,
    strengths: [
      happinessScore >= 75 ? 'Hohes Glücks- und Zufriedenheitsempfinden' : 'Guter sozialer Ausgleich',
      state.family.childrenCount > 0 ? 'Erfülltes Familienleben mit Nachwuchs' : 'Hohe persönliche Flexibilität',
    ],
    improvements: [
      happinessScore < 70 ? 'Mehr Freiräume für Familie und Entspannung schaffen' : '',
    ].filter(Boolean),
  };

  // 6. FINANZBILDUNG & REFLEXION (Gewichtung: 10%)
  const literacyScore = Math.min(100, Math.max(0, Math.round(state.metrics.knowledgePoints)));
  const literacyDimension: ScoreDimension = {
    title: 'Finanzwissen & Reflexion',
    score: literacyScore,
    weight: 0.1,
    description: `${literacyScore} Wissenspunkte durch reflektierte Finanzentscheidungen gesammelt.`,
    strengths: [
      'Entscheidungen mit didaktischen Lerneffekten durchdacht',
      'Praxiserfahrung im Umgang mit Steuern, Rente und Vermögen erworben',
    ],
    improvements: [
      literacyScore < 60 ? 'Wissenskarten und Finanztipps intensiver nutzen' : '',
    ].filter(Boolean),
  };

  // GESAMTSCORE
  const overallScore = Math.round(
    goalsDimension.score * goalsDimension.weight +
      finDimension.score * finDimension.weight +
      riskDimension.score * riskDimension.weight +
      healthDimension.score * healthDimension.weight +
      happinessDimension.score * happinessDimension.weight +
      literacyDimension.score * literacyDimension.weight
  );

  let grade: EvaluationResult['grade'] = 'C';
  let verdictTitle = 'Solider Lebensweg';
  let verdictSubtitle = 'Du hast dein Leben bis zum Ruhestand mit 67 Jahren auf ein stabiles Fundament gestellt.';

  if (overallScore >= 90) {
    grade = 'A+';
    verdictTitle = 'Herausragende Lebensgestaltung!';
    verdictSubtitle = 'Perfekte Balance aus Zielen, Finanzen, Altersvorsorge, Gesundheit und Lebensfreude!';
  } else if (overallScore >= 80) {
    grade = 'A';
    verdictTitle = 'Ausgezeichnet gemeistert!';
    verdictSubtitle = 'Du hast deine wichtigsten Ziele erreicht und bist krisensicher im Ruhestand.';
  } else if (overallScore >= 70) {
    grade = 'B';
    verdictTitle = 'Erfolgreich & Stabil!';
    verdictSubtitle = 'Ein ausgewogenes Leben mit gesunden Finanzen und guter Rentenvorsorge.';
  } else if (overallScore >= 60) {
    grade = 'C';
    verdictTitle = 'Guter Lebensverlauf';
    verdictSubtitle = 'Wichtige Hürden gemeistert – mit kleineren Optimierungspotenzialen bei der Vorsorge.';
  } else if (overallScore >= 50) {
    grade = 'D';
    verdictTitle = 'Herausfordernder Lebensweg';
    verdictSubtitle = 'Finanzielle Engpässe oder unvorhersehbare Ereignisse haben dich gefordert.';
  } else {
    grade = 'F';
    verdictTitle = 'Wertvolle Lernerfahrung!';
    verdictSubtitle = 'Nutze die Erkenntnisse für deinen nächsten Spieldurchlauf!';
  }

  // Was-wäre-wenn Szenarien
  const whatIfScenarios = [
    {
      title: 'Zinseszins-Vergleich: 50 € mehr monatlich in weltweite ETFs',
      whatHappened: `Dein Endvermögen beträgt ${Math.round(netWorth).toLocaleString('de-DE')} €.`,
      whatIfAlternative: `Mit 50 € monatlich über 45 Berufsjahre in einem weltweiten ETF (bei 6 % p. a.) hättest du über 130.000 € zusätzliches Vermögen aufgebaut!`,
    },
    {
      title: 'Betriebliche Altersvorsorge (bAV) & Arbeitgeberzuschuss',
      whatHappened: `bAV-Guthaben im Ruhestand: ${Math.round(bavBalance).toLocaleString('de-DE')} €.`,
      whatIfAlternative: `Durch die Entgeltumwandlung hast du jeden Monat Steuern gespart und vom Chef mindestens 15 % Zuschuss geschenkt bekommen!`,
    },
  ];

  // Zertifikat-Daten für Schüler/Lehrer
  const certificate: CertificateData = {
    studentName: state.character.name,
    completionDate: new Date().toLocaleDateString('de-DE'),
    grade,
    overallScore,
    finalNetWorth: Math.round(netWorth),
    finalEmergencyMonths: Math.round(emergencyMonths * 10) / 10,
    goalsAchievedCount: achievedCount,
    goalsTotalCount: totalGoals,
    pensionCoveragePercent: Math.min(100, Math.round(((statutoryNet + (bavBalance / 10000) * 35) / Math.max(1, state.pension?.targetRetirementNetMonthly || 1800)) * 100)),
    co2Score: (() => {
      const mobility = state.activeMobility;
      if (mobility === 'PUBLIC_TRANSIT') return 90;
      if (mobility === 'CAR_CASH') return 45;
      if (mobility === 'CAR_FINANCED') return 40;
      if (mobility === 'CAR_LEASING') return 35;
      return 50;
    })(),
    keyStrengths: finDimension.strengths,
  };

  return {
    overallScore,
    grade,
    verdictTitle,
    verdictSubtitle,
    dimensions: {
      goals: goalsDimension,
      financialStability: finDimension,
      riskProtection: riskDimension,
      health: healthDimension,
      happiness: happinessDimension,
      financialLiteracy: literacyDimension,
    },
    goalsAchievedCount: achievedCount,
    goalsTotalCount: totalGoals,
    finalNetWorth: Math.round(netWorth),
    finalEmergencyMonths: Math.round(emergencyMonths * 10) / 10,
    finalPensionMonthlyNet: Math.round(statutoryNet),
    certificate,
    keyTakeaways: [
      'Nicht das höchste Vermögen gewinnt, sondern die Ausgewogenheit deiner Lebensziele.',
      'Ein Notgroschen von 3 Monatsausgaben schützt zuverlässig vor teuren Dispokrediten.',
      'Die Privathaftpflicht ist die unverzichtbare Basisversicherung im Alltag.',
      'Frühes, regelmäßiges Investieren nutzt die gewaltige Kraft des Zinseszinses.',
      'Das 3-Schichten-Modell (Gesetzlich, Betrieblich, Privat) schließt die Rentenlücke im Alter.',
    ],
    whatIfScenarios,
  };
}
