import React from 'react';
import { useGameStore } from '../store/gameStore';
import { ModalShell } from './ModalShell';
import { ArrowDownRight, ArrowUpRight } from 'lucide-react';

export const TransactionsModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();

  if (!gameState) return null;

  return (
    <ModalShell
      title="Kontoauszug & Buchungen"
      subtitle="Letzte Einnahmen, Ausgaben und Monatsabschlüsse"
      icon="🧾"
      iconBgColor="bg-gray-100 text-gray-700"
      onClose={closeModal}
      maxWidthClass="max-w-2xl"
    >
      <div className="space-y-2">
        {gameState.transactions.length === 0 ? (
          <p className="text-center text-xs text-gray-400 py-8 font-medium">
            Noch keine Buchungen vorhanden.
          </p>
        ) : (
          gameState.transactions.map((tx) => (
            <div
              key={tx.id}
              className="p-3.5 rounded-2xl bg-gray-50 border border-gray-200 flex items-center justify-between gap-3 text-xs shadow-2xs"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    tx.amount >= 0 ? 'bg-matcha-100 text-matcha-700' : 'bg-red-100 text-red-700'
                  }`}
                >
                  {tx.amount >= 0 ? (
                    <ArrowUpRight className="w-4 h-4" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h4 className="font-extrabold text-gray-900 leading-tight">{tx.description}</h4>
                  <span className="text-[10px] text-gray-400 font-bold">
                    Alter {tx.age} • Jahr {tx.year}, Monat {tx.month}
                  </span>
                </div>
              </div>

              <div
                className={`font-black text-sm shrink-0 ${
                  tx.amount >= 0 ? 'text-matcha-700' : 'text-red-700'
                }`}
              >
                {tx.amount >= 0 ? '+' : ''}
                {tx.amount.toLocaleString('de-DE')} €
              </div>
            </div>
          ))
        )}
      </div>
    </ModalShell>
  );
};
