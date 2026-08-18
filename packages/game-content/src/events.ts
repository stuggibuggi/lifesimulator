import { LifeEvent } from '@goal/shared-types';

export const ALL_LIFE_EVENTS: LifeEvent[] = [
  {
    id: 'EVT_AGE_18_MILESTONE',
    title: 'Volljährigkeit & eigenes Girokonto!',
    description:
      'Du wirst 18 Jahre alt! Die Bank bietet dir dein erstes vollwertiges Girokonto mit einer Dispositionskredit-Linie (Dispo) von 1.000 € an.',
    category: 'FINANCIAL',
    minAge: 18,
    maxAge: 18,
    probability: 1.0,
    icon: 'Cake',
    choices: [
      {
        id: 'c_dispo_refuse',
        label: 'Dispo ablehnen oder auf 0 € setzen',
        description: 'Du gibst nur das Geld aus, das du tatsächlich auf dem Konto hast.',
        costImmediate: 0,
        knowledgeDelta: 15,
        happinessDelta: 5,
        stressDelta: -5,
        learningTip:
          'Kluger Schritt! Ein Dispokredit hat oft zweistellige Zinssätze (11–15 % p. a.) und verleitet schnell zu schleichender Verschuldung.',
      },
      {
        id: 'c_dispo_accept_with_plan',
        label: 'Dispo aktivieren, aber Notgroschen aufbauen',
        description: 'Du nimmst das Limit für Notfälle an, sparst aber konsequent 50 €/Monat.',
        costImmediate: 0,
        knowledgeDelta: 10,
        happinessDelta: 5,
        stressDelta: 0,
        learningTip:
          'Der Dispo sollte nur eine Notfallreserve sein. Ein echter Notgroschen auf dem Tagesgeldkonto ist kostenlos und bringt sogar Zinsen.',
      },
    ],
  },
  {
    id: 'EVT_BNPL_TRAP',
    title: 'Verlockung: „Kaufe jetzt, zahle in 30 Tagen“ (BNPL)',
    description:
      'Beim Online-Shopping kaufst du Kleidung und Elektronik für 350 € über einen Zahlungsdienstleister mit Zahlpause. Nach 30 Tagen hast du die Zahlung vergessen und erhältst eine Mahnung mit Verzugszinsen.',
    category: 'DEBT_TRAP',
    minAge: 18,
    maxAge: 29,
    probability: 0.14,
    icon: 'ShoppingBag',
    choices: [
      {
        id: 'c_bnpl_pay_immediate',
        label: 'Sofort vollständig inklusive Mahngebühr begleichen (-385 €)',
        description: 'Du zahlst den Betrag auf einen Schlag aus deinem Notgroschen, um weitere Gebühren zu stoppen.',
        costImmediate: -385,
        happinessDelta: -5,
        stressDelta: 5,
        knowledgeDelta: 20,
        learningTip:
          '„Buy Now, Pay Later“ (BNPL) ist eine der häufigsten Schuldenfallen für junge Erwachsene. Verpasste Fristen führen zu teuren Inkassogebühren und negativen Schufa-Einträgen.',
      },
      {
        id: 'c_bnpl_installment_conversion',
        label: 'In Ratenzahlung umwandeln (3 Monate je 140 € = 420 €)',
        description: 'Du streckst die Zahlung, zahlst aber am Ende 70 € mehr.',
        costImmediate: -140,
        monthlyCostDelta: 0,
        happinessDelta: -10,
        stressDelta: 15,
        knowledgeDelta: 15,
        learningTip:
          'Ratenkäufe summieren sich unbemerkt auf. Mehrere kleine Raten von 20–50 € können monatlich schnell ein ganzes Gehalt auffressen!',
      },
    ],
  },
  {
    id: 'EVT_MARRIAGE',
    title: 'Lebensentscheidung: Heirat & Finanzmodell!',
    description:
      'Du und deine große Liebe wollen heiraten! Wie wollt ihr eure Hochzeitsfeier und eure gemeinsamen Finanzen in der Ehe organisieren?',
    category: 'FAMILY',
    minAge: 24,
    maxAge: 40,
    probability: 0.15,
    icon: 'Heart',
    requires: { hasPartner: true },
    choices: [
      {
        id: 'c_marry_three_accounts',
        label: 'Feier im Freundeskreis & 3-Konten-Modell (-2.500 €)',
        description: 'Schöne, persönliche Feier. Ihr teilt Fixkosten 50:50 über ein Gemeinschaftskonto und behaltet jeweils ein eigenes Taschengeldkonto.',
        costImmediate: -2500,
        happinessDelta: 30,
        stressDelta: -5,
        knowledgeDelta: 25,
        learningTip:
          'Das 3-Konten-Modell gilt unter Finanzexperten als stabilste Lösung für Paare: Ein gemeinsames Konto für Fixkosten/Miete/Essen, plus zwei private Konten für eigene Hobbys ohne Rechenschaftspflicht!',
      },
      {
        id: 'c_marry_luxury_wedding',
        label: 'Große Traumhochzeit mit 100 Gästen (-12.000 €)',
        description: 'Schlosslocation, Band und Fotograf. Ein unvergesslicher Tag, der allerdings einen Großteil eurer Ersparnisse bindet.',
        costImmediate: -12000,
        happinessDelta: 40,
        stressDelta: 20,
        knowledgeDelta: 10,
        learningTip:
          'Große Hochzeiten sind emotional wunderschön, sollten aber nie auf Pump finanziert werden. Setzt euch vorher ein klares Budget!',
      },
    ],
  },
  {
    id: 'EVT_BIRTH_FIRST_CHILD',
    title: 'Familienzuwachs: Geburt des ersten Kindes! 👶',
    description:
      'Herzlichen Glückwunsch, ihr seid Eltern geworden! Für Erstausstattung (Kinderwagen, Bettchen, Wickeltisch) fallen Kosten an, gleichzeitig gibt es ab sofort 250 € staatliches Kindergeld monatlich.',
    category: 'FAMILY',
    minAge: 25,
    maxAge: 42,
    probability: 0.16,
    icon: 'Baby',
    requires: { hasPartner: true },
    choices: [
      {
        id: 'c_baby_smart_used',
        label: 'Ausstattung nachhaltig & gebraucht kaufen (-1.100 €)',
        description: 'Gebrauchte Marken-Kinderwagen und Second-Hand-Kleidung sparen über 60 % bei gleicher Qualität.',
        costImmediate: -1100,
        happinessDelta: 35,
        stressDelta: 10,
        knowledgeDelta: 20,
        learningTip:
          'Babys wachsen in den ersten Monaten rasend schnell. Gebrauchte Babyausstattung ist oft neuwertig, schont die Umwelt und spart tausende Euro.',
      },
      {
        id: 'c_baby_all_new_premium',
        label: 'Alles neu im Premium-Babyfachmarkt kaufen (-3.200 €)',
        description: 'Designerausstattung und modernste High-End-Federung.',
        costImmediate: -3200,
        happinessDelta: 40,
        stressDelta: 15,
        knowledgeDelta: 10,
        learningTip:
          'Die Gesamtkosten eines Kindes bis zum 18. Lebensjahr liegen in Deutschland statistisch bei ca. 150.000 bis 180.000 €. Frühe Rücklagen lohnen sich!',
      },
    ],
  },
  {
    id: 'EVT_EIGENBEDARF_EVICTION',
    title: 'Wohnungsnotfall: Eigenbedarfskündigung!',
    description:
      'Der Eigentümer deiner Mietwohnung kündigt wegen Eigenbedarfs für seine Tochter. Du musst innerhalb von 3 Monaten eine neue Wohnung finden und umziehen.',
    category: 'HOUSING',
    minAge: 23,
    maxAge: 44,
    probability: 0.1,
    icon: 'Home',
    excludes: { isHomeOwner: true },
    choices: [
      {
        id: 'c_evict_move_smart',
        label: 'Umzug mit Freunden & Notgroschen stemmen (-950 €)',
        description: 'Transporter mieten, Freunde packen an, Kaution wird zwischenfinanziert.',
        costImmediate: -950,
        happinessDelta: -10,
        stressDelta: 20,
        knowledgeDelta: 20,
        learningTip:
          'Mietrechtlicher Schutz: Kündigungsfristen prüfen und Mietkaution rechtzeitig zurückfordern. Der Notgroschen verhindert bei plötzlichen Umzügen Disposchulden!',
      },
      {
        id: 'c_evict_full_service',
        label: 'Professionelles Umzugsunternehmen beauftragen (-2.400 €)',
        description: 'Stressfreier Umzug ohne Kistenschleppen, dafür deutlich teurer.',
        costImmediate: -2400,
        happinessDelta: 5,
        stressDelta: 5,
        knowledgeDelta: 10,
        learningTip:
          'Umzugskosten aus beruflichen Gründen können in der Einkommensteuererklärung steuermindernd geltend gemacht werden.',
      },
    ],
  },
  {
    id: 'EVT_PROPERTY_ROOF_LEAK',
    title: 'Eigenheim-Instandhaltung: Dachabdichtung fällig',
    description:
      'Bei der jährlichen Dachinspektion stellt sich heraus: Mehrere Ziegel sind porös und die Dachrinne muss dringend saniert werden, um Folgeschäden zu verhindern. Kosten: 4.800 €.',
    category: 'HOUSING',
    minAge: 26,
    maxAge: 45,
    probability: 0.1,
    icon: 'Wrench',
    requires: { isHomeOwner: true },
    choices: [
      {
        id: 'c_roof_instandhaltungsruecklage',
        label: 'Aus der Instandhaltungsrücklage / Bausparer zahlen (-4.800 €)',
        description: 'Du hast monatlich Geld für das Haus zurückgelegt und zahlst die Rechnung ohne neue Kredite.',
        costImmediate: -4800,
        happinessDelta: 0,
        stressDelta: -5,
        knowledgeDelta: 25,
        learningTip:
          'Faustregel für Immobilienbesitzer: Mindestens 1,50 bis 2,50 € pro Quadratmeter Wohnfläche jeden Monat als Instandhaltungsrücklage zur Seite legen!',
      },
      {
        id: 'c_roof_bank_modernisierung',
        label: 'Modernisierungskredit über die Bank aufnehmen (+Rate)',
        description: 'Du finanzierst die Reparatur über einen Bankkredit zu 5,5 % Zinsen.',
        costImmediate: 0,
        monthlyCostDelta: 95,
        happinessDelta: -5,
        stressDelta: 15,
        knowledgeDelta: 15,
        learningTip:
          'Wer als Eigentümer keine Rücklagen bildet, muss jede Reparatur teuer über Nachfinanzierungen bezahlen.',
      },
    ],
  },
  {
    id: 'EVT_CAREER_LEADERSHIP_STEP',
    title: 'Karrieresprung: Beförderung zur Teamleitung!',
    description:
      'Deine Leistungen überzeugen die Geschäftsführung. Dir wird die Leitung deines Fachbereichs mit Führungsverantwortung für 6 Mitarbeiter angeboten (+500 €/Monat Netto, höhere Verantwortung).',
    category: 'CAREER',
    minAge: 27,
    maxAge: 44,
    probability: 0.12,
    icon: 'Award',
    choices: [
      {
        id: 'c_leader_accept',
        label: 'Führungsposition annehmen (+500 €/Mo Gehalt, +15 Stress)',
        description: 'Mehr Gestaltungsspielraum, strategische Verantwortung und dauerhaft höheres Gehalt.',
        costImmediate: 0,
        monthlyCostDelta: 0,
        happinessDelta: 25,
        stressDelta: 15,
        knowledgeDelta: 30,
        careerDelta: 1,
        learningTip:
          'Gehaltsverhandlungen und Führungsverantwortung steigern den Lebensstandard. Wichtig: Lifestyle-Inflation vermeiden und Sparquote parallel anheben!',
      },
      {
        id: 'c_leader_decline_worklife',
        label: 'Als Fachexperte bleiben (Fokus auf Work-Life-Balance)',
        description: 'Du behältst geregelte Arbeitszeiten und vermeidest Führungsstress.',
        costImmediate: 0,
        happinessDelta: 10,
        stressDelta: -10,
        knowledgeDelta: 10,
        learningTip:
          'Erfolg bedeutet nicht zwingend Management. Hohe Zufriedenheit und geringer Stress sind für viele Menschen mehr wert als ein Gehaltssprung.',
      },
    ],
  },
  {
    id: 'EVT_WATER_DAMAGE_NEIGHBOR',
    title: 'Schadensfall: Waschmaschinenschlauch geplatzt!',
    description:
      'Während du unterwegs warst, ist in deiner Wohnung der Zulaufschlauch der Waschmaschine geplatzt. Das Wasser ist durch die Decke in die Wohnung des Nachbarn darunter gelaufen und hat dessen teure Möbel und Parkett beschädigt (2.800 € Schaden).',
    category: 'INSURANCE_CLAIM',
    minAge: 19,
    maxAge: 40,
    probability: 0.08,
    icon: 'Droplet',
    choices: [
      {
        id: 'c_water_haftpflicht',
        label: 'Über Privathaftpflicht-Versicherung regulieren lassen',
        description: 'Deine Haftpflichtversicherung übernimmt die berechtigten Schadensersatzansprüche des Nachbarn.',
        costImmediate: -2800,
        requiresInsurance: 'HAFTPFLICHT',
        insuranceCoverageRate: 1.0,
        appliesDeductible: true,
        happinessDelta: 5,
        stressDelta: -15,
        knowledgeDelta: 25,
        learningTip:
          'Die Privathaftpflicht schützt vor unbegrenzter Haftung nach § 823 BGB! Ohne sie müsstest du den Schaden von 2.800 € komplett aus eigener Tasche zahlen.',
      },
      {
        id: 'c_water_pay_self',
        label: 'Schaden selbst zahlen (-2.800 €)',
        description: 'Ohne Haftpflichtversicherung musst du die Renovierungskosten des Nachbarn sofort aus deinem Vermögen zahlen.',
        costImmediate: -2800,
        happinessDelta: -25,
        stressDelta: 35,
        knowledgeDelta: 20,
        learningTip:
          'Ein einziger unversicherter Schaden kann Ersparnisse von Jahren vernichten. Die Haftpflicht ist die wichtigste Basisversicherung überhaupt!',
      },
    ],
  },
  {
    id: 'EVT_TRAVEL_HEALTH_EMERGENCY',
    title: 'Urlaubsnotfall: Krankenhausaufenthalt im Ausland',
    description:
      'Im Sommerurlaub stürzt du bei einer Wandertour und musst im örtlichen Privatkrankenhaus notfallmäßig genäht und geröntgt werden. Die Klinikrechnung beträgt 1.450 €.',
    category: 'INSURANCE_CLAIM',
    minAge: 18,
    maxAge: 45,
    probability: 0.09,
    icon: 'Plane',
    choices: [
      {
        id: 'c_travel_insurance',
        label: 'Über Auslandskrankenversicherung abrechnen',
        description: 'Deine Auslandskrankenversicherung übernimmt 100 % der Behandlungskosten.',
        costImmediate: -1450,
        requiresInsurance: 'AUSLANDSKRANKEN',
        insuranceCoverageRate: 1.0,
        happinessDelta: 10,
        stressDelta: -10,
        knowledgeDelta: 20,
        learningTip:
          'Eine Auslandskrankenversicherung kostet nur 10–20 € pro Jahr, übernimmt aber privatärztliche Notfallbehandlungen und den teuren Rücktransport nach Deutschland.',
      },
      {
        id: 'c_travel_pay_self',
        label: 'Kosten selbst tragen (Gesetzliche Kasse zahlt nur Bruchteil) (-1.100 €)',
        description: 'Die gesetzliche Krankenkasse erstattet nur deutsche Regelsätze, den Rest zahlst du selbst.',
        costImmediate: -1100,
        happinessDelta: -15,
        stressDelta: 20,
        knowledgeDelta: 15,
        learningTip:
          'Die Europäische Krankenversicherungskarte (EHIC) deckt oft nur unzureichende Notfallbehandlungen in staatlichen Kliniken ab – private Kliniken verlangen Vorkasse.',
      },
    ],
  },
  {
    id: 'EVT_PHONE_BROKEN',
    title: 'Smartphone-Malheur!',
    description:
      'Beim Fahrradfahren rutscht dir dein Smartphone aus der Tasche – das Display ist komplett zersplittert.',
    category: 'SURPRISE',
    minAge: 16,
    maxAge: 35,
    probability: 0.12,
    icon: 'Smartphone',
    choices: [
      {
        id: 'c_phone_repair',
        label: 'Display fachgerecht reparieren lassen (-160 €)',
        description: 'Spart Ressourcen und ist deutlich günstiger als ein Neukauf.',
        costImmediate: -160,
        happinessDelta: -5,
        stressDelta: 5,
        knowledgeDelta: 10,
        learningTip:
          'Reparieren statt Neukaufen schont Geldbeutel und Umwelt. Ausgaben dieser Art sollten aus dem Notgroschen bezahlt werden.',
      },
      {
        id: 'c_phone_new_flagship_cash',
        label: 'Neues Flagship-Smartphone bar kaufen (-650 €)',
        description: 'Du holst dir das neueste Modell direkt vom Ersparten.',
        costImmediate: -650,
        happinessDelta: 15,
        stressDelta: 5,
        knowledgeDelta: 5,
        learningTip:
          'Ein Barkauf verhindert Schulden, reduziert aber deine Barreserven erheblich.',
      },
    ],
  },
  {
    id: 'EVT_ACCIDENT_BIKE',
    title: 'Missgeschick: Fahrradsturz mit Sachschaden',
    description:
      'Du musst einem Fußgänger ausweichen und streifst dabei ein geparktes Luxusauto. Die Reparatur der Lackierung und des Spiegels kostet 1.200 €.',
    category: 'FINANCIAL',
    minAge: 17,
    maxAge: 40,
    probability: 0.08,
    icon: 'AlertTriangle',
    choices: [
      {
        id: 'c_bike_haftpflicht',
        label: 'Über Privathaftpflicht abwickeln (falls vorhanden)',
        description: 'Die Haftpflichtversicherung prüft und übernimmt den Schaden für dich.',
        costImmediate: -1200,
        requiresInsurance: 'HAFTPFLICHT',
        insuranceCoverageRate: 1.0,
        happinessDelta: 5,
        stressDelta: -10,
        knowledgeDelta: 20,
        learningTip:
          'Hier zeigt sich der enorme Wert einer Privathaftpflicht! Für nur 4–5 € im Monat schützt sie vor ruinösen Schadenersatzansprüchen.',
      },
      {
        id: 'c_bike_pay_self',
        label: 'Schaden aus eigener Tasche zahlen (-1.200 €)',
        description: 'Ohne Versicherung musst du die Summe sofort selbst begleichen.',
        costImmediate: -1200,
        happinessDelta: -20,
        stressDelta: 25,
        knowledgeDelta: 15,
        learningTip:
          'Ohne Haftpflichtversicherung haftest du im Ernstfall mit deinem gesamten aktuellen und zukünftigen Vermögen.',
      },
    ],
  },
  {
    id: 'EVT_HOLIDAY_JOB',
    title: 'Chancengelegenheit: Lukrativer Ferienjob',
    description:
      'Ein lokales Logistik- oder Gastronomieunternehmen sucht für die Ferienzeit flexible Aushilfen. Du könntest dir gutes Extrageld dazuverdienen.',
    category: 'CAREER',
    minAge: 16,
    maxAge: 22,
    probability: 0.15,
    icon: 'Briefcase',
    choices: [
      {
        id: 'c_job_accept_full',
        label: 'Volle 3 Wochen jobben (+900 €)',
        description: 'Du verzichtest auf freie Tage, sicherst dir aber ein sattes Startpolster.',
        costImmediate: 900,
        happinessDelta: 5,
        stressDelta: 15,
        knowledgeDelta: 15,
        learningTip:
          'Frühe Arbeitserfahrung bringt nicht nur Geld, sondern stärkt Verhandlungsgeschick und Arbeitsdisziplin.',
      },
      {
        id: 'c_job_relax',
        label: 'Ferien zur Erholung & Freizeit nutzen',
        description: 'Du entspannst dich mit Freunden und lädst deine Akkus auf.',
        costImmediate: 0,
        happinessDelta: 20,
        healthDelta: 10,
        stressDelta: -15,
        knowledgeDelta: 0,
        learningTip:
          'Erholung ist wichtig für die Gesundheit. Die richtige Balance zwischen Verdienst und Wohlbefinden ist entscheidend.',
      },
    ],
  },
  {
    id: 'EVT_DENTAL_SURGERY',
    title: 'Unerwartete Zahnbehandlung',
    description:
      'Der Zahnarzt stellt fest: Ein Backenzahn benötigt eine hochwertige Keramikkrone, die die gesetzliche Kasse nur zu einem kleinen Teil zahlt.',
    category: 'HEALTH',
    minAge: 20,
    maxAge: 45,
    probability: 0.09,
    icon: 'Smile',
    choices: [
      {
        id: 'c_dental_with_insurance',
        label: 'Mit Zahnzusatzversicherung abrechnen (-800 € Basis)',
        description: 'Deine Zahnzusatzversicherung übernimmt bis zu 85 % der Kosten.',
        costImmediate: -800,
        requiresInsurance: 'ZAHNZUSATZ',
        insuranceCoverageRate: 0.85,
        healthDelta: 10,
        happinessDelta: 5,
        stressDelta: -5,
        knowledgeDelta: 15,
        learningTip:
          'Zahnzusatzversicherungen federn hohe Einmalbelastungen ab. Wichtig: Achte auf Wartezeiten (meist 6–8 Monate vor Behandlungsbeginn).',
      },
      {
        id: 'c_dental_pay_self',
        label: 'Hochwertige Versorgung selbst zahlen (-800 €)',
        description: 'Du investierst in deine Zahngesundheit aus deinem Ersparten.',
        costImmediate: -800,
        healthDelta: 10,
        happinessDelta: -5,
        stressDelta: 10,
        knowledgeDelta: 10,
        learningTip:
          'Zahngesundheit ist langfristig unverzichtbar. Vorbeugung durch Zähneputzen und Prophylaxe spart bares Geld!',
      },
    ],
  },
  {
    id: 'EVT_INVESTMENT_HYPE',
    title: 'Hype am Kaffeetisch: „Die 1000%-Krypto-Chance“',
    description:
      'Ein Bekannter schwärmt dir von einem neuen spekulativen Coin vor und rät dir, dein gesamtes Erspartes sofort einzusetzen.',
    category: 'FINANCIAL',
    minAge: 18,
    maxAge: 45,
    probability: 0.1,
    icon: 'TrendingUp',
    choices: [
      {
        id: 'c_invest_diversified_etf',
        label: 'Abwinken und lieber auf weltweiten ETF setzen (+10 Pkt Wissen)',
        description: 'Du investierst breit gestreut in die weltweite Wirtschaft statt in Zockerei.',
        costImmediate: 0,
        knowledgeDelta: 25,
        happinessDelta: 5,
        stressDelta: -5,
        learningTip:
          'Goldene Finanzregel: Wer hohe Renditen ohne Risiko verspricht, verschweigt das Totalverlustrisiko. Breite Streuung (Diversifikation) schlägt Zockerei!',
      },
      {
        id: 'c_invest_fomo_gamble',
        label: 'Mit 400 € Spielgeld einsteigen (Spekulation)',
        description: 'Du riskierst einen Teil deines Geldes im Spekulationsmarkt.',
        costImmediate: -400,
        knowledgeDelta: 10,
        happinessDelta: -5,
        stressDelta: 15,
        learningTip:
          'Spekulationen sollten nie mit lebensnotwendigem Geld oder dem Notgroschen erfolgen.',
      },
    ],
  },
  {
    id: 'EVT_SURPRISE_UTILITY_BILL',
    title: 'Unerwartete Nebenkostenabrechnung',
    description:
      'Wegen gestiegener Heiz- und Energiekosten fordert der Vermieter eine Nachzahlung von 420 €.',
    category: 'FINANCIAL',
    minAge: 19,
    maxAge: 45,
    probability: 0.13,
    icon: 'Receipt',
    choices: [
      {
        id: 'c_utility_pay_emergency',
        label: 'Aus dem Notgroschen / Tagesgeld bezahlen (-420 €)',
        description: 'Genau für solche Fälle hast du deinen Notgroschen aufgebaut!',
        costImmediate: -420,
        happinessDelta: 0,
        stressDelta: 0,
        knowledgeDelta: 15,
        learningTip:
          'Perfektes Beispiel für den Notgroschen: Er verhindert, dass unvorhergesehene Rechnungen dein Girokonto ins Minus reißen.',
      },
      {
        id: 'c_utility_pay_giro_dispo',
        label: 'Vom Girokonto abbuchen lassen (Gefahr Dispo!)',
        description: 'Wenn das Konto nicht gedeckt ist, greift der teure Dispositionskredit.',
        costImmediate: -420,
        happinessDelta: -10,
        stressDelta: 15,
        knowledgeDelta: 10,
        learningTip:
          'Monatliche Fixkosten wie Energie können schwanken. Eine monatliche Sparquote federt Nachzahlungen stressfrei ab.',
      },
    ],
  },
];
