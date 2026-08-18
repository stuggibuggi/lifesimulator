import { MobilityOption } from '@goal/shared-types';

export const AVAILABLE_MOBILITY_OPTIONS: MobilityOption[] = [
  {
    type: 'PUBLIC_TRANSIT',
    title: 'Deutschlandticket & Fahrrad',
    description:
      'Sehr kostengünstig und umweltfreundlich. Deutschlandweite Nutzung aller Nahverkehrszüge, Busse und Bahnen ohne Anschaffungsschulden.',
    acquisitionCost: 0,
    monthlyCost: 49,
    stressDelta: -2,
    happinessDelta: 2,
    co2EcoPoints: 90,
  },
  {
    type: 'CAR_CASH',
    title: 'Gebrauchtwagen (Barzahlung)',
    description:
      'Solider Kleinwagen bar bezahlt ohne monatliche Kreditbelastung. Einmalig 3.500 € Anschaffung, zzgl. Benzin, Versicherung und Wartungsrücklage.',
    acquisitionCost: 3500,
    monthlyCost: 220,
    stressDelta: -5,
    happinessDelta: 6,
    co2EcoPoints: 45,
  },
  {
    type: 'CAR_FINANCED',
    title: 'Neuwagen / Jahreswagen (Kreditfinanzierung)',
    description:
      'Moderner, sicherer Wagen mit Herstellergarantie. Finanziert über 48 Monate (16.000 € Darlehen mit 5,9 % eff. Jahreszins). Hohe monatliche Fixkosten.',
    acquisitionCost: 16000, // Darlehenssumme
    monthlyCost: 260, // Laufende Kosten exklusive Kreditrate
    stressDelta: 3, // Kreditstress
    happinessDelta: 8,
    co2EcoPoints: 40,
  },
  {
    type: 'CAR_LEASING',
    title: 'Privatleasing (24 Monate)',
    description:
      'Fester monatlicher Leasingbeitrag. Achtung vor Kilometernachzahlungen und Minderwertgutachten bei der Fahrzeugrückgabe!',
    acquisitionCost: 500, // Bereitstellungskosten
    monthlyCost: 440, // 220€ Leasingrate + 220€ Unterhalt
    stressDelta: 2,
    happinessDelta: 7,
    co2EcoPoints: 42,
  },
];
