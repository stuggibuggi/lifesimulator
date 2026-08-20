import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ModalShell } from './ModalShell';
import { CAREER_ACTION_CONSTANTS, JOB_SWITCH_OPTIONS } from '@goal/game-content';
import { Award, Briefcase, Clock, GraduationCap, TrendingUp } from 'lucide-react';

const euro = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 0,
});

const buttonBase =
  'w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition-all active:scale-[0.99] shadow-2xs';

const enabledButton = 'bg-skyline-600 text-white hover:bg-skyline-700 cursor-pointer';
const quietButton = 'bg-white text-gray-800 hover:bg-gray-50 border border-gray-200 cursor-pointer';
const disabledButton = 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed';

export const CareerModal: React.FC = () => {
  const {
    gameState,
    careerActionFeedback,
    closeModal,
    handleRequestSalaryRaise,
    handleChangeEmployedJob,
    handleSetEmploymentHours,
    handleStartFurtherTraining,
    handleAbortEducationPath,
  } = useGameStore();

  if (!gameState) return null;

  const career = gameState.career;
  const isEmployed = career.type === 'ANGESTELLTER';
  const isEducationPath = career.type === 'AUSBILDUNG' || career.type === 'STUDIUM';
  const raiseCooldownRemaining = Math.max(
    0,
    CAREER_ACTION_CONSTANTS.raiseCooldownMonths - career.monthsSinceLastRaiseAttempt
  );
  const trainingCooldownRemaining = Math.max(
    0,
    CAREER_ACTION_CONSTANTS.trainingCooldownMonths - career.monthsSinceLastTraining
  );
  const jobSwitchCooldownRemaining = Math.max(
    0,
    CAREER_ACTION_CONSTANTS.jobSwitchCooldownMonths - (career.monthsSinceLastJobSwitch ?? 12)
  );
  const isLevelCapReached =
    career.careerAdvancementLevel >= CAREER_ACTION_CONSTANTS.maxAdvancementLevel;
  const canTrain =
    isEmployed &&
    !isLevelCapReached &&
    trainingCooldownRemaining === 0 &&
    gameState.bankAccount.giroBalance >= CAREER_ACTION_CONSTANTS.trainingCostEuro;
  const nextHours = career.timeCommitmentHoursWeekly === 30 ? 40 : 30;
  const raiseDisabledText =
    raiseCooldownRemaining > 0
      ? `Noch ${raiseCooldownRemaining} Monat(e) Abklingzeit bis zur nächsten Anfrage.`
      : null;

  const trainingDisabledText = (() => {
    if (isLevelCapReached) return 'Maximales Karrierelevel erreicht.';
    if (trainingCooldownRemaining > 0) {
      return `Weiterbildung wieder in ${trainingCooldownRemaining} Monat(en) möglich.`;
    }
    if (gameState.bankAccount.giroBalance < CAREER_ACTION_CONSTANTS.trainingCostEuro) {
      return `Benötigt ${euro.format(CAREER_ACTION_CONSTANTS.trainingCostEuro)} auf dem Girokonto.`;
    }
    return null;
  })();

  const confirmAbortEducation = () => {
    const confirmed = window.confirm(
      'Möchtest du Ausbildung/Studium wirklich abbrechen? Du wechselst in den Quereinstieg und verlierst den geplanten Abschluss.'
    );
    if (confirmed) {
      handleAbortEducationPath();
    }
  };

  return (
    <ModalShell
      title="Arbeitsplatz & Bildung"
      subtitle="Beruflicher Status, Gehalt und Qualifikationen"
      icon="💼"
      iconBgColor="bg-skyline-100 text-skyline-700"
      onClose={closeModal}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-6">
        {/* Current Position Overview */}
        <div className="bg-cozy-cream/60 p-6 rounded-3xl border border-[#ede5cb]">
          <div className="flex items-center justify-between mb-3">
            <span className="bg-skyline-100 text-skyline-800 text-xs font-black px-3 py-1 rounded-full uppercase">
              {career.type}
            </span>
            <span className="text-xs text-gray-500 font-bold">
              {career.isCompleted ? 'Abschluss vorhanden' : `Jahr ${career.currentYear} von ${career.durationYears}`}
            </span>
          </div>

          <h3 className="text-xl font-black text-gray-900 mb-1">{career.title}</h3>
          <p className="text-xs text-gray-500 font-bold mb-4">{career.branch}</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-bold text-gray-700 bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs">
            <div>
              <span className="text-gray-400 block text-[10px]">Monatsgehalt Netto:</span>
              <span className="text-matcha-700 font-black text-sm">{career.monthlySalaryNet} €</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Wochenarbeitszeit:</span>
              <span>{career.timeCommitmentHoursWeekly} Std.</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Stressfaktor:</span>
              <span className="text-amber-700 font-black">{career.stressFactor} / 100</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Brutto Vollzeit:</span>
              <span>{euro.format(career.fullTimeGrossSalary)}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Karrierelevel:</span>
              <span>{career.careerAdvancementLevel} / {CAREER_ACTION_CONSTANTS.maxAdvancementLevel}</span>
            </div>
            <div>
              <span className="text-gray-400 block text-[10px]">Girokonto:</span>
              <span>{euro.format(gameState.bankAccount.giroBalance)}</span>
            </div>
          </div>
        </div>

        {careerActionFeedback && (
          <div className="rounded-3xl border border-skyline-200 bg-skyline-50 p-4 text-sm font-bold text-skyline-900">
            {careerActionFeedback}
          </div>
        )}

        {isEmployed && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
                <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-matcha-700" />
                  Gehalt verhandeln
                </h4>
                <p className="text-xs text-gray-500 font-bold mb-4">
                  Moderate Anfrage ist sicherer, die harte Verhandlung bringt mehr Potenzial und mehr Risiko.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    disabled={raiseCooldownRemaining > 0}
                    onClick={() => handleRequestSalaryRaise('soft')}
                    className={`${buttonBase} ${
                      raiseCooldownRemaining > 0 ? disabledButton : enabledButton
                    }`}
                  >
                    Soft-Raise anfragen (+2 %)
                  </button>
                  <button
                    type="button"
                    disabled={raiseCooldownRemaining > 0}
                    onClick={() => handleRequestSalaryRaise('hard')}
                    className={`${buttonBase} ${
                      raiseCooldownRemaining > 0 ? disabledButton : quietButton
                    }`}
                  >
                    Hard-Raise verhandeln (+8 %, Risiko)
                  </button>
                </div>
                {raiseDisabledText && (
                  <p className="mt-3 text-xs font-bold text-amber-700">{raiseDisabledText}</p>
                )}
              </section>

              <section className="bg-white p-5 rounded-3xl border border-gray-200 shadow-2xs">
                <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
                  <Clock className="w-4 h-4 text-skyline-700" />
                  Arbeitszeit & Weiterbildung
                </h4>
                <p className="text-xs text-gray-500 font-bold mb-4">
                  Teilzeit senkt Einkommen und Stress. Weiterbildung kostet Geld, erhöht aber dein Karrierelevel.
                </p>
                <div className="space-y-2">
                  <button
                    type="button"
                    onClick={() => handleSetEmploymentHours(nextHours)}
                    className={`${buttonBase} ${quietButton}`}
                  >
                    {nextHours === 30 ? 'Auf Teilzeit wechseln (30 Std.)' : 'Zurück auf Vollzeit (40 Std.)'}
                  </button>
                  <button
                    type="button"
                    disabled={!canTrain}
                    onClick={handleStartFurtherTraining}
                    className={`${buttonBase} ${canTrain ? enabledButton : disabledButton}`}
                  >
                    Weiterbildung starten ({euro.format(CAREER_ACTION_CONSTANTS.trainingCostEuro)})
                  </button>
                </div>
                {trainingDisabledText && (
                  <p className="mt-3 text-xs font-bold text-amber-700">{trainingDisabledText}</p>
                )}
              </section>
            </div>

            <section className="bg-gray-50 p-5 rounded-3xl border border-gray-200">
              <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider mb-3 flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-skyline-700" />
                Jobwechsel
              </h4>
              <div className="space-y-3">
                {JOB_SWITCH_OPTIONS.map((option) => {
                  const isCurrentJob = career.title === option.title && career.branch === option.branch;
                  const jobSwitchDisabledText = (() => {
                    if (isCurrentJob) return 'Das ist bereits dein aktueller Job.';
                    if (jobSwitchCooldownRemaining > 0) {
                      return `Jobwechsel wieder in ${jobSwitchCooldownRemaining} Monat(en) möglich.`;
                    }
                    if (gameState.bankAccount.giroBalance < option.transitionCostEuro) {
                      return 'Nicht genug Geld für den Wechsel.';
                    }
                    return null;
                  })();
                  const canSwitch = jobSwitchDisabledText === null;
                  return (
                    <div
                      key={option.id}
                      className="bg-white p-4 rounded-2xl border border-gray-200 flex flex-col sm:flex-row sm:items-center gap-3 justify-between"
                    >
                      <div>
                        <h5 className="text-sm font-black text-gray-900">{option.title}</h5>
                        <p className="text-xs text-gray-500 font-bold">
                          {option.branch} · Gehaltsfaktor {Math.round(option.salaryFactor * 100)} % · Kosten{' '}
                          {euro.format(option.transitionCostEuro)}
                        </p>
                        {jobSwitchDisabledText && (
                          <p className="mt-1 text-xs font-bold text-amber-700">
                            {jobSwitchDisabledText}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        disabled={!canSwitch}
                        onClick={() => handleChangeEmployedJob(option.id)}
                        className={`rounded-2xl px-4 py-2 text-xs font-black transition-all active:scale-95 ${
                          canSwitch ? enabledButton : disabledButton
                        }`}
                      >
                        Wechseln
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>
          </div>
        )}

        {isEducationPath && (
          <section className="bg-amber-50 p-5 rounded-3xl border border-amber-200">
            <h4 className="font-black text-amber-900 text-sm uppercase tracking-wider mb-2 flex items-center gap-2">
              <Award className="w-4 h-4 text-amber-700" />
              Bildungsweg abbrechen
            </h4>
            <p className="text-xs text-amber-800 font-bold mb-4 leading-relaxed">
              Du kannst Ausbildung oder Studium abbrechen und direkt in den Quereinstieg wechseln. Das erhöht kurzfristig dein Einkommen, kostet aber Abschlusschancen und belastet deine Werte.
            </p>
            <button
              type="button"
              onClick={confirmAbortEducation}
              className={`${buttonBase} bg-amber-600 text-white hover:bg-amber-700 cursor-pointer`}
            >
              Ausbildung/Studium abbrechen
            </button>
          </section>
        )}

        {!isEmployed && !isEducationPath && (
          <div className="bg-gray-50 p-5 rounded-3xl border border-gray-200 text-xs text-gray-600 leading-relaxed">
            <h4 className="font-black text-gray-800 text-xs uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <GraduationCap className="w-4 h-4 text-skyline-600" />
              Karriere- und Weiterbildungschancen
            </h4>
            <p>
              Aktive Karriereaktionen stehen erst in einer Anstellung, Ausbildung oder im Studium zur Verfügung.
            </p>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
