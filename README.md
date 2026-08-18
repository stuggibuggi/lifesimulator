# GOAL – KI-gestütztes Lebenssimulationsspiel für Schüler

Ein interaktives, pädagogisch fundiertes und grafisch ansprechendes Lebenssimulationsspiel für Schüler im Alter von 13–18 Jahren.

Im Spiel durchlaufen Schüler ihr Leben im Zeitraffer von **Alter 16 bis 30** (Release 0.1) und treffen fundamentale Lebens- und Finanzentscheidungen zu Beruf, Bildung, monatlichem Budget, Sparen, Notgroschen, Versicherungen, Krediten und persönlichen Lebenszielen.

> **Zentraler pädagogischer Leitsatz:**  
> *Nicht die Person mit dem höchsten Vermögen gewinnt automatisch, sondern wer seine individuellen Lebensziele ausgewogen erreicht und dabei finanziell handlungsfähig, angemessen abgesichert, gesund und zufrieden bleibt.*

---

## 🎨 Grafischer Stil

Das Spiel ist im **gemütlichen isometrischen Pastell-Anime- / Slice-of-Life-Stil** gestaltet (angelehnt an japanische Lebenssimulatoren wie *Tsuki's Odyssey* & *Japanese Rural Life Adventure*):
- Warme Cremetöne, sanftes Matchagrün und Sakura-Kirschblüten-Elemente.
- Interaktive isometrische Stadtkarte mit Zuhause, Campus/Schule, Arbeitsplatz, Sparkasse, Schutzbüro (Versicherungen), Marktplatz und Schrein-Park.
- Charmante Audio-Synthese über die HTML5 Web Audio API (keine externen Audio-Dateien notwendig).

---

## 🏗️ Architektur & Monorepo-Struktur

Das Projekt ist modular als npm-Workspaces-Monorepo aufgebaut. Der Simulationskern ist **vollkommen unabhängig** von React oder der Benutzeroberfläche und deterministisch über einen Seed testbar.

```text
Lebenssimulator/
├── packages/
│   ├── shared-types/        # Zentrale TypeScript-Typen & Domänenmodelle
│   ├── simulation-engine/   # Unabhängiger Simulationskern (Monatsschritte, Zinsen, PRNG)
│   ├── game-content/        # Datengetriebene Inhalte (Ziele, Berufe, Ereignisse, Lernkarten)
│   └── scoring-engine/      # Mehrdimensionale Lebensabschlussbewertung
├── apps/
│   └── player-web/          # React 19 + TypeScript + Vite + TailwindCSS
├── docs/                    # Architekturentscheidungen & Dokumentation
└── package.json             # Root Monorepo
```

---

## 🚀 Schnellstart & Installation

### Voraussetzungen
- Node.js >= 18.0.0 (empfohlen: Node.js 20+)
- npm >= 9.0.0

### 1. Abhängigkeiten installieren
```bash
npm install
```

### 2. Entwicklungsserver starten
```bash
npm run dev
```
Öffne anschließend [http://localhost:5173](http://localhost:5173) im Browser.

### 3. Automatisierte Tests ausführen
```bash
npm run test
```

### 4. Produktions-Build erstellen
```bash
npm run build
```

---

## 🎮 Enthaltene Spielfunktionen (Release 0.1 / Phase 0 & 1)

1. **Charaktererstellung & Startbedingungen**:
   - 4 Anime-Avatare (Leo, Mia, Sam, Kim)
   - 4 Startbedingungen (Familienunterstützung, Selbstständiger Start, Großstadt, Land) mit unterschiedlichem Startkapital und Taschengeld.

2. **Lebensziel-Auswahl & Priorisierung**:
   - 8 ausbalancierte Ziele (Ausbildung, Studium, Notgroschen, Schuldenfreiheit, Eigene Wohnung, Erstes Auto, Reisen, 10.000 € Vermögen).
   - Schüler wählen 3 bis 5 Ziele und priorisieren diese (Prio 1 bis 5).

3. **Bildungs- und Karrierewahl**:
   - Duale Berufsausbildung (3 Jahre, Ausbildungsvergütung, anschl. Gehaltssprung).
   - Bachelor-Studium (3,5 Jahre, BAföG/Werkstudent, anschl. höheres Einstiegsgehalt).
   - Direkter Berufseinstieg / Quereinstieg.

4. **Monatliche Finanzsimulation**:
   - 12 Monate pro Jahr, Alter 16 bis 30.
   - Steuerung: Play, Pause, Geschwindigkeiten (1x, 2x, 5x), Einzelschritte (+1 Monat, +1 Jahr).
   - 50-30-20 Monatsbudget (Einnahmen, Fixkosten, Freizeit, Sparen, Netto-Cashflow).
   - Dispositionskredit (11,5 % p. a.) & Notgroschen-Tagesgeld (2,5 % p. a.).

5. **Interaktive Lebensereignisse & Dilemmata**:
   - 10+ geschriebene Ereignisse mit echten Wahlmöglichkeiten (Displaybruch, Ferienjob, Fahrradunfall, Autokauf, Zahnbehandlung, Weiterbildung, Hype-Spekulation).
   - Jede Wahl enthält einen **didaktischen Merksatz (Lernhinweis)** für Schüler.

6. **Vertragsordner & Versicherungen**:
   - Privathaftpflicht, Berufsunfähigkeit, Zahnzusatz, Hausrat, KFZ.
   - Live-Kosten- und Leistungsvergleich mit Erklärung existenzbedrohender Risiken.

7. **Speichern & Laden**:
   - Automatisches Speichern im Browser (`localStorage`).
   - JSON-Export und -Import für Unterrichtszwecke.

8. **Abschlussbewertung mit 30 Jahren**:
   - Mehrdimensionale Note (A+ bis F) und Score (0–100).
   - 6 Bewertungsdimensionen (Ziele 30 %, Stabilität 20 %, Schutz 15 %, Gesundheit 15 %, Zufriedenheit 10 %, Wissen 10 %).
   - „Was wäre, wenn...?“ – Alternative Zeitlinienvergleiche.
   - Didaktische Handlungsempfehlungen.
