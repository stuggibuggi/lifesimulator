import React, { useEffect, useMemo, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { sound } from '../audio/soundSynth';
import { Sparkles, Play, FolderOpen, Target } from 'lucide-react';

function formatBuildStamp(iso: string): string {
  try {
    return new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export const WelcomeScreen: React.FC = () => {
  const { startNewGame, loadFromLocalStorage, importSaveState, setActiveModal } = useGameStore();
  const [loadError, setLoadError] = useState<string | null>(null);
  const buildLabel = useMemo(
    () => `Version ${__APP_VERSION__} · Build ${formatBuildStamp(__BUILD_TIME__)}`,
    []
  );

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('verifyTeacher') || params.get('resetTeacher')) {
        setActiveModal('TEACHER_AUTH_MODAL');
      }
    } catch {
      // ignore
    }
  }, [setActiveModal]);

  const handleLoad = () => {
    const success = loadFromLocalStorage();
    if (!success) {
      setLoadError('Kein gespeicherter Spielstand im Browser gefunden.');
      setTimeout(() => setLoadError(null), 4000);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        const ok = importSaveState(content);
        if (!ok) {
          setLoadError('Ungültige Spielstand-Datei.');
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      {/* Hero Banner */}
      <div className="bg-gradient-to-br from-white via-cozy-cream to-sakura-50 rounded-4xl p-8 md:p-12 shadow-cozy border-4 border-[#f0e7d5] text-center relative overflow-hidden">
        {/* Decorative Floating Blossom Petals */}
        <div className="absolute top-6 left-8 text-3xl animate-bounce">🌸</div>
        <div className="absolute top-10 right-10 text-3xl animate-pulse">✨</div>
        <div className="absolute bottom-6 left-12 text-3xl opacity-70">🏡</div>
        <div className="absolute bottom-8 right-12 text-3xl opacity-70">📈</div>

        <div className="inline-flex items-center gap-2 bg-sakura-100 text-sakura-600 px-4 py-1.5 rounded-full font-bold text-sm mb-4 border border-sakura-200">
          <Sparkles className="w-4 h-4" />
          Lebenssimulationsspiel für Schüler & Schulklassen
        </div>

        <h1 className="text-4xl md:text-6xl font-black text-gray-800 tracking-tight mb-4">
          G<span className="text-terracotta-500">O</span>A<span className="text-matcha-500">L</span>
        </h1>

        <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto font-medium leading-relaxed mb-8">
          Durchlaufe dein Leben von <strong className="text-gray-800">16 bis 67 Jahren</strong> im Zeitraffer.
          Lerne spielerisch, wie sich deine Entscheidungen bei <strong className="text-terracotta-600">Beruf, Finanzen, Miete/Kauf, Partnerschaft, Steuern und Altersvorsorge</strong> langfristig auswirken!
        </p>

        {/* Central Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6 flex-wrap">
          <button
            onClick={startNewGame}
            className="w-full sm:w-auto bg-gradient-to-r from-matcha-500 to-matcha-600 hover:from-matcha-600 hover:to-matcha-700 text-white font-extrabold text-lg px-8 py-4 rounded-2xl shadow-cozy-hover transition-all duration-200 flex items-center justify-center gap-3 border-2 border-matcha-400 active:scale-95"
          >
            <Play className="w-6 h-6 fill-white" />
            Neues Leben starten (16–67 J.)
          </button>

          <button
            onClick={() => setActiveModal('SCENARIO_SELECTION_MODAL')}
            className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-base px-6 py-4 rounded-2xl shadow-cozy border-2 border-amber-400 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <Target className="w-5 h-5" />
            Unterrichts-Szenarien (45 Min.)
          </button>

          <button
            onClick={() => setActiveModal('JOIN_CLASS_MODAL')}
            className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base px-6 py-4 rounded-2xl shadow-cozy border-2 border-indigo-500 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            Klasse beitreten
          </button>

          <button
            onClick={() => setActiveModal('TEACHER_AUTH_MODAL')}
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-indigo-800 font-extrabold text-base px-6 py-4 rounded-2xl shadow-cozy border-2 border-indigo-200 transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            Lehrer anmelden
          </button>

          <button
            onClick={handleLoad}
            className="w-full sm:w-auto bg-white hover:bg-gray-50 text-gray-700 font-bold text-base px-6 py-4 rounded-2xl shadow-cozy border-2 border-cozy-border transition-all duration-200 flex items-center justify-center gap-2 active:scale-95"
          >
            <FolderOpen className="w-5 h-5 text-gray-500" />
            Spielstand laden
          </button>
        </div>

        {/* Load error message */}
        {loadError && (
          <div className="bg-red-50 text-red-600 px-4 py-2 rounded-xl text-sm font-semibold inline-block border border-red-200 mb-4 animate-shake">
            {loadError}
          </div>
        )}

        {/* JSON Import Link */}
        <div className="text-xs text-gray-400">
          <label className="cursor-pointer hover:text-gray-600 underline font-medium">
            JSON-Spielstand importieren
            <input type="file" accept=".json" onChange={handleFileUpload} className="hidden" />
          </label>
        </div>

        <p className="mt-5 text-[11px] text-gray-400 font-medium tracking-wide" title="Zeitpunkt des letzten Frontend-Builds">
          {buildLabel}
        </p>
      </div>

      {/* Feature Pillar Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        <div className="bg-white p-6 rounded-3xl shadow-cozy border-2 border-cozy-border hover:border-matcha-300 transition-all">
          <div className="w-12 h-12 bg-matcha-100 text-matcha-600 rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold">
            🌱
          </div>
          <h3 className="font-black text-gray-800 text-lg mb-2">Eigene Lebensziele</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Wähle 3 bis 5 Ziele (z. B. Ausbildung, Studium, Notgroschen, eigene Wohnung, Familie, Altersvorsorge). Nicht der Reichste gewinnt, sondern wer seine Ziele am besten erreicht!
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-cozy border-2 border-cozy-border hover:border-terracotta-300 transition-all">
          <div className="w-12 h-12 bg-terracotta-100 text-terracotta-600 rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold">
            🛡️
          </div>
          <h3 className="font-black text-gray-800 text-lg mb-2">Praxisnahe Finanzbildung</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Erlebe monatliche Budgets, Brutto vs. Netto, Dispozinsen, Notgroschen, bAV-Chefzuschuss, ETF-Sparpläne und das 3-Säulen-Modell der Rente.
          </p>
        </div>

        <div className="bg-white p-6 rounded-3xl shadow-cozy border-2 border-cozy-border hover:border-skyline-300 transition-all">
          <div className="w-12 h-12 bg-skyline-100 text-skyline-600 rounded-2xl flex items-center justify-center mb-4 text-2xl font-bold">
            🎓
          </div>
          <h3 className="font-black text-gray-800 text-lg mb-2">Finanzführerschein & Zertifikat</h3>
          <p className="text-gray-600 text-sm leading-relaxed">
            Mit 67 Jahren erhältst du einen ausführlichen Lebensbericht mit Radar-Chart, Zielerreichung und ein druckbares Finanzführerschein-Zertifikat für Schule und Bewerbung.
          </p>
        </div>
      </div>
    </div>
  );
};
