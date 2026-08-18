import { HousingOption } from '@goal/shared-types';

export const AVAILABLE_HOUSING_OPTIONS: HousingOption[] = [
  {
    type: 'PARENTS',
    title: 'Elternhaus (Hotel Mama)',
    description:
      'Geringste finanzielle Belastung. Keine eigene Miete oder Kaution, dafür weniger Unabhängigkeit und Privatsphäre.',
    monthlyWarmRent: 0,
    coldRent: 0,
    utilitiesCost: 0,
    depositRequired: 0,
    stressDelta: 0,
    happinessDelta: 0,
  },
  {
    type: 'SHARED_APARTMENT',
    title: 'WG-Zimmer (Wohngemeinschaft)',
    description:
      'Ideal für Studium und Berufseinstieg! Geteilte Küche und Bad, günstige Warmmiete und halbe Nebenkosten.',
    monthlyWarmRent: 470,
    coldRent: 380,
    utilitiesCost: 90,
    depositRequired: 1140, // 3 Kaltmieten
    stressDelta: 2,
    happinessDelta: 8,
  },
  {
    type: 'RENT_APARTMENT',
    title: 'Eigene 2-Zimmer-Mietwohnung',
    description:
      'Volle Privatsphäre, gemütlicher Rückzugsort. Höhere Miete und volle Verantwortung für Nebenkosten und Kaution.',
    monthlyWarmRent: 870,
    coldRent: 680,
    utilitiesCost: 190,
    depositRequired: 2040, // 3 Kaltmieten
    stressDelta: -3,
    happinessDelta: 15,
  },
  {
    type: 'PROPERTY_OWNERSHIP',
    title: 'Eigentumswohnung / Reihenhaus',
    description:
      'Eigenheim zur Selbstnutzung. Kaufpreis: 280.000 € zzgl. ca. 10 % Kaufnebenkosten (Notar, Grunderwerbsteuer). Erfordert Eigenkapital und ein langfristiges Bankdarlehen.',
    monthlyWarmRent: 1150, // Nebenkosten + Instandhaltungsrücklage
    coldRent: 0,
    utilitiesCost: 280,
    depositRequired: 0,
    purchasePrice: 280000,
    purchaseSideCosts: 28200,
    downPaymentMin: 45000, // 15% Eigenkapital
    stressDelta: 5,
    happinessDelta: 25,
  },
];
