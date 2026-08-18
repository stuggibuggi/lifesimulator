# GOAL – Lebenssimulationsspiel für Schüler

Ein interaktives, pädagogisch fundiertes Lebenssimulationsspiel für Schüler im Alter von 13–18 Jahren.

Im Spiel durchlaufen Schüler ihr Leben im Zeitraffer von **Alter 16 bis 67** (Unterrichtsszenarien kürzer) und treffen fundamentale Lebens- und Finanzentscheidungen zu Beruf, Bildung, Budget, Sparen, Versicherungen, Krediten, Wohnen, Familie, Steuern und Altersvorsorge.

> **Zentraler pädagogischer Leitsatz:**  
> *Nicht die Person mit dem höchsten Vermögen gewinnt automatisch, sondern wer seine individuellen Lebensziele ausgewogen erreicht und dabei finanziell handlungsfähig, angemessen abgesichert, gesund und zufrieden bleibt.*

---

## Grafischer Stil

Das Spiel ist im **gemütlichen isometrischen Pastell- / Slice-of-Life-Stil** gestaltet:
- Warme Cremetöne, sanftes Matchagrün und Sakura-Elemente.
- Interaktive Stadtkarte mit Zuhause, Campus, Arbeitsplatz, Sparkasse, Versicherungen, Markt und Park.
- Audio über die HTML5 Web Audio API (keine externen Audio-Dateien).

---

## Architektur & Monorepo

```text
Lebenssimulator/
├── packages/
│   ├── shared-types/        # Domänenmodelle
│   ├── simulation-engine/   # Monatsschritte, Zinsen, PRNG (UI-unabhängig)
│   ├── game-content/        # Ziele, Berufe, Ereignisse, Lernkarten
│   └── scoring-engine/      # Abschlussbewertung
├── apps/
│   ├── player-web/          # React 19 + Vite + Tailwind
│   └── api/                 # Node.js API für Klassenmodus (MariaDB)
├── package.json
└── README.md
```

Die Simulation läuft **im Browser**. Die API speichert nur Identitäten, Räume und Spielstände (MariaDB auf Plesk).

---

## Schnellstart

### Voraussetzungen
- Node.js >= 18 (empfohlen: 20+)
- npm >= 9

```bash
npm install
npm run dev
```

Öffne [http://localhost:5174](http://localhost:5174).

```bash
npm run test
npm run build
```

### API (Klassenmodus, optional)

```bash
npm run dev:api
```

Benötigt MariaDB und eine `.env` in `apps/api` (siehe `apps/api/.env.example`).

---

## Spielfunktionen

1. **Charakter & Startbedingungen** – Avatare und familiäre/regionale Startlagen.
2. **Lebensziele** – 11 Ziele; Schüler wählen und priorisieren 3–5.
3. **Bildung & Karriere** – Ausbildung, Studium, Quereinstieg.
4. **Monatssimulation** – 16–67 (oder Szenario-`endAge`), Play/Pause, 1x/2x/5x.
5. **Ereignisse** mit Lernhinweisen; Kontoauszug in der Sparkasse.
6. **Versicherungen, Wohnen, Familie, Steuern, Rente (bAV).**
7. **Speichern** – `localStorage` + JSON-Export; optional Cloud-Save über die API.
8. **Abschlussbewertung** – Note A+–F, Gewichte: Ziele 30 %, Stabilität 25 %, Schutz 15 %, Gesundheit / Zufriedenheit / Wissen je 10 %.

---

## Plesk / Produktion

1. Frontend: `npm run build` → Document Root auf `apps/player-web/dist`.
2. MariaDB-Datenbank in Plesk anlegen.
3. API als Node-App (`apps/api`), Startdatei `app.js`, Env mit `DATABASE_URL` / MariaDB-Zugangsdaten.
4. CORS auf die Spiel-Domain beschränken.
