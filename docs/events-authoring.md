# Events Authoring

## Content Validation

Phase D adds a lightweight validator for static game content. It is not a CMS; it only checks content contracts that commonly break event authoring:

- life-event ids are unique
- scenario ids are unique
- life-event `icon` values are supported by `EventModal`
- every scenario `recommendedGoals` entry points to an existing goal id

Run it before adding or changing events, scenarios, or goals:

```bash
npm run content:validate
```

If validation fails, fix the reported content ids or icon names before shipping the content change.
# Event Authoring

Lebensereignisse werden in `packages/game-content/src/events.ts` als `LifeEvent` gepflegt. Neben Alter, Wahrscheinlichkeit und bereits entschiedenen Events kann ein Event optionale Eligibility-Regeln definieren.

## Eligibility-Regeln

`requires` beschreibt Bedingungen, die erfüllt sein müssen. `excludes` beschreibt Zustände, in denen ein Event nicht erscheinen darf.

```ts
requires?: {
  hasHaftpflicht?: boolean;
  hasPartner?: boolean;
  isHomeOwner?: boolean;
  minEmergencyMonths?: number;
};
excludes?: {
  hasHaftpflicht?: boolean;
  hasPartner?: boolean;
  isHomeOwner?: boolean;
  minEmergencyMonths?: number;
};
```

Die Regeln werden aus dem echten Spielzustand abgeleitet:

- `hasHaftpflicht`: aktive Versicherung mit `type === 'HAFTPFLICHT'`
- `hasPartner`: `family.status` ist nicht `SINGLE`
- `isHomeOwner`: `housing.type === 'PROPERTY_OWNERSHIP'`
- `minEmergencyMonths`: `savingsAccount.tagesgeldBalance` geteilt durch fixe und variable Monatsausgaben

## Beispiele

Ein Eigentümer-Event:

```ts
{
  id: 'EVT_PROPERTY_ROOF_LEAK',
  // ...
  requires: { isHomeOwner: true },
}
```

Ein Mieter-Event, das für Eigentümer ausgeschlossen wird:

```ts
{
  id: 'EVT_EIGENBEDARF_EVICTION',
  // ...
  excludes: { isHomeOwner: true },
}
```

## Altersabdeckung 46-67

Midlife- und Vorruhestandsereignisse sollen die Altersspanne nach der frühen Familien- und Karrierephase abdecken. Für die aktuelle Abdeckung gelten diese festen Event-IDs:

- `EVT_MIDLIFE_JOB_CHANGE`: 45-55, Karrierewechsel oder Weiterbildung.
- `EVT_PARENT_CARE`: 48-60, Pflegeorganisation in der Familie.
- `EVT_INHERITANCE_MODEST`: 50-65, moderates Erbe und Umgang mit Einmalzahlungen.
- `EVT_HEALTH_CHECK_50`: 49-55, Gesundheitsvorsorge um den 50. Geburtstag.
- `EVT_PRE_RETIREMENT_BAV`: 55-64, betriebliche Altersvorsorge und Rentenlücke.
- `EVT_RETIREMENT_TRANSITION`: 65-67, Ruhestandsübergang mit hoher Trigger-Wahrscheinlichkeit.

## Richtlinien

- Nutze Regeln nur, wenn die Story des Events sonst unplausibel wäre.
- Behalte Choice-spezifische Versicherungslogik weiterhin an der Choice (`requiresInsurance`), wenn nur eine einzelne Entscheidung Versicherungsschutz nutzt.
- Setze `minEmergencyMonths` nur ein, wenn das Event ausdrücklich eine vorhandene Notfallrücklage voraussetzt.
- Neue Regeltypen sollen zuerst am `GameState` geprüft und mit Tests in `packages/simulation-engine/test/events.test.ts` abgesichert werden.
