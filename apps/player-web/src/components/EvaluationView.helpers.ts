export function formatEvaluationTitle(endAge: number): string {
  return `Abschlussbilanz mit ${endAge} Jahren`;
}

export function formatSaveFilename(name: string, age: number): string {
  return `GOAL_Lebenslauf_${name}_Alter${age}.json`;
}
