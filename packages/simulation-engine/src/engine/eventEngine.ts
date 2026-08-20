import {
  EventChoice,
  GameState,
  InsuranceContract,
  LifeEvent,
  LifeEventEligibilityRules,
  TransactionRecord,
} from '@goal/shared-types';
import { CAREER_ACTION_CONSTANTS } from '@goal/game-content';
import { SeededRandom } from '../math/random';
import { calculateEmergencyFundMonths } from '../math/finance';
import { refreshCareerPayroll } from './careerContracts';

/**
 * Filtert Ereignisse, die für das aktuelle Alter und den aktuellen Lebenszustand infrage kommen
 */
export function getEligibleEvents(
  allEvents: LifeEvent[],
  state: GameState
): LifeEvent[] {
  const pastEventIds = new Set(state.pastEvents.map((e) => e.eventId));

  return allEvents.filter((event) => {
    // Altersgrenzen
    if (state.currentAge < event.minAge || state.currentAge > event.maxAge) {
      return false;
    }

    // Bereits getroffene Entscheidungen nicht erneut vorlegen
    if (pastEventIds.has(event.id)) {
      return false;
    }

    if (event.requires && !matchesEventRules(event.requires, state)) {
      return false;
    }

    if (event.excludes && matchesEventRules(event.excludes, state)) {
      return false;
    }

    return true;
  });
}

function matchesEventRules(
  rules: LifeEventEligibilityRules | undefined,
  state: GameState
): boolean {
  if (!rules) {
    return true;
  }

  const hasHaftpflicht = state.insurances.some(
    (insurance) => insurance.type === 'HAFTPFLICHT' && insurance.isActive
  );
  const hasPartner = state.family.status !== 'SINGLE';
  const isHomeOwner = state.housing.type === 'PROPERTY_OWNERSHIP';
  const emergencyMonths = calculateEmergencyFundMonths(
    state.savingsAccount.tagesgeldBalance,
    state.budget.totalFixedExpenses,
    state.budget.totalVariableExpenses
  );

  if (rules.hasHaftpflicht !== undefined && rules.hasHaftpflicht !== hasHaftpflicht) {
    return false;
  }

  if (rules.hasPartner !== undefined && rules.hasPartner !== hasPartner) {
    return false;
  }

  if (rules.isHomeOwner !== undefined && rules.isHomeOwner !== isHomeOwner) {
    return false;
  }

  if (rules.minEmergencyMonths !== undefined && emergencyMonths < rules.minEmergencyMonths) {
    return false;
  }

  return true;
}

/**
 * Wählt anhand der Wahrscheinlichkeiten und des PRNGs ein Event aus, falls eines triggert.
 */
export function checkAndTriggerEvent(
  allEvents: LifeEvent[],
  state: GameState,
  rng: SeededRandom
): LifeEvent | null {
  if (state.activeEvent || state.isGameOver) {
    return null; // Kein Event bei Game Over oder bereits aktivem Event
  }

  // Grace Period: Keine Zufallsschocks in den ersten 4 Monaten des Spiels (Eingewöhnungszeit)
  if (state.currentAge === 16 && state.currentMonth <= 4) {
    return null;
  }

  // Bestimmte Meilenstein-Events mit 100% Wahrscheinlichkeit bei bestimmten Altern
  if (state.currentAge === 18 && state.currentMonth === 1) {
    const turning18 = allEvents.find((e) => e.id === 'EVT_AGE_18_MILESTONE');
    if (turning18 && !state.pastEvents.some((p) => p.eventId === turning18.id)) {
      return turning18;
    }
  }

  const eligible = getEligibleEvents(allEvents, state);
  if (eligible.length === 0) return null;

  for (const event of eligible) {
    // Wahrscheinlichkeit pro Monat prüfen
    if (rng.chance(event.probability)) {
      return event;
    }
  }

  return null;
}

/**
 * Wendet die getroffene Entscheidung eines Spielers auf den Spielzustand an
 */
