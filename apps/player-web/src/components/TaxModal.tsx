import React, { useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { TaxClass } from '@goal/shared-types';
import { calculateGermanPayroll } from '@goal/simulation-engine';
import { ModalShell } from './ModalShell';
import { sound } from '../audio/soundSynth';
import {
  Scale,
} from 'lucide-react';

export const TaxModal: React.FC = () => {
  const { gameState, closeModal, handleSetTaxParameters } = useGameStore();

  if (!gameState) return null;

  const { career, tax, family } = gameState;
  const [selectedClass, setSelectedClass] = useState<TaxClass>(tax.taxClass || 'I');
  const [churchTax, setChurchTax] = useState(tax.hasChurchTax || false);

  const previewTax = calculateGermanPayroll(
    career.monthlySalaryGross,
    selectedClass,
    churchTax,
    family.childrenCount,
    gameState.currentAge
  );

  const handleApplyTax = (e: React.FormEvent) => {
    e.preventDefault();
    sound.playPop();
    handleSetTaxParameters(selectedClass, churchTax);
    alert('Steuerparameter wurden erfolgreich aktualisiert!');
  };

  return (
    <ModalShell
      title="Lohnabrechnung & Steuersystem"
      subtitle="Brutto-Netto-Aufschlüsselung, Sozialabgaben & Steuerklassen"
      icon="🧾"
      iconBgColor="bg-amber-100 text-amber-800"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        {/* Lohnabrechnung Explorer / Gehaltszettel */}
        <div className="bg-gray-50 border-2 border-gray-200 rounded-3xl p-6 font-mono text-xs shadow-inner">
          <div className="flex items-center justify-between border-b-2 border-gray-300 pb-3 mb-4 font-sans font-black text-sm text-gray-800">
            <span>Muster-Gehaltsabrechnung ({career.title})</span>
            <span className="text-xs font-bold text-gray-500">Steuerklasse {previewTax.taxClass}</span>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center text-sm font-black text-gray-900 pb-2 border-b border-gray-200 font-sans">
              <span>1. Bruttogehalt (Gesamtvergütung):</span>
              <span className="text-base text-gray-900">+{previewTax.grossMonthly.toLocaleString('de-DE')} €</span>
            </div>

            {/* Gesetzliche Abzüge */}
            <div className="text-[11px] text-gray-500 font-sans font-bold uppercase pt-1">
              Gesetzliche Sozialversicherungsbeiträge (Arbeitnehmeranteil):
            </div>
            <div className="flex justify-between text-gray-700 pl-3">
              <span>- Rentenversicherung (9,30 %):</span>
              <span className="text-red-700">-{previewTax.pensionInsuranceMonthly.toLocaleString('de-DE')} €</span>
            </div>
            <div className="flex justify-between text-gray-700 pl-3">
              <span>- Krankenversicherung (8,40 % inkl. Zusatzbeitrag):</span>
              <span className="text-red-700">-{previewTax.healthInsuranceMonthly.toLocaleString('de-DE')} €</span>
            </div>
            <div className="flex justify-between text-gray-700 pl-3">
              <span>- Pflegeversicherung ({family.childrenCount > 0 ? '2,20 %' : '2,60 %'}):</span>
              <span className="text-red-700">-{previewTax.nursingInsuranceMonthly.toLocaleString('de-DE')} €</span>
            </div>
            <div className="flex justify-between text-gray-700 pl-3">
              <span>- Arbeitslosenversicherung (1,30 %):</span>
              <span className="text-red-700">-{previewTax.unemploymentInsuranceMonthly.toLocaleString('de-DE')} €</span>
            </div>

            <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-200">
              <span>Zwischensumme Sozialabgaben (~20–22 %):</span>
              <span className="text-red-800">-{previewTax.totalSocialDeductionsMonthly.toLocaleString('de-DE')} €</span>
            </div>

            {/* Steuern */}
            <div className="text-[11px] text-gray-500 font-sans font-bold uppercase pt-2">
              Steuerabzüge (Finanzamt):
            </div>
            <div className="flex justify-between text-gray-700 pl-3">
              <span>- Lohnsteuer (nach Einkommensteuer-Tarif):</span>
              <span className="text-red-700">-{previewTax.incomeTaxMonthly.toLocaleString('de-DE')} €</span>
            </div>
            {previewTax.churchTaxMonthly > 0 && (
              <div className="flex justify-between text-gray-700 pl-3">
                <span>- Kirchensteuer (9 % der Lohnsteuer):</span>
                <span className="text-red-700">-{previewTax.churchTaxMonthly.toLocaleString('de-DE')} €</span>
              </div>
            )}

            <div className="flex justify-between font-bold text-gray-800 pt-1 border-t border-gray-200">
              <span>Zwischensumme Steuern:</span>
              <span className="text-red-800">-{previewTax.totalTaxesMonthly.toLocaleString('de-DE')} €</span>
            </div>

            {/* Auszahlungsbetrag Netto */}
            <div className="flex justify-between items-center text-base font-black text-matcha-900 pt-4 border-t-2 border-gray-400 font-sans bg-matcha-100/70 p-3 rounded-2xl">
              <span>2. Auszahlungsbetrag (Nettogehalt aufs Girokonto):</span>
              <span className="text-xl">+{previewTax.netMonthly.toLocaleString('de-DE')} €</span>
            </div>
          </div>
        </div>

        {/* Steuerklassen-Konfigurator */}
        <form onSubmit={handleApplyTax} className="p-6 rounded-3xl bg-cozy-cream/60 border border-[#ede5cb]">
          <h4 className="font-black text-sm text-gray-900 mb-3 flex items-center gap-2">
            <Scale className="w-4 h-4 text-terracotta-600" />
            Steuerklasse & Kirchensteuer anpassen
          </h4>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-[11px] font-bold text-gray-700 mb-1">Steuerklasse:</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value as TaxClass)}
                className="w-full p-2 bg-white rounded-xl border border-gray-300 font-bold text-xs"
              >
                <option value="I">Klasse I (Single / Alleinstehend)</option>
                <option value="II">Klasse II (Alleinerziehend mit Kind)</option>
                <option value="III">Klasse III (Verheiratet - Besserverdiener)</option>
                <option value="IV">Klasse IV (Verheiratet - Beide verdienen ähnlich)</option>
                <option value="V">Klasse V (Verheiratet - Zweitverdiener)</option>
              </select>
            </div>

            <div className="flex items-center gap-2 pt-6">
              <input
                type="checkbox"
                id="churchTaxCheckbox"
                checked={churchTax}
                onChange={(e) => setChurchTax(e.target.checked)}
                className="accent-terracotta-600 rounded"
              />
              <label htmlFor="churchTaxCheckbox" className="text-xs font-bold text-gray-700">
                Kirchensteuerpflichtig (8–9 %)
              </label>
            </div>

            <button
              type="submit"
              className="py-2.5 bg-terracotta-600 hover:bg-terracotta-700 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 cursor-pointer"
            >
              Steuerklasse anwenden
            </button>
          </div>
        </form>
      </div>
    </ModalShell>
  );
};
