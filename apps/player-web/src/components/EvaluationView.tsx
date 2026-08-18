import React from 'react';
import { useGameStore } from '../store/gameStore';
import { evaluateLifeRun } from '@goal/scoring-engine';
import { sound } from '../audio/soundSynth';
import {
  Award,
  CheckCircle2,
  XCircle,
  TrendingUp,
  ShieldCheck,
  Heart,
  Smile,
  BookOpen,
  Sparkles,
  RotateCcw,
  Download,
  Printer,
  Lightbulb,
} from 'lucide-react';
import { formatEvaluationTitle, formatSaveFilename } from './EvaluationView.helpers';
import { CertificatePanel } from './CertificatePanel';

export const EvaluationView: React.FC = () => {
  const { gameState, resetGame, exportSaveState } = useGameStore();

  if (!gameState) return null;

  const evaluation = evaluateLifeRun(gameState);
  const evaluationEndAge = gameState.scenarioEndAge ?? gameState.currentAge ?? 67;

  const handleDownload = () => {
    sound.playPop();
    const jsonStr = exportSaveState();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = formatSaveFilename(gameState.character.name, evaluationEndAge);
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintCertificate = () => {
    window.print();
  };

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 animate-fadeIn">
      {/* Grade & Title Hero Card */}
      <div className="bg-gradient-to-br from-white via-cozy-cream to-sakura-50 rounded-4xl p-8 md:p-12 shadow-cozy border-4 border-[#f0e7d5] text-center relative overflow-hidden mb-8">
        <div className="inline-flex items-center gap-2 bg-matcha-100 text-matcha-800 px-4 py-1.5 rounded-full font-extrabold text-sm mb-4 border border-matcha-200">
          <Sparkles className="w-4 h-4 text-matcha-600" />
          {formatEvaluationTitle(evaluationEndAge)}
        </div>

        {/* Big Grade Badge */}
        <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-matcha-400 to-matcha-600 text-white font-black text-4xl flex items-center justify-center mx-auto shadow-lg mb-4 border-4 border-white">
          {evaluation.grade}
        </div>

        <h1 className="text-3xl md:text-5xl font-black text-gray-900 mb-2">
          {evaluation.verdictTitle}
        </h1>
        <p className="text-base md:text-lg text-gray-600 font-medium max-w-2xl mx-auto mb-6">
          {evaluation.verdictSubtitle}
        </p>

        {/* Key Quick Stats Pills */}
        <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-bold">
          <div className="bg-white px-4 py-2 rounded-2xl shadow-xs border border-gray-200">
            Gesamtscore: <strong className="text-matcha-700 text-lg">{evaluation.overallScore} / 100</strong>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-xs border border-gray-200">
            Ziele erreicht: <strong className="text-terracotta-700 text-lg">{evaluation.goalsAchievedCount} von {evaluation.goalsTotalCount}</strong>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-xs border border-gray-200">
            Nettovermögen: <strong className="text-skyline-700 text-lg">{evaluation.finalNetWorth.toLocaleString('de-DE')} €</strong>
          </div>
          <div className="bg-white px-4 py-2 rounded-2xl shadow-xs border border-gray-200">
            Notgroschen: <strong className="text-matcha-700 text-lg">{evaluation.finalEmergencyMonths} Monate</strong>
          </div>
        </div>
      </div>

      {gameState.isGameOver && (
        <div className="bg-white p-6 md:p-8 rounded-4xl shadow-cozy border-2 border-cozy-border mb-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                Dein Finanzführerschein-Zertifikat
              </h2>
              <p className="text-xs text-gray-500 font-medium mt-1">
                Druckbar für Schule, Bewerbung oder deine persönliche Dokumentation.
              </p>
            </div>
            <button
              type="button"
              onClick={handlePrintCertificate}
              className="w-full md:w-auto px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Zertifikat ausdrucken / als PDF speichern
            </button>
          </div>
          <CertificatePanel
            certificate={evaluation.certificate}
            footerHint="Solo-Lebenslauf abgeschlossen"
          />
        </div>
      )}

      {/* 6 Dimensions Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {Object.entries(evaluation.dimensions).map(([key, dim]) => (
          <div
            key={key}
            className="bg-white p-6 rounded-3xl shadow-cozy border-2 border-cozy-border flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-extrabold text-base text-gray-900">{dim.title}</h3>
                <span className="font-black text-base text-matcha-700">
                  {dim.score} / 100
                </span>
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden mb-3">
                <div
                  className="bg-matcha-500 h-full rounded-full transition-all duration-500"
                  style={{ width: `${dim.score}%` }}
                />
              </div>

              <p className="text-xs text-gray-600 mb-4">{dim.description}</p>

              {/* Strengths & Improvements */}
              <div className="space-y-1.5 text-xs font-medium">
                {dim.strengths.map((str, i) => (
                  <div key={i} className="text-matcha-800 flex items-start gap-1.5">
                    <span className="text-matcha-600 font-bold">✓</span>
                    <span>{str}</span>
                  </div>
                ))}
                {dim.improvements.map((imp, i) => (
                  <div key={i} className="text-amber-800 flex items-start gap-1.5">
                    <span className="text-amber-600 font-bold">!</span>
                    <span>{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Goals Detail Review */}
      <div className="bg-white p-6 md:p-8 rounded-4xl shadow-cozy border-2 border-cozy-border mb-8">
        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <Award className="w-5 h-5 text-terracotta-600" />
          Detail-Überprüfung deiner gewählten Lebensziele
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {gameState.goals.map((goal) => (
            <div
              key={goal.id}
              className={`p-4 rounded-2xl border-2 ${
                goal.isAchieved
                  ? 'bg-matcha-50/70 border-matcha-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                {goal.isAchieved ? (
                  <CheckCircle2 className="w-4 h-4 text-matcha-600" />
                ) : (
                  <XCircle className="w-4 h-4 text-gray-400" />
                )}
                <h4 className="font-extrabold text-xs text-gray-900">{goal.title}</h4>
              </div>
              <p className="text-[11px] text-gray-500">
                Prio {goal.priority} • {goal.isAchieved ? 'Vollständig erreicht' : 'Nicht ganz erreicht'}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* What-If Alternative Scenarios */}
      <div className="bg-cozy-cream/70 p-6 md:p-8 rounded-4xl border-2 border-[#ede5cb] shadow-cozy mb-8">
        <h3 className="text-xl font-black text-gray-900 mb-4 flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-600" />
          „Was wäre, wenn...?“ – Alternative Simulationen
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {evaluation.whatIfScenarios.map((scen, idx) => (
            <div key={idx} className="bg-white p-5 rounded-3xl border border-gray-200 text-xs">
              <h4 className="font-black text-sm text-gray-900 mb-2">{scen.title}</h4>
              <p className="text-gray-500 mb-2">
                <strong>In deinem Spiel:</strong> {scen.whatHappened}
              </p>
              <p className="text-matcha-900 bg-matcha-50 p-3 rounded-2xl border border-matcha-200 font-bold">
                <strong>Simulationseffekt:</strong> {scen.whatIfAlternative}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Key Takeaways & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
        <button
          onClick={handleDownload}
          className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white hover:bg-gray-50 font-bold text-gray-700 border-2 border-cozy-border shadow-cozy flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <Download className="w-5 h-5 text-gray-500" />
          Lebenslauf als JSON exportieren
        </button>

        <button
          onClick={resetGame}
          className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-matcha-500 hover:bg-matcha-600 text-white font-extrabold text-base shadow-cozy-hover flex items-center justify-center gap-2 active:scale-95 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
          Neuen Lebenslauf starten
        </button>
      </div>
    </div>
  );
};
