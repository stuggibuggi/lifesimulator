import { describe, expect, it } from 'vitest';
import {
  abortEducationPath,
  changeEmployedJob,
  createInitialGameState,
  requestSalaryRaise,
  SeededRandom,
  setEmploymentHours,
  startFurtherTraining,
  stepSimulationMonth,
} from '../src';
import {
  ALL_LIFE_EVENTS,
  ALL_LIFE_GOALS,
  CAREER_OPTIONS,
  JOB_SWITCH_OPTIONS,
} from '@goal/game-content';

function employedState() {
  const base = createInitialGameState(
    { name: 'Alex', avatar: 'student_boy', startCondition: 'FAMILY_SUPPORT', bio: 'T' },
    [ALL_LIFE_GOALS[0]],
    42
  );
  return {
    ...base,
    currentMonth: 12,
    career: {
      ...base.career,
      type: 'ANGESTELLTER' as const,
      title: 'Fachkraft',
      branch: 'IT',
      isCompleted: true,
      monthlySalaryGross: 3000,
      monthlySalaryNet: 2100,
      fullTimeGrossSalary: 3000,
      timeCommitmentHoursWeekly: 40,
      careerAdvancementLevel: 1,
      monthsSinceLastRaiseAttempt: 5,
      monthsSinceLastTraining: 10,
      monthsSinceLastJobSwitch: 12,
    },
  };
}

describe('career month counters', () => {
  it('increments raise and training month counters each month', () => {
    const before = employedState();
    before.currentMonth = 3;
    before.career.monthsSinceLastJobSwitch = 10;
    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));
    expect(nextState.career.monthsSinceLastRaiseAttempt).toBe(6);
    expect(nextState.career.monthsSinceLastTraining).toBe(11);
    expect(nextState.career.monthsSinceLastJobSwitch).toBe(11);
  });

  it('applies year-end raise to fullTimeGrossSalary', () => {
    const before = employedState();
    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));
    expect(nextState.career.fullTimeGrossSalary).toBe(Math.round(3000 * 1.025));
    expect(nextState.career.monthlySalaryGross).toBe(Math.round(3000 * 1.025));
  });

  it('applies year-end raise to FTE before scaling 30h gross', () => {
    const before = employedState();
    before.career.timeCommitmentHoursWeekly = 30;
    before.career.monthlySalaryGross = Math.round((3000 * 30) / 40);

    const { nextState } = stepSimulationMonth(before, ALL_LIFE_EVENTS, new SeededRandom(1));

    const expectedFte = Math.round(3000 * 1.025);
    expect(nextState.career.fullTimeGrossSalary).toBe(expectedFte);
    expect(nextState.career.monthlySalaryGross).toBe(Math.round((expectedFte * 30) / 40));
  });
});

