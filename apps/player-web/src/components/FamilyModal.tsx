import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FinancialSharingModel, RelationshipStatus } from '@goal/shared-types';
import { sound } from '../audio/soundSynth';
import { ModalShell } from './ModalShell';
import {
  Heart,
  Users,
  Baby,
  Smile,
  Shield,
  Coins,
  Check,
} from 'lucide-react';

export const FamilyModal: React.FC = () => {
  const {
    gameState,
    closeModal,
    handleUpdateFamily,
    handleAdjustChildren,
  } = useGameStore();

  if (!gameState) return null;

  const { family } = gameState;
  const [partnerSalary, setPartnerSalary] = useState(family.partnerSalaryNet || 2200);
  const [partnerName, setPartnerName] = useState(family.partnerName || 'Robin');

  const handleStatusChange = (status: RelationshipStatus) => {
    sound.playPop();
    handleUpdateFamily(status, partnerName, partnerSalary, family.sharingModel);
  };

  const handleSharingChange = (model: FinancialSharingModel) => {
    sound.playPop();
    handleUpdateFamily(family.status, partnerName, partnerSalary, model);
  };

  const handleAddChild = () => {
    if (family.childrenCount >= 3) return;
    sound.playFanfare();
    handleAdjustChildren(family.childrenCount + 1);
  };

  return (
    <ModalShell
      title="Partnerschaft, Familie & Kinder"
      subtitle={`Status: ${family.status === 'MARRIED' ? 'Verheiratet 💍' : family.status === 'PARTNERSHIP' ? 'In fester Partnerschaft ❤️' : 'Single'} • ${family.childrenCount} Kinder`}
      icon="👨‍👩‍👧"
      iconBgColor="bg-rose-100 text-rose-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Beziehungsstatus Umschalter */}
        <div className="p-6 rounded-3xl bg-rose-50/60 border-2 border-rose-200">
          <h3 className="text-base font-black text-rose-950 mb-3 flex items-center gap-2">
            <Heart className="w-5 h-5 text-rose-600" />
            Beziehungs- und Familienstand
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {[
              { id: 'SINGLE', label: 'Single', desc: 'Volle finanzielle Eigenständigkeit & Flexibilität' },
              { id: 'PARTNERSHIP', label: 'Feste Partnerschaft', desc: 'Gemeinsamer Haushalt & geteilte Fixkosten' },
              { id: 'MARRIED', label: 'Verheiratet (Ehe)', desc: 'Steuerklasse III/V oder IV/IV & rechtlicher Schutz' },
            ].map((st) => (
              <button
                key={st.id}
                type="button"
                onClick={() => handleStatusChange(st.id as RelationshipStatus)}
                className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                  family.status === st.id
                    ? 'border-rose-500 bg-white shadow-xs'
                    : 'border-gray-200 bg-white/70 hover:bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-extrabold text-xs text-gray-900">{st.label}</span>
                  {family.status === st.id && <Check className="w-4 h-4 text-rose-600" />}
                </div>
                <p className="text-[11px] text-gray-500 leading-snug">{st.desc}</p>
              </button>
            ))}
          </div>
        </div>

        {/* 3-Konten-Modell vs. Getrennt bei Partnerschaft */}
        {family.status !== 'SINGLE' && (
          <div className="p-6 rounded-3xl bg-cozy-cream/60 border border-[#ede5cb]">
            <h3 className="text-base font-black text-gray-900 mb-2 flex items-center gap-2">
              <Users className="w-5 h-5 text-terracotta-600" />
              Finanz- und Kontenmodell für Paare
            </h3>
            <p className="text-xs text-gray-600 mb-4 leading-relaxed">
              Das <strong>3-Konten-Modell</strong> gilt als fairste Lösung für Paare: Beide Partner behalten ihr eigenes privates Girokonto für persönliche Ausgaben und überweisen einen fairen Anteil auf ein gemeinsames Haushaltskonto für Miete, Essen und Kinderkosten.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                {
                  id: 'THREE_ACCOUNTS',
                  label: '⭐ 3-Konten-Modell',
                  desc: '1 Gemeinschaftskonto für Fixkosten + 2 private Girokonten für Freizeit.',
                },
                {
                  id: 'SEPARATE',
                  label: 'Getrennte Kassen',
                  desc: 'Jeder zahlt seine Rechnungen selbst, 50:50 Kostenteilung.',
                },
                {
                  id: 'JOINT_POOL',
                  label: 'Ein gemeinsamer Topf',
                  desc: 'Alle Gehälter fließen auf ein einziges Gemeinschaftskonto.',
                },
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => handleSharingChange(m.id as FinancialSharingModel)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all cursor-pointer ${
                    family.sharingModel === m.id
                      ? 'border-terracotta-500 bg-white shadow-xs'
                      : 'border-gray-200 bg-white/70 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-extrabold text-xs text-gray-900">{m.label}</span>
                    {family.sharingModel === m.id && <Check className="w-4 h-4 text-terracotta-600" />}
                  </div>
                  <p className="text-[11px] text-gray-500 leading-snug">{m.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Kinder & Kindergeld */}
        <div className="p-6 rounded-3xl bg-matcha-50/60 border-2 border-matcha-200">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-matcha-950 mb-1 flex items-center gap-2">
                <Baby className="w-5 h-5 text-matcha-700" />
                Kinder & Staatliches Kindergeld
              </h3>
              <p className="text-xs text-gray-600">
                Aktuell: <strong>{family.childrenCount} Kinder</strong> • Staatliches Kindergeld: <strong>+{family.childrenCount * 250} € / Monat</strong>
              </p>
            </div>

            <button
              type="button"
              disabled={family.childrenCount >= 3}
              onClick={handleAddChild}
              className="px-5 py-2.5 bg-matcha-600 hover:bg-matcha-700 disabled:bg-gray-300 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer disabled:cursor-not-allowed"
            >
              {family.childrenCount >= 3 ? 'Max. 3 Kinder erreicht' : '+ Weiteres Kind bekommen'}
            </button>
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
