import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { AvatarId, StartConditionId } from '@goal/shared-types';
import { START_CONDITIONS } from '@goal/simulation-engine';
import { sound } from '../audio/soundSynth';
import { User, Sparkles, ArrowRight, Shield, Coins, MapPin } from 'lucide-react';

const AVATARS: { id: AvatarId; label: string; src: string }[] = [
  { id: 'student_boy', label: 'Alex', src: '/assets/avatars/alex.jpg' },
  { id: 'student_girl', label: 'Mila', src: '/assets/avatars/mila.jpg' },
  { id: 'apprentice_boy', label: 'Robin', src: '/assets/avatars/robin.jpg' },
  { id: 'apprentice_girl', label: 'Samira', src: '/assets/avatars/samira.jpg' },
  { id: 'ambitious_teen', label: 'Leo', src: '/assets/avatars/leo.jpg' },
];

export const CharacterSetupScreen: React.FC = () => {
  const { tempCharacter, setTempCharacter, confirmCharacterAndGoToGoals, resetGame } = useGameStore();

  const [name, setName] = useState(tempCharacter?.name || 'Alex');
  const [avatar, setAvatar] = useState<AvatarId>(tempCharacter?.avatar || 'student_boy');
  const [startCondition, setStartCondition] = useState<StartConditionId>(
    tempCharacter?.startCondition || 'FAMILY_SUPPORT'
  );
  const [bio, setBio] = useState(
    tempCharacter?.bio || 'Möchte eigene Ziele verwirklichen und klug mit Geld umgehen.'
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    sound.playPop();
    setTempCharacter({
      name: name.trim(),
      avatar,
      startCondition,
      bio: bio.trim(),
    });
    confirmCharacterAndGoToGoals();
  };

  return (
    <div className="max-w-3xl mx-auto py-8 px-4">
      <div className="bg-white rounded-4xl p-6 md:p-10 shadow-cozy border-4 border-[#f0e7d5]">
        {/* Step Indicator Header */}
        <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-wider text-matcha-600 bg-matcha-50 px-3 py-1 rounded-full">
              Schritt 1 von 3
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-gray-800 mt-2">
              Erstelle deine Spielfigur
            </h2>
          </div>
          <button
            type="button"
            onClick={resetGame}
            className="text-sm font-semibold text-gray-400 hover:text-gray-600"
          >
            Abbrechen
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Avatar Selection */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Wähle dein Aussehen (Avatar):
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {AVATARS.map((av) => (
                <button
                  key={av.id}
                  type="button"
                  onClick={() => {
                    sound.playPop();
                    setAvatar(av.id);
                  }}
                  className={`p-4 rounded-3xl border-3 text-center transition-all flex flex-col items-center gap-2 ${
                    avatar === av.id
                      ? 'border-matcha-500 bg-matcha-50 shadow-md scale-105'
                      : 'border-cozy-border bg-gray-50 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-xs">
                    <img src={av.src} alt={av.label} className="w-full h-full object-cover" />
                  </div>
                  <span className="font-extrabold text-sm text-gray-800">{av.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Name & Bio */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Dein Spiel- / Anzeigename:
              </label>
              <input
                type="text"
                required
                maxLength={24}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="z. B. Alex"
                className="w-full px-4 py-3 rounded-2xl border-2 border-cozy-border focus:border-matcha-500 focus:outline-none font-bold text-gray-800 bg-gray-50 focus:bg-white transition-all text-base"
              />
            </div>

            <div>
              <label className="block text-sm font-bold text-gray-700 mb-2">
                Dein Lebensmotto:
              </label>
              <input
                type="text"
                maxLength={60}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="z. B. Träume verwirklichen & vorsorgen"
                className="w-full px-4 py-3 rounded-2xl border-2 border-cozy-border focus:border-matcha-500 focus:outline-none font-medium text-gray-800 bg-gray-50 focus:bg-white transition-all text-base"
              />
            </div>
          </div>

          {/* Start Condition / Background */}
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-3">
              Wähle deine Startbedingungen:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Object.values(START_CONDITIONS).map((cond) => (
                <div
                  key={cond.id}
                  onClick={() => {
                    sound.playPop();
                    setStartCondition(cond.id);
                  }}
                  className={`p-4 rounded-3xl border-3 cursor-pointer transition-all ${
                    startCondition === cond.id
                      ? 'border-matcha-500 bg-matcha-50 shadow-md'
                      : 'border-cozy-border bg-gray-50 hover:bg-white hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-black text-gray-800 text-base">{cond.title}</h4>
                    <span className="text-xl">
                      {cond.id === 'FAMILY_SUPPORT' && '🏡'}
                      {cond.id === 'NO_SUPPORT' && '💼'}
                      {cond.id === 'CITY_EXPENSIVE' && '🌆'}
                      {cond.id === 'RURAL_CHEAP' && '🌳'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">{cond.description}</p>
                  <div className="flex items-center gap-3 text-xs font-bold text-gray-700 bg-white/80 p-2 rounded-xl border border-gray-200">
                    <span className="flex items-center gap-1 text-matcha-700">
                      <Coins className="w-3.5 h-3.5" /> Start: {cond.startingGiroBalance} €
                    </span>
                    <span className="text-gray-300">|</span>
                    <span className="text-skyline-700">
                      Taschengeld: {cond.familySupportMonthly} €/Mo
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Next Step Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              className="bg-matcha-500 hover:bg-matcha-600 text-white font-extrabold text-base px-8 py-4 rounded-2xl shadow-cozy-hover transition-all flex items-center gap-3 active:scale-95"
            >
              Weiter zur Lebensziel-Auswahl
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
