import React, { useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { sound } from '../audio/soundSynth';
import {
  Play,
  Pause,
  ChevronRight,
  TrendingUp,
  ShieldCheck,
  Heart,
  Smile,
  Zap,
  GraduationCap,
  PiggyBank,
  Wallet,
  Save,
  BookOpen,
  PieChart,
  Target,
  FileText,
  Smartphone,
} from 'lucide-react';
import { calculateEmergencyFundMonths } from '@goal/simulation-engine';

export const TopNavigation: React.FC = () => {
  const {
    gameState,
    stepMonth,
    togglePause,
    setSpeed,
    setActiveModal,
    saveToLocalStorage,
  } = useGameStore();

  if (!gameState) return null;

  // Clock ticker when game is running (not paused)
  useEffect(() => {
    if (gameState.isPaused || gameState.isGameOver || gameState.activeEvent) {
      return;
    }

    const intervalMs = gameState.speed === 5 ? 300 : gameState.speed === 2 ? 600 : 1200;
    const timer = setInterval(() => {
      stepMonth();
    }, intervalMs);

    return () => clearInterval(timer);
  }, [gameState.isPaused, gameState.speed, gameState.isGameOver, gameState.activeEvent, stepMonth]);

  const emergencyMonths = calculateEmergencyFundMonths(
    gameState.savingsAccount.tagesgeldBalance,
    gameState.budget.totalFixedExpenses,
    gameState.budget.totalVariableExpenses
  );

  const ageProgress = ((gameState.currentAge - 16) / (67 - 16)) * 100;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b-2 border-cozy-border sticky top-0 z-30 shadow-xs px-3 sm:px-5 py-2.5 select-none">
      <div className="max-w-7xl mx-auto flex flex-col gap-2.5">
        {/* ROW 1: Character Profile, Simulation Controls & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Player Avatar, Name, Age & Timeline Progress Bar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-sakura-100 to-cozy-cream border-2 border-cozy-border overflow-hidden shadow-xs shrink-0">
              <img
                src={`/assets/avatars/${gameState.character.avatar}.jpg`}
                onError={(e) => {
                  e.currentTarget.src = `/assets/avatars/${gameState.character.avatar}.svg`;
                }}
                alt={gameState.character.name}
                className="w-full h-full object-cover"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-gray-900 text-sm sm:text-base">{gameState.character.name}</span>
                <span className="bg-matcha-100 text-matcha-800 text-[11px] font-black px-2.5 py-0.5 rounded-full border border-matcha-200 shadow-2xs">
                  Alter {gameState.currentAge}
                </span>
                <span className="text-[11px] text-gray-400 font-bold">
                  Monat {gameState.currentMonth} / 12 (Jahr {gameState.currentYear})
                </span>
              </div>

              {/* Timeline Progress Bar (16 -> 67 Jahre) */}
              <div className="w-44 sm:w-56 bg-gray-100 rounded-full h-1.5 mt-1 overflow-hidden border border-gray-200">
                <div
                  className="bg-gradient-to-r from-matcha-400 via-skyline-400 to-amber-500 h-full transition-all duration-300 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(3, ageProgress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* Right: Simulation Controls, Smartphone Button & Shortcuts */}
          <div className="flex items-center gap-2 shrink-0 ml-auto">
            {/* Play/Pause & Speed Group */}
            <div className="flex items-center bg-gray-100 p-1 rounded-2xl border border-gray-200 shadow-xs">
              <button
                onClick={togglePause}
                type="button"
                title={gameState.isPaused ? 'Simulation starten' : 'Simulation pausieren'}
                className={`px-3 py-1.5 rounded-xl transition-all font-black text-xs flex items-center gap-1.5 cursor-pointer ${
                  gameState.isPaused
                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-xs'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                }`}
              >
                {gameState.isPaused ? (
                  <>
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Start</span>
                  </>
                ) : (
                  <>
                    <Pause className="w-3.5 h-3.5 fill-gray-700" />
                    <span>Pause</span>
                  </>
                )}
              </button>

              {/* Speed Buttons */}
              <div className="flex items-center ml-1 border-l border-gray-200 pl-1">
                {([1, 2, 5] as const).map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setSpeed(spd)}
                    type="button"
                    className={`px-2 py-1 text-xs font-black rounded-lg transition-all cursor-pointer ${
                      gameState.speed === spd
                        ? 'bg-matcha-500 text-white shadow-xs'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>

              {/* Step 1 Month Button */}
              <button
                onClick={stepMonth}
                type="button"
                title="1 Monat vorspulen"
                className="ml-1 px-2.5 py-1 bg-white hover:bg-matcha-50 text-matcha-700 text-xs font-extrabold rounded-xl border border-matcha-200 transition-all flex items-center gap-1 cursor-pointer active:scale-95 shadow-2xs"
              >
                +1 Mo
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* 📱 SMARTPHONE (HANDY) BUTTON */}
            <button
              onClick={() => {
                sound.playPop();
                setActiveModal('PHONE_MODAL');
              }}
              type="button"
              title="Smartphone öffnen (Chats, SMS & Berater-Hotlines)"
              className="px-3.5 py-2 bg-gradient-to-r from-skyline-500 to-indigo-600 hover:from-skyline-600 hover:to-indigo-700 text-white rounded-2xl shadow-md transition-all flex items-center gap-1.5 text-xs font-black cursor-pointer active:scale-95 border border-skyline-400"
            >
              <Smartphone className="w-4 h-4" />
              <span>Handy</span>
            </button>

            {/* Quick Action Icon Shortcuts */}
            <div className="hidden sm:flex items-center gap-1">
              <button
                onClick={() => setActiveModal('GOALS_MODAL')}
                type="button"
                title="Lebensziele prüfen"
                className="p-2 bg-gray-50 hover:bg-white text-gray-700 rounded-2xl border border-gray-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Target className="w-4 h-4 text-terracotta-600" />
              </button>

              <button
                onClick={() => setActiveModal('INSURANCE_OFFICE')}
                type="button"
                title="Verträge & Versicherungen"
                className="p-2 bg-gray-50 hover:bg-white text-gray-700 rounded-2xl border border-gray-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <FileText className="w-4 h-4 text-skyline-600" />
              </button>

              <button
                onClick={() => setActiveModal('LEARNING_MODAL')}
                type="button"
                title="Wissensbibliothek"
                className="p-2 bg-gray-50 hover:bg-white text-gray-700 rounded-2xl border border-gray-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <BookOpen className="w-4 h-4 text-matcha-600" />
              </button>

              <button
                onClick={() => {
                  saveToLocalStorage();
                  sound.playPop();
                  alert('Spielstand erfolgreich im Browser gespeichert!');
                }}
                type="button"
                title="Spielstand speichern"
                className="p-2 bg-gray-50 hover:bg-white text-gray-700 rounded-2xl border border-gray-200 transition-all cursor-pointer shadow-2xs active:scale-95"
              >
                <Save className="w-4 h-4 text-gray-600" />
              </button>
            </div>
          </div>
        </div>

        {/* ROW 2: Financial & Health Metric Badges (Dedicated Strip - No Overlaps) */}
        <div className="flex items-center gap-2 flex-wrap text-xs font-bold pt-1 border-t border-gray-100">
          {/* 1. Girokonto Pill */}
          <div className="relative group">
            <button
              onClick={() => setActiveModal('BANK')}
              className={`px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gameState.bankAccount.giroBalance < 0
                  ? 'bg-red-50 text-red-700 border-red-300 animate-pulse'
                  : 'bg-gray-50 hover:bg-white text-gray-800 border-gray-200 shadow-2xs'
              }`}
            >
              <Wallet className="w-3.5 h-3.5 text-gray-500" />
              <span>Giro:</span>
              <span className={gameState.bankAccount.giroBalance < 0 ? 'text-red-600 font-black' : 'text-gray-900 font-black'}>
                {Math.round(gameState.bankAccount.giroBalance).toLocaleString('de-DE')} €
              </span>
            </button>

            {/* Info Tooltip */}
            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-amber-300 flex items-center gap-1.5 mb-1">
                <Wallet className="w-3.5 h-3.5" /> Girokonto
              </div>
              <p className="text-gray-300 leading-snug">
                Dein tägliches Transaktionskonto. Bei Minus greift der <strong>Dispokredit (12,5 % Zinsen)</strong>.
              </p>
            </div>
          </div>

          {/* 2. Notgroschen Pill */}
          <div className="relative group">
            <button
              onClick={() => setActiveModal('BANK')}
              className="px-3 py-1.5 rounded-xl bg-gray-50 hover:bg-white text-gray-800 border border-gray-200 shadow-2xs flex items-center gap-1.5 shrink-0 transition-all cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-matcha-600" />
              <span>Notgroschen:</span>
              <span className="text-matcha-700 font-black">
                {Math.round(gameState.savingsAccount.tagesgeldBalance).toLocaleString('de-DE')} €
              </span>
              <span className="text-[10px] text-gray-400 font-bold">({emergencyMonths} Mo.)</span>
            </button>

            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-matcha-300 flex items-center gap-1.5 mb-1">
                <ShieldCheck className="w-3.5 h-3.5" /> Notgroschen-Puffer
              </div>
              <p className="text-gray-300 leading-snug">
                Tagesgeld-Rücklage für Notfälle (Empfehlung: <strong>3 Monatsausgaben</strong>). Schützt vor teuren Krediten.
              </p>
            </div>
          </div>

          {/* 3. ETF-Portfolio Pill */}
          {gameState.investmentAccount.etfBalance > 0 && (
            <div className="relative group">
              <button
                onClick={() => setActiveModal('BANK')}
                className="px-3 py-1.5 rounded-xl bg-skyline-50 hover:bg-skyline-100 text-skyline-900 border border-skyline-200 shadow-2xs flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                <TrendingUp className="w-3.5 h-3.5 text-skyline-600" />
                <span>ETF:</span>
                <span className="font-black">
                  {Math.round(gameState.investmentAccount.etfBalance).toLocaleString('de-DE')} €
                </span>
              </button>

              <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
                <div className="font-black text-skyline-300 flex items-center gap-1.5 mb-1">
                  <TrendingUp className="w-3.5 h-3.5" /> Weltweites ETF-Depot
                </div>
                <p className="text-gray-300 leading-snug">
                  Langfristiger Vermögensaufbau über den weltweiten Aktienmarkt (~6 % Rendite p. a.).
                </p>
              </div>
            </div>
          )}

          {/* 4. Cashflow Pill */}
          <div className="relative group">
            <button
              onClick={() => setActiveModal('BUDGET_MODAL')}
              className={`px-3 py-1.5 rounded-xl border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                gameState.budget.monthlyCashflow >= 0
                  ? 'bg-matcha-50 text-matcha-800 border-matcha-200'
                  : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <PieChart className="w-3.5 h-3.5" />
              <span>Cashflow:</span>
              <span className="font-black">
                {gameState.budget.monthlyCashflow >= 0 ? '+' : ''}
                {Math.round(gameState.budget.monthlyCashflow)} €
              </span>
            </button>

            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-amber-300 flex items-center gap-1.5 mb-1">
                <PieChart className="w-3.5 h-3.5" /> Monatlicher Cashflow
              </div>
              <p className="text-gray-300 leading-snug">
                Differenz aus Einnahmen abzüglich aller Fixkosten und Sparüberträge.
              </p>
            </div>
          </div>

          {/* 5. Health (Gesundheit) Pill */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-3 py-1.5 rounded-xl shrink-0 cursor-help transition-all shadow-2xs">
              <Heart className="w-3.5 h-3.5 fill-red-500 text-red-600 shrink-0" />
              <span className="font-black">{Math.round(gameState.metrics.health)} %</span>
            </div>

            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-red-400 flex items-center gap-1.5 mb-1">
                <Heart className="w-3.5 h-3.5 fill-red-400" /> Gesundheit & Vitalität
              </div>
              <p className="text-gray-300 leading-relaxed mb-2">
                Körperliche und mentale Fitness (0–100 %).
              </p>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-red-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, gameState.metrics.health))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 6. Happiness (Zufriedenheit) Pill */}
          <div className="relative group">
            <div className="flex items-center gap-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 px-3 py-1.5 rounded-xl shrink-0 cursor-help transition-all shadow-2xs">
              <Smile className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span className="font-black">{Math.round(gameState.metrics.happiness)} %</span>
            </div>

            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-amber-300 flex items-center gap-1.5 mb-1">
                <Smile className="w-3.5 h-3.5" /> Lebenszufriedenheit & Glück
              </div>
              <p className="text-gray-300 leading-relaxed mb-2">
                Persönliches Wohlbefinden (0–100 %).
              </p>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-400 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, gameState.metrics.happiness))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 7. Stresslevel Pill */}
          <div className="relative group">
            <div className={`flex items-center gap-1.5 border px-3 py-1.5 rounded-xl shrink-0 cursor-help transition-all shadow-2xs ${
              gameState.metrics.stress > 60
                ? 'bg-red-50 text-red-800 border-red-300'
                : 'bg-gray-50 text-gray-700 border-gray-200'
            }`}>
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span className="font-black">{Math.round(gameState.metrics.stress)} %</span>
            </div>

            <div className="absolute top-full left-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-amber-400 flex items-center gap-1.5 mb-1">
                <Zap className="w-3.5 h-3.5" /> Stresslevel
              </div>
              <p className="text-gray-300 leading-relaxed mb-2">
                Aktueller Belastungsgrad (0–100 %).
              </p>
              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, gameState.metrics.stress))}%` }}
                />
              </div>
            </div>
          </div>

          {/* 8. Knowledge (Wissen) Pill */}
          <div className="relative group">
            <button
              onClick={() => setActiveModal('LEARNING_MODAL')}
              className="flex items-center gap-1.5 bg-skyline-50 hover:bg-skyline-100 text-skyline-900 border border-skyline-200 px-3 py-1.5 rounded-xl shrink-0 cursor-pointer transition-all shadow-2xs"
            >
              <GraduationCap className="w-3.5 h-3.5 text-skyline-600 shrink-0" />
              <span>Wissen:</span>
              <span className="font-black">{Math.round(gameState.metrics.knowledgePoints)} Pkt.</span>
            </button>

            <div className="absolute top-full right-0 mt-2 hidden group-hover:block z-50 w-64 p-3 bg-gray-900 text-white rounded-2xl shadow-xl border border-gray-700 text-xs font-normal pointer-events-none animate-fadeIn">
              <div className="font-black text-skyline-300 flex items-center gap-1.5 mb-1">
                <GraduationCap className="w-3.5 h-3.5" /> Finanzkompetenz
              </div>
              <p className="text-gray-300 leading-snug">
                Punkte für gesammeltes Finanzwissen in Quiz, Beratergesprächen und Lernkarten.
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
