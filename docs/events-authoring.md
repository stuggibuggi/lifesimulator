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

## Richtlinien

- Nutze Regeln nur, wenn die Story des Events sonst unplausibel wäre.
- Behalte Choice-spezifische Versicherungslogik weiterhin an der Choice (`requiresInsurance`), wenn nur eine einzelne Entscheidung Versicherungsschutz nutzt.
- Setze `minEmergencyMonths` nur ein, wenn das Event ausdrücklich eine vorhandene Notfallrücklage voraussetzt.
- Neue Regeltypen sollen zuerst am `GameState` geprüft und mit Tests in `packages/simulation-engine/test/events.test.ts` abgesichert werden.
