import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { FINANCIAL_LEARNING_CARDS, LearningCard } from '@goal/game-content';
import { ModalShell } from './ModalShell';
import {
  ShieldCheck,
  AlertCircle,
  TrendingUp,
  PieChart,
  Umbrella,
  Receipt,
  Layers,
  Building,
  Home,
  Percent,
  ShoppingBag,
  RefreshCw,
  Car,
} from 'lucide-react';

const ICON_MAP: Record<string, React.ReactNode> = {
  ShieldCheck: <ShieldCheck className="w-5 h-5 text-matcha-600" />,
  AlertCircle: <AlertCircle className="w-5 h-5 text-red-500" />,
  Umbrella: <Umbrella className="w-5 h-5 text-amber-500" />,
  TrendingUp: <TrendingUp className="w-5 h-5 text-skyline-600" />,
  PieChart: <PieChart className="w-5 h-5 text-terracotta-500" />,
  Receipt: <Receipt className="w-5 h-5 text-amber-600" />,
  Layers: <Layers className="w-5 h-5 text-indigo-600" />,
  Building: <Building className="w-5 h-5 text-terracotta-600" />,
  Home: <Home className="w-5 h-5 text-emerald-600" />,
  Percent: <Percent className="w-5 h-5 text-blue-600" />,
  ShoppingBag: <ShoppingBag className="w-5 h-5 text-rose-500" />,
  RefreshCw: <RefreshCw className="w-5 h-5 text-indigo-500" />,
  Car: <Car className="w-5 h-5 text-emerald-600" />,
};

export const LearningModal: React.FC = () => {
  const { closeModal } = useGameStore();
  const [selectedCard, setSelectedCard] = useState<LearningCard>(FINANCIAL_LEARNING_CARDS[0]);

  return (
    <ModalShell
      title="Wissensbibliothek für Schüler"
      subtitle="Finanzwissen auf den Punkt gebracht: Notgroschen, Dispo, Haftpflicht & Rente"
      icon="📚"
      iconBgColor="bg-matcha-100 text-matcha-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card list */}
        <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1 custom-scrollbar">
          {FINANCIAL_LEARNING_CARDS.map((card) => (
            <button
              key={card.id}
              onClick={() => setSelectedCard(card)}
              type="button"
              className={`w-full text-left p-3 rounded-2xl border-2 transition-all flex items-center gap-3 cursor-pointer ${
                selectedCard.id === card.id
                  ? 'border-matcha-500 bg-matcha-50 shadow-xs'
                  : 'border-gray-200 bg-gray-50 hover:bg-white'
              }`}
            >
              <div className="p-2 rounded-xl bg-white shadow-xs shrink-0">
                {ICON_MAP[card.icon] || '💡'}
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-xs text-gray-900 leading-tight truncate">
                  {card.title}
                </h4>
                <span className="text-[10px] text-gray-400 font-bold uppercase block">
                  {card.category}
                </span>
              </div>
            </button>
          ))}
        </div>

        {/* Detailed Card View */}
        <div className="md:col-span-2 bg-cozy-cream/60 p-6 md:p-7 rounded-3xl border border-[#ede5cb] flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-matcha-100 text-matcha-800 text-[10px] font-black px-2.5 py-1 rounded-full uppercase">
                {selectedCard.category}
              </span>
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">
              {selectedCard.title}
            </h3>

            <p className="text-xs font-bold text-gray-700 mb-4 bg-white p-3.5 rounded-xl border border-gray-200 shadow-2xs">
              {selectedCard.shortSummary}
            </p>

            <p className="text-xs text-gray-600 leading-relaxed mb-6 font-medium whitespace-pre-line">
              {selectedCard.detailedText}
            </p>
          </div>

          {selectedCard.keyFormulaOrRule && (
            <div className="bg-amber-50/90 p-3.5 rounded-xl border border-amber-200 text-xs text-amber-900 font-bold shadow-2xs">
              💡 {selectedCard.keyFormulaOrRule}
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};