export function applyEventChoice(
  state: GameState,
  event: LifeEvent,
  choice: EventChoice
): GameState {
  let netCost = choice.costImmediate;
  let insurancePaid = 0;

  // Prüfen, ob eine passende Versicherung greift
  if (choice.requiresInsurance && netCost < 0) {
    const matchingInsurance = state.insurances.find(
      (ins) => ins.type === choice.requiresInsurance && ins.isActive
    );

    if (matchingInsurance) {
      const damageAmount = Math.abs(netCost);
      const coverageRate = choice.insuranceCoverageRate ?? 0.8;
      const coveredAmount =
        Math.min(damageAmount, matchingInsurance.coverageLimit) * coverageRate;
      const deductible = matchingInsurance.deductible;

      // Spieler zahlt nur Selbstbeteiligung + nicht gedeckten Rest
      const playerOutOfPocket = Math.min(
        damageAmount,
        deductible + (damageAmount - coveredAmount)
      );
      insurancePaid = damageAmount - playerOutOfPocket;
      netCost = -playerOutOfPocket;
    }
  }

  // Kontostand anpassen
  const updatedGiro = state.bankAccount.giroBalance + netCost;

  // Transaktion erfassen
  const tx: TransactionRecord = {
    id: `tx_evt_${Date.now()}_${rngHelper()}`,
    age: state.currentAge,
    year: state.currentYear,
    month: state.currentMonth,
    amount: netCost,
    category: 'Ereignis',
    description: `${event.title}: ${choice.label}${
      insurancePaid > 0 ? ` (Versicherung übernahm ${Math.round(insurancePaid)} €)` : ''
    }`,
    isAutomatic: false,
  };

  // Metriken anpassen
  const updatedMetrics = {
    health: Math.min(100, Math.max(0, state.metrics.health + (choice.healthDelta ?? 0))),
    happiness: Math.min(100, Math.max(0, state.metrics.happiness + (choice.happinessDelta ?? 0))),
    stress: Math.min(100, Math.max(0, state.metrics.stress + (choice.stressDelta ?? 0))),
    freeTimeHoursWeekly: Math.max(0, state.metrics.freeTimeHoursWeekly),
    knowledgePoints: Math.min(
      100,
      Math.max(0, state.metrics.knowledgePoints + (choice.knowledgeDelta ?? 5))
    ),
  };

  // Fixkosten oder Budget anpassen, falls monatliche Delta vorhanden
  const updatedBudget = { ...state.budget };
  if (choice.monthlyCostDelta) {
    updatedBudget.totalVariableExpenses = Math.max(
      0,
      updatedBudget.totalVariableExpenses + choice.monthlyCostDelta
    );
  }

  let result: GameState = {
    ...state,
    bankAccount: {
      ...state.bankAccount,
      giroBalance: Math.round(updatedGiro * 100) / 100,
    },
    budget: updatedBudget,
    metrics: updatedMetrics,
    activeEvent: null,
    isPaused: true,
    pastEvents: [
      ...state.pastEvents,
      {
        eventId: event.id,
        eventTitle: event.title,
        choiceId: choice.id,
        choiceLabel: choice.label,
        age: state.currentAge,
        month: state.currentMonth,
        financialImpact: netCost,
      },
    ],
    transactions: [tx, ...state.transactions].slice(0, 100),
  };

  if (result.career.type === 'ANGESTELLTER' && choice.careerDelta && choice.careerDelta > 0) {
    const delta = choice.careerDelta;
    const factor = CAREER_ACTION_CONSTANTS.careerDeltaGrossFactor;
    const newFullTimeGross = Math.round(
      result.career.fullTimeGrossSalary * Math.pow(factor, delta)
    );
    const newLevel = Math.min(
      CAREER_ACTION_CONSTANTS.maxAdvancementLevel,
      result.career.careerAdvancementLevel + delta
    );
    result = refreshCareerPayroll(result, {
      ...result.career,
      careerAdvancementLevel: newLevel,
      fullTimeGrossSalary: newFullTimeGross,
    });
  }

  return result;
}

function rngHelper(): string {
  return Math.random().toString(36).substring(2, 7);
}
