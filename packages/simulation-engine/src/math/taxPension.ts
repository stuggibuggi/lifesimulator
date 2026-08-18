import { TaxClass, TaxState, PensionState } from '@goal/shared-types';

/**
 * Deutsches Steuer- und Abgabensystem sowie Altersvorsorgeberechnung
 */

const BBG_RV = 7550; // Beitragsbemessungsgrenze Rentenversicherung (monatlich)
const BBG_KV = 5175; // Beitragsbemessungsgrenze Krankenversicherung (monatlich)
const DURCHSCHNITTSENTGELT_MONATLICH = 3780; // Durchschnittseinkommen für 1,0 Entgeltpunkt
const RENTENWERT_PRO_PUNKT = 39.32; // Aktueller Rentenwert pro EP

/**
 * Berechnet die genaue Brutto-Netto-Lohnabrechnung nach deutschen Sozial- und Steuerregeln
 */
export function calculateGermanPayroll(
  grossMonthly: number,
  taxClass: TaxClass = 'I',
  hasChurchTax: boolean = false,
  childrenCount: number = 0,
  age: number = 25
): TaxState {
  if (grossMonthly <= 0) {
    return {
      taxClass,
      hasChurchTax,
      grossMonthly: 0,
      incomeTaxMonthly: 0,
      solidaritySurchargeMonthly: 0,
      churchTaxMonthly: 0,
      pensionInsuranceMonthly: 0,
      healthInsuranceMonthly: 0,
      nursingInsuranceMonthly: 0,
      unemploymentInsuranceMonthly: 0,
      totalSocialDeductionsMonthly: 0,
      totalTaxesMonthly: 0,
      netMonthly: 0,
    };
  }

  // Minijob-Regelung (bis 538 € abgabenfrei für Schüler/Minijobber)
  if (grossMonthly <= 538) {
    return {
      taxClass,
      hasChurchTax,
      grossMonthly,
      incomeTaxMonthly: 0,
      solidaritySurchargeMonthly: 0,
      churchTaxMonthly: 0,
      pensionInsuranceMonthly: 0,
      healthInsuranceMonthly: 0,
      nursingInsuranceMonthly: 0,
      unemploymentInsuranceMonthly: 0,
      totalSocialDeductionsMonthly: 0,
      totalTaxesMonthly: 0,
      netMonthly: grossMonthly,
    };
  }

  // 1. Sozialversicherungsbeiträge (Arbeitnehmer-Anteile)
  const assessmentRV = Math.min(grossMonthly, BBG_RV);
  const assessmentKV = Math.min(grossMonthly, BBG_KV);

  // Rentenversicherung: 9,30 %
  const pensionInsuranceMonthly = Math.round(assessmentRV * 0.093 * 100) / 100;

  // Krankenversicherung: 7,30 % + 1,10 % Zusatzbeitrag = 8,40 %
  const healthInsuranceMonthly = Math.round(assessmentKV * 0.084 * 100) / 100;

  // Pflegeversicherung: 2,20 % (ohne Kinder ab 23 J. Zuschlag auf 2,60 %)
  const pvRate = childrenCount > 0 || age < 23 ? 0.022 : 0.026;
  const nursingInsuranceMonthly = Math.round(assessmentKV * pvRate * 100) / 100;

  // Arbeitslosenversicherung: 1,30 %
  const unemploymentInsuranceMonthly = Math.round(assessmentRV * 0.013 * 100) / 100;

  const totalSocialDeductionsMonthly =
    pensionInsuranceMonthly +
    healthInsuranceMonthly +
    nursingInsuranceMonthly +
    unemploymentInsuranceMonthly;

  // 2. Lohnsteuer nach Steuerklasse
  // Grundfreibetrag ca. 970 € monatlich steuerfrei
  const taxableIncome = Math.max(0, grossMonthly - totalSocialDeductionsMonthly);
  let taxRate = 0;

  if (taxableIncome > 5000) {
    taxRate = 0.35;
  } else if (taxableIncome > 3000) {
    taxRate = 0.26;
  } else if (taxableIncome > 1800) {
    taxRate = 0.18;
  } else if (taxableIncome > 970) {
    taxRate = 0.10;
  } else {
    taxRate = 0;
  }

  // Steuerklassen-Modifikator
  let taxClassMultiplier = 1.0;
  if (taxClass === 'III') taxClassMultiplier = 0.60; // Verheiratet Besserverdiener
  if (taxClass === 'V') taxClassMultiplier = 1.45; // Verheiratet Zweitverdiener
  if (taxClass === 'II') taxClassMultiplier = 0.88; // Alleinerziehende

  let incomeTaxMonthly = Math.round(taxableIncome * taxRate * taxClassMultiplier * 100) / 100;

  // Solidaritätszuschlag (erst ab sehr hohen Einkommen, ca. > 5.500 € Lohnsteuer)
  const solidaritySurchargeMonthly =
    incomeTaxMonthly > 1500 ? Math.round(incomeTaxMonthly * 0.055 * 100) / 100 : 0;

  // Kirchensteuer (8% bzw. 9% der Lohnsteuer)
  const churchTaxMonthly =
    hasChurchTax && incomeTaxMonthly > 0
      ? Math.round(incomeTaxMonthly * 0.09 * 100) / 100
      : 0;

  const totalTaxesMonthly =
    incomeTaxMonthly + solidaritySurchargeMonthly + churchTaxMonthly;

  const netMonthly = Math.round(
    (grossMonthly - totalSocialDeductionsMonthly - totalTaxesMonthly) * 100
  ) / 100;

  return {
    taxClass,
    hasChurchTax,
    grossMonthly,
    incomeTaxMonthly,
    solidaritySurchargeMonthly,
    churchTaxMonthly,
    pensionInsuranceMonthly,
    healthInsuranceMonthly,
    nursingInsuranceMonthly,
    unemploymentInsuranceMonthly,
    totalSocialDeductionsMonthly: Math.round(totalSocialDeductionsMonthly * 100) / 100,
    totalTaxesMonthly: Math.round(totalTaxesMonthly * 100) / 100,
    netMonthly: Math.max(0, netMonthly),
  };
}

