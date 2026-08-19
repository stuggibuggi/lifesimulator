import { EDUCATIONAL_SCENARIOS } from '@goal/game-content';
import type { EducationalScenario } from '@goal/shared-types';

export type ClassroomJoinNextStep =
  | { type: 'IMPORT_CLOUD' }
  | { type: 'START_SCENARIO'; scenario: EducationalScenario }
  | { type: 'OPEN_SCENARIO_PICKER' };

export function getEducationalScenarioById(scenarioId?: string | null): EducationalScenario | null {
  if (!scenarioId) return null;
  return EDUCATIONAL_SCENARIOS.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function getEducationalScenarioTitle(scenarioId?: string | null): string | null {
  return getEducationalScenarioById(scenarioId)?.title ?? null;
}

export function normalizeClassroomCharacterName(alias: string, characterName: string): string {
  const explicitName = characterName.trim().slice(0, 40);
  if (explicitName) return explicitName;

  const aliasName = alias.trim().slice(0, 40);
  return aliasName || 'Alex';
}

export function resolveClassroomJoinNextStep({
  hasCloudGameState,
  scenarioId,
}: {
  hasCloudGameState: boolean;
  scenarioId?: string | null;
}): ClassroomJoinNextStep {
  if (hasCloudGameState) return { type: 'IMPORT_CLOUD' };

  const scenario = getEducationalScenarioById(scenarioId);
  if (scenario) return { type: 'START_SCENARIO', scenario };

  return { type: 'OPEN_SCENARIO_PICKER' };
}
