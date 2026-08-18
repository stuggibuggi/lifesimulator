export interface LearningCard {
  id: string;
  category: 'BUDGET' | 'SAVINGS' | 'INSURANCE' | 'CREDIT' | 'INVESTING' | 'TAX_PENSION';
  title: string;
  shortSummary: string;
  detailedText: string;
  keyFormulaOrRule?: string;
  icon: string;
}

export const FINANCIAL_LEARNING_CARDS: LearningCard[] = [
  {
    id: 'CARD_BRUTTO_NETTO',
    category: 'TAX_PENSION',
    title: 'Brutto vs. Netto: Was bleibt vom Gehalt?',
    shortSummary: 'Vom Bruttogehalt gehen ca. 35–45 % für Steuern und Sozialversicherungen ab.',
    detailedText:
      'Brutto ist das vereinbarte Gehalt vor Abzügen. Davon zieht der Arbeitgeber automatisch ab: Rentenversicherung (9,3 %), Krankenversicherung (ca. 8,4 %), Pflegeversicherung (2,2 %) und Arbeitslosenversicherung (1,3 %) sowie die Lohnsteuer nach deiner Steuerklasse. Was auf deinem Girokonto ankommt, ist das Netto!',
    keyFormulaOrRule: 'Netto = Brutto - Sozialabgaben (~20 %) - Lohnsteuer (~15-25 %)',
    icon: 'Receipt',
  },
  {
    id: 'CARD_DREI_SCHICHTEN_RENTE',
    category: 'TAX_PENSION',
    title: 'Das 3-Schichten-Modell der Altersvorsorge',
    shortSummary: 'Allein auf die gesetzliche Rente zu vertrauen, reicht für junge Generationen nicht mehr aus.',
    detailedText:
      '1. Schicht (Basis): Gesetzliche Rentenversicherung (generiert Rentenpunkte, sinkendes Rentenniveau).\n2. Schicht (Gefördert): Betriebliche Altersvorsorge (bAV) mit mind. 15 % Arbeitgeberzuschuss.\n3. Schicht (Privat): Weltweiter ETF-Sparplan oder private Rentenversicherung für flexible Rendite.',
    keyFormulaOrRule: 'Faustregel: Schicht 1 (Basis) + Schicht 2 (bAV) + Schicht 3 (ETF) = Krisensicher!',
    icon: 'Layers',
  },
  {
    id: 'CARD_RENTENLUECKE',
    category: 'TAX_PENSION',
    title: 'Die Rentenlücke verstehen & schließen',
    shortSummary: 'Die Differenz zwischen deinem gewohnten Lebensstandard und der gesetzlichen Rente.',
    detailedText:
      'Die gesetzliche Rente liegt netto meist nur bei ca. 45–48 % deines letzten Bruttoeinkommens. Um im Alter 80 % deines gewohnten Nettos zur Verfügung zu haben, entsteht eine monatliche Rentenlücke von oft 500 bis 1.200 €. Ein früher ETF-Sparplan schließt diese Lücke stressfrei über den Zinseszins.',
    keyFormulaOrRule: 'Rentenlücke = Wunschrente (80 % Netto) - Gesetzliche Rente Netto',
    icon: 'TrendingUp',
  },
  {
    id: 'CARD_BAV_AG_ZUSCHUSS',
    category: 'TAX_PENSION',
    title: 'Betriebliche Altersvorsorge (bAV) & Chefzuschuss',
    shortSummary: 'Sparen direkt aus dem Bruttogehalt spart Steuern & bringt mind. 15 % extra.',
    detailedText:
      'Bei der Entgeltumwandlung zahlst du z. B. 100 € monatlich direkt aus deinem Bruttogehalt in eine Betriebsrente ein. Dadurch zahlst du weniger Lohnsteuer und Sozialabgaben (dein Netto sinkt nur um ca. 55 €). Der Arbeitgeber ist gesetzlich verpflichtet, mindestens 15 % Zuschuss obendrauf zu zahlen!',
    keyFormulaOrRule: '100 € bAV-Sparrate kostet dich ca. 55 € Netto + 15 € Chefzuschuss = 115 € Anlage!',
    icon: 'Building',
  },
  {
    id: 'CARD_MIETEN_KAUFEN',
    category: 'BUDGET',
    title: 'Mieten vs. Kaufen: Was passt zu dir?',
    shortSummary: 'Mieten bietet Flexibilität, Kaufen erfordert hohes Eigenkapital für Nebenkosten.',
    detailedText:
      'Mieten ist keine Geldverschwendung: Du bleibst beruflich flexibel und musst keine Instandhaltungskosten (Dach, Heizung) zahlen. Wer kauft, muss mindestens ca. 10 % Kaufnebenkosten (Grunderwerbsteuer, Notar, Makler) aus eigenem Ersparten zahlen und sich über 25–30 Jahre an eine Bank binden.',
    keyFormulaOrRule: 'Kaufnebenkosten = ca. 10 % des Kaufpreises (muss aus Eigenkapital bezahlt werden).',
    icon: 'Home',
  },
  {
    id: 'CARD_NOTGROSCHEN',
    category: 'SAVINGS',
    title: 'Der Notgroschen – Dein finanzieller Airbag',
    shortSummary: '3 Monatsausgaben auf dem Tagesgeldkonto schützen dich vor Krediten & Notlagen.',
    detailedText:
      'Bevor du investierst oder teure Konsumgüter kaufst, gehört ein solider Notgroschen auf ein separates Tagesgeldkonto. Er deckt unvorhergesehene Kosten wie Waschmaschinen-Reparatur, Kaution oder Autopannen ab, ohne dass du den teuren Dispo nutzen musst.',
    keyFormulaOrRule: 'Faustregel: 3x monatliche Gesamtausgaben (z. B. 3 x 1.200 € = 3.600 €).',
    icon: 'ShieldCheck',
  },
  {
    id: 'CARD_DISPO',
    category: 'CREDIT',
    title: 'Die Dispo-Falle: Bequem, aber extrem teuer',
    shortSummary: 'Dispozinsen liegen oft bei 11–15 % p. a. – eine der teuersten Schuldenarten.',
    detailedText:
      'Der Dispositionskredit erlaubt es, das Girokonto ins Minus zu ziehen. Klingt praktisch, kostet aber immense Zinsen! Wer dauerhaft 1.000 € im Dispo ist, verschenkt jedes Jahr über 120–150 € rein an Zinsen an die Bank.',
    keyFormulaOrRule: 'Dispo nur für wenige Tage nutzen, niemals als dauerhafte Finanzierung!',
    icon: 'AlertCircle',
  },
  {
    id: 'CARD_EFFEKTIVZINS',
    category: 'CREDIT',
    title: 'Effektiver Jahreszins vs. Sollzins',
    shortSummary: 'Nur der Effektivzins zeigt die wahren Gesamtkosten eines Kredits.',
    detailedText:
      'Der Sollzins (Nominalzins) ist nur der reine Zinssatz für das geliehene Geld. Der effektive Jahreszins enthält zusätzlich Bearbeitungsgebühren, Auszahlungskurse und Zinsverrechnungsintervalle. Vergleiche Kreditangebote immer ausschließlich anhand des Effektivzinses!',
    keyFormulaOrRule: 'Merksatz: Vergleiche immer den effektiven Jahreszins (PAngV)!',
    icon: 'Percent',
  },
  {
    id: 'CARD_BNPL_RISK',
    category: 'CREDIT',
    title: 'Buy Now, Pay Later (BNPL) – Die stille Konsumfalle',
    shortSummary: 'Kleine Ratenkäufe und Zahlpausen verleiten zum Kontrollverlust.',
    detailedText:
      'Bezahldienste wie Klarna oder PayPal bieten bequeme 30-Tage-Zahlungsziele oder 4-Teil-Zahlungen. Viele junge Konsumenten verlieren den Überblick über 5 bis 10 parallele Miniraten. Verpasste Fristen führen zu Mahngebühren, Inkassoverfahren und Bonitätsverschlechterungen (Schufa).',
    keyFormulaOrRule: 'Grundregel: Wenn du es nicht 2x bar kaufen kannst, kannst du es dir nicht leisten.',
    icon: 'ShoppingBag',
  },
  {
    id: 'CARD_UMSCHULDUNG',
    category: 'CREDIT',
    title: 'Umschuldung: Die Rettung bei Disposchulden',
    shortSummary: 'Disposchulden durch einen günstigeren Ratenkredit halbieren die Zinskosten.',
    detailedText:
      'Steckst du mit z. B. 2.000 € dauerhaft im 13%-Dispo fest, lohnt sich eine Umschuldung: Du nimmst einen klassischen Ratenkredit zu ca. 6 % auf, gleichst das Girokonto auf 0 € aus und zahlst das Darlehen mit festen monatlichen Raten stressfrei und transparent ab.',
    keyFormulaOrRule: 'Zinsersparnis = Dispozinsen (13%) - Ratenkreditzins (6%) = ~7% Ersparnis!',
    icon: 'RefreshCw',
  },
  {
    id: 'CARD_HAFTPFLICHT',
    category: 'INSURANCE',
    title: 'Privathaftpflicht: Der wichtigste Schutz',
    shortSummary: 'Schützt dein gesamtes Leben vor unbegrenzten Schadensersatzforderungen.',
    detailedText:
      'Nach § 823 BGB haftest du für Schäden, die du anderen versehentlich zufügst, mit deinem gesamten aktuellen und zukünftigen Vermögen. Verursachst du z. B. als Fußgänger oder Radfahrer einen Unfall mit Personenschaden, können Millionen fällig werden. Eine Haftpflicht kostet nur ca. 4–6 € im Monat.',
    keyFormulaOrRule: 'Deckungssumme: Mindestens 10 bis 50 Millionen Euro.',
    icon: 'Umbrella',
  },
  {
    id: 'CARD_VERSICHERUNGS_PYRAMIDE',
    category: 'INSURANCE',
    title: 'Die Versicherungs-Pyramide: Was ist wirklich nötig?',
    shortSummary: 'Versichere nur Risiken, die dich finanziell ruinieren würden!',
    detailedText:
      '1. Existenzbedrohend (Must-Have): Privathaftpflicht, Berufsunfähigkeit, Kfz-Haftpflicht.\n2. Wichtig & günstig (Recommended): Auslandskrankenversicherung.\n3. Vermögenssichernd (Optional): Hausrat, Rechtsschutz.\n4. Unnötig / Teuer (Questionable): Smartphone-, Brillen- oder Garantieverlängerungen.',
    keyFormulaOrRule: 'Faustregel: Große existenzielle Risiken versichern – kleine Schäden selbst zahlen.',
    icon: 'Layers',
  },
  {
    id: 'CARD_AUTO_TOTAL_COST',
    category: 'BUDGET',
    title: 'Die wahren Gesamtkosten eines Autos (TCO)',
    shortSummary: 'Der Kaufpreis ist nur die Spitze des Eisbergs!',
    detailedText:
      'Ein Auto kostet monatlich weit mehr als nur Benzin: Kfz-Steuer, Kfz-Versicherung, Hauptuntersuchung (TÜV), Reifenwechsel, Verschleißreparaturen (Bremsen, Öl) und vor allem der monatliche Wertverlust machen selbst bei einem Kleinwagen schnell 300–450 € im Monat aus.',
    keyFormulaOrRule: 'Monatskosten = Sprit + Versicherung + Steuer + Wartung (ca. 70 €) + Wertverlust.',
    icon: 'Car',
  },
  {
    id: 'CARD_ZINSESZINS',
    category: 'INVESTING',
    title: 'Der Zinseszins-Effekt: Zeit ist dein größter Verbündeter',
    shortSummary: 'Erträge, die wieder Zinsen abwerfen, lassen dein Vermögen exponentiell wachsen.',
    detailedText:
      'Wenn du 100 € monatlich anlegst und die Rendite wieder reinvestiert wird, wächst nicht nur dein eingezahltes Geld, sondern auch die Zinsen der Vorjahre bringen neue Erträge. Je früher du beginnst, desto stärker arbeitet der Zinseszins für dich.',
    keyFormulaOrRule: 'Formel: Endwert = Startkapital * (1 + Zinssatz)^Jahre',
    icon: 'TrendingUp',
  },
  {
    id: 'CARD_50_30_20',
    category: 'BUDGET',
    title: 'Die 50-30-20-Budgetregel',
    shortSummary: 'Eine einfache Struktur für dein monatliches Nettoeinkommen.',
    detailedText:
      '50 % für Lebensnotwendiges (Miete, Essen, Verträge, Mobilität), 30 % für persönliche Wünsche & Freizeit (Hobbys, Reisen, Essen gehen) und 20 % für Sparen, Schuldentilgung & Notgroschen.',
    keyFormulaOrRule: '50 % Fixkosten / 30 % Wünsche / 20 % Sparen & Vorsorge',
    icon: 'PieChart',
  },
];