/**
 * Berechnet den monatlichen Zuwachs an Rentenpunkten (Entgeltpunkten)
 */
export function calculateMonthlyPensionPoints(grossSalary: number): number {
  if (grossSalary <= 538) return 0; // Minijob generiert kaum EP
  const annualRatio = grossSalary / DURCHSCHNITTSENTGELT_MONATLICH;
  return annualRatio / 12;
}

/**
 * Berechnet die voraussichtliche gesetzliche Rente und die Rentenlücke
 */
export function calculatePensionOverview(
  accumulatedPensionPoints: number,
  targetRetirementNetMonthly: number,
  bavAccumulatedBalance: number = 0,
  etfBalance: number = 0
): {
  statutoryGross: number;
  statutoryNet: number;
  bavEstimatedMonthlyPayout: number;
  etfEstimatedMonthlyPayout: number;
  totalProjectedRetirementNet: number;
  pensionGapMonthly: number;
  coverageRatioPercent: number;
} {
  // 1. Gesetzliche Rente
  const statutoryGross = Math.round(accumulatedPensionPoints * RENTENWERT_PRO_PUNKT * 100) / 100;
  // Abzug von KV/PV (~11%) und pauschal ca. 8% Steuer im Rentenalter = ~81% Netto
  const statutoryNet = Math.round(statutoryGross * 0.81 * 100) / 100;

  // 2. Betriebliche Rente (bAV): Verrentungsfaktor ca. 35 € Rente pro 10.000 € Kapital
  const bavEstimatedMonthlyPayout = Math.round((bavAccumulatedBalance / 10000) * 35 * 0.82 * 100) / 100;

  // 3. Private ETF-Rente: 4%-Entnahmeregel (0,33% monatlich)
  const etfEstimatedMonthlyPayout = Math.round(((etfBalance * 0.04) / 12) * 100) / 100;

  const totalProjectedRetirementNet =
    statutoryNet + bavEstimatedMonthlyPayout + etfEstimatedMonthlyPayout;

  const pensionGapMonthly = Math.max(
    0,
    Math.round((targetRetirementNetMonthly - totalProjectedRetirementNet) * 100) / 100
  );

  const coverageRatioPercent =
    targetRetirementNetMonthly > 0
      ? Math.min(100, Math.round((totalProjectedRetirementNet / targetRetirementNetMonthly) * 100))
      : 100;

  return {
    statutoryGross,
    statutoryNet,
    bavEstimatedMonthlyPayout,
    etfEstimatedMonthlyPayout,
    totalProjectedRetirementNet: Math.round(totalProjectedRetirementNet * 100) / 100,
    pensionGapMonthly,
    coverageRatioPercent,
  };
}

/**
 * Simuliert einen Monat für die betriebliche Altersvorsorge (bAV)
 */
export function stepBavOneMonth(
  currentBalance: number,
  employeeContribution: number,
  employerMatchPercent: number = 0.15,
  annualReturn: number = 0.035
): { newBalance: number; totalContribution: number } {
  const employerContribution = employeeContribution * employerMatchPercent;
  const totalMonthlyContribution = employeeContribution + employerContribution;
  const monthlyInterest = currentBalance * (annualReturn / 12);
  const newBalance = currentBalance + totalMonthlyContribution + monthlyInterest;

  return {
    newBalance: Math.round(newBalance * 100) / 100,
    totalContribution: Math.round(totalMonthlyContribution * 100) / 100,
  };
}