describe('career action contracts', () => {
  it('soft raise increases FTE by 2% and starts cooldown', () => {
    const before = employedState();
    before.career.monthsSinceLastRaiseAttempt = 12;

    const { state, result } = requestSalaryRaise(before, 'soft', { next: () => 0.99 });

    expect(result).toMatchObject({ ok: true, kind: 'soft', mode: 'soft' });
    expect(state.career.fullTimeGrossSalary).toBe(3060);
    expect(state.career.monthlySalaryGross).toBe(3060);
    expect(state.career.monthsSinceLastRaiseAttempt).toBe(0);
    expect(state.budget.grossSalary).toBe(state.career.monthlySalaryGross);
    expect(state.budget.netSalary).toBe(state.career.monthlySalaryNet);
  });

  it('blocks raise during cooldown', () => {
    const before = employedState();
    before.career.monthsSinceLastRaiseAttempt = 11;

    const { state, result } = requestSalaryRaise(before, 'soft', { next: () => 0 });

    expect(result).toMatchObject({ ok: false, reason: 'cooldown' });
    expect(state).toBe(before);
  });

  it('hard raise success uses low rng roll', () => {
    const before = employedState();
    before.career.monthsSinceLastRaiseAttempt = 12;

    const { state, result } = requestSalaryRaise(before, 'hard', { next: () => 0 });

    expect(result).toMatchObject({ ok: true, kind: 'hard_success', mode: 'hard' });
    expect(state.career.fullTimeGrossSalary).toBe(3240);
    expect(state.career.monthlySalaryGross).toBe(3240);
    expect(state.career.monthsSinceLastRaiseAttempt).toBe(0);
  });

  it('hard raise fail bumps stress', () => {
    const before = employedState();
    before.career.monthsSinceLastRaiseAttempt = 12;

    const { state, result } = requestSalaryRaise(before, 'hard', { next: () => 0.99 });

    expect(result).toMatchObject({ ok: true, kind: 'hard_fail', mode: 'hard' });
    expect(state.career.fullTimeGrossSalary).toBe(3000);
    expect(state.metrics.stress).toBe(before.metrics.stress + 12);
    expect(state.career.monthsSinceLastRaiseAttempt).toBe(0);
  });

  it('part-time 30h scales gross to 75%', () => {
    const before = employedState();

    const state = setEmploymentHours(before, 30);

    expect(state.career.timeCommitmentHoursWeekly).toBe(30);
    expect(state.career.fullTimeGrossSalary).toBe(3000);
    expect(state.career.monthlySalaryGross).toBe(2250);
    expect(state.metrics.stress).toBe(before.metrics.stress - 6);
    expect(state.metrics.happiness).toBe(before.metrics.happiness + 4);
  });

  it('job switch applies factor and cost', () => {
    const before = employedState();
    before.bankAccount.giroBalance = 2000;
    before.career.monthsSinceLastJobSwitch = 12;
    const option = JOB_SWITCH_OPTIONS[0];

    const state = changeEmployedJob(before, option.id);

    expect(state.career.title).toBe(option.title);
    expect(state.career.branch).toBe(option.branch);
    expect(state.career.fullTimeGrossSalary).toBe(Math.round(3000 * option.salaryFactor));
    expect(state.bankAccount.giroBalance).toBe(2000 - option.transitionCostEuro);
    expect(state.metrics.stress).toBe(before.metrics.stress + option.stressDelta);
    expect(state.metrics.happiness).toBe(before.metrics.happiness + option.happinessDelta);
    expect(state.transactions[0]).toMatchObject({
      amount: -option.transitionCostEuro,
      category: 'Karrierewechsel',
    });
    expect(state.career.monthsSinceLastJobSwitch).toBe(0);
  });

  it('blocks repeated job switch during cooldown', () => {
    const before = employedState();
    before.bankAccount.giroBalance = 2000;
    before.career.monthsSinceLastJobSwitch = 11;
    const option = JOB_SWITCH_OPTIONS[0];

    const state = changeEmployedJob(before, option.id);

    expect(state).toBe(before);
  });

  it('treats switching to the current title and branch as a no-op', () => {
    const before = employedState();
    before.bankAccount.giroBalance = 2000;
    before.career.monthsSinceLastJobSwitch = 12;
    const option = JOB_SWITCH_OPTIONS[0];
    before.career.title = option.title;
    before.career.branch = option.branch;

    const state = changeEmployedJob(before, option.id);

    expect(state).toBe(before);
  });

  it('training costs money and raises level', () => {
    const before = employedState();
    before.bankAccount.giroBalance = 1500;
    before.career.monthsSinceLastTraining = 24;

    const state = startFurtherTraining(before);

    expect(state.career.careerAdvancementLevel).toBe(2);
    expect(state.career.monthsSinceLastTraining).toBe(0);
    expect(state.bankAccount.giroBalance).toBe(300);
    expect(state.metrics.stress).toBe(before.metrics.stress + 5);
    expect(state.metrics.knowledgePoints).toBe(before.metrics.knowledgePoints + 10);
  });

  it('abort education switches to Quereinstieg pay', () => {
    const before = employedState();
    before.career = {
      ...before.career,
      type: 'STUDIUM',
      title: 'Bachelor-Studium',
      isCompleted: false,
      fullTimeGrossSalary: 0,
      monthlySalaryGross: 950,
    };
    const quereinstieg = CAREER_OPTIONS.find((option) => option.id === 'PATH_QUEREINSTIEG');

    const state = abortEducationPath(before);

    expect(state.career.type).toBe('ANGESTELLTER');
    expect(state.career.title).toBe(quereinstieg?.title);
    expect(state.career.isCompleted).toBe(true);
    expect(state.career.fullTimeGrossSalary).toBe(quereinstieg?.startingGrossAfterGraduation);
    expect(state.career.monthsSinceLastRaiseAttempt).toBe(12);
    expect(state.career.monthsSinceLastTraining).toBe(24);
    expect(state.career.monthsSinceLastJobSwitch).toBe(12);
    expect(state.metrics.stress).toBe(before.metrics.stress + 15);
    expect(state.metrics.happiness).toBe(before.metrics.happiness - 10);
  });
});
