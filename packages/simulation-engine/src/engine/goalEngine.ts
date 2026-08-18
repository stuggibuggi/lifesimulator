import { GameState, LifeGoal } from '@goal/shared-types';
import { calculateEmergencyFundMonths, calculateNetWorth } from '../math/finance';

/**
 * Überprüft und aktualisiert den Fortschritt der gewählten Lebensziele
 */
export function updateGoalsProgress(state: GameState): LifeGoal[] {
  const netWorth = calculateNetWorth(
    state.bankAccount,
    state.savingsAccount,
    state.investmentAccount,
    state.loans,
    state.housing,
    state.bausparContracts
  );

  const emergencyMonths = calculateEmergencyFundMonths(
    state.savingsAccount.tagesgeldBalance,
    state.budget.totalFixedExpenses,
    state.budget.totalVariableExpenses
  );

  return state.goals.map((goal) => {
    let currentVal = goal.currentValue;
    let isAchieved = goal.isAchieved;

    switch (goal.id) {
      case 'GOAL_AUSBILDUNG':
        if (state.career.type === 'AUSBILDUNG' && state.career.isCompleted) {
          isAchieved = true;
          currentVal = 1;
        } else if (state.career.type === 'AUSBILDUNG') {
          currentVal = Math.min(1, state.career.currentYear / Math.max(1, state.career.durationYears));
        }
        break;

      case 'GOAL_STUDIUM':
        if (state.career.type === 'STUDIUM' && state.career.isCompleted) {
          isAchieved = true;
          currentVal = 1;
        } else if (state.career.type === 'STUDIUM') {
          currentVal = Math.min(1, state.career.currentYear / Math.max(1, state.career.durationYears));
        }
        break;

      case 'GOAL_NOTGROSCHEN':
        currentVal = emergencyMonths;
        if (emergencyMonths >= goal.targetValue) {
          isAchieved = true;
        }
        break;

      case 'GOAL_SCHULDENFREI':
        // Konsumkredite, Dispo, BNPL zählen als Schulden, Immobiliendarlehen sind Sachwertfinanzierung
        const hasBadDebt =
          state.loans.some((l) => l.type !== 'IMMOBILIENDARLEHEN' && l.principalRemaining > 0) ||
          state.bankAccount.giroBalance < 0;
        currentVal = hasBadDebt ? 0 : 1;
        isAchieved = !hasBadDebt;
        break;

      case 'GOAL_EIGENE_WOHNUNG':
        if (state.housing.type !== 'PARENTS') {
          isAchieved = true;
          currentVal = 1;
        }
        break;

      case 'GOAL_EIGENHEIM':
        if (state.housing.type === 'PROPERTY_OWNERSHIP') {
          isAchieved = true;
          currentVal = 1;
        }
        break;

      case 'GOAL_BAUSPARER':
        const allottedBausparer = (state.bausparContracts || []).filter((b) => b.isAllotted);
        currentVal = allottedBausparer.length;
        if (allottedBausparer.length > 0) {
          isAchieved = true;
        }
        break;

      case 'GOAL_FAMILIE':
        if (state.family.status === 'MARRIED' || state.family.childrenCount > 0) {
          isAchieved = true;
          currentVal = 1;
        }
        break;

      case 'GOAL_AUTO':
        if (
          state.activeMobility === 'CAR_CASH' ||
          state.activeMobility === 'CAR_FINANCED' ||
          state.activeMobility === 'CAR_LEASING'
        ) {
          isAchieved = true;
          currentVal = 1;
        }
        break;

      case 'GOAL_REISEN':
        const travelEvents = state.pastEvents.filter((e) =>
          e.choiceId.includes('travel') || e.choiceId.includes('trip') || e.eventId.includes('TRAVEL')
        );
        currentVal = travelEvents.length;
        if (currentVal >= goal.targetValue) {
          isAchieved = true;
        }
        break;

      case 'GOAL_VERMOEGEN_10K':
        currentVal = Math.max(0, netWorth);
        if (netWorth >= 10000) {
          isAchieved = true;
        }
        break;

      case 'GOAL_VERMOEGEN_50K':
        currentVal = Math.max(0, netWorth);
        if (netWorth >= 50000) {
          isAchieved = true;
        }
        break;

      default:
        break;
    }

    return {
      ...goal,
      currentValue: Math.round(currentVal * 100) / 100,
      isAchieved,
    };
  });
}
