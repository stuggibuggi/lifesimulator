import React from 'react';
import type { CertificateData } from '@goal/shared-types';

type CertificatePanelProps = {
  certificate: CertificateData;
  footerHint?: string;
};

export const CertificatePanel: React.FC<CertificatePanelProps> = ({ certificate, footerHint }) => {
  return (
    <div className="p-8 rounded-3xl bg-amber-50/60 border-4 border-amber-300 text-center relative print:m-0">
      <div className="w-16 h-16 rounded-full bg-amber-200 text-amber-900 mx-auto flex items-center justify-center text-3xl shadow-sm mb-3">
        🏆
      </div>
      <h3 className="text-2xl font-black text-gray-900 tracking-tight">
        Offizielles Finanzführerschein-Zertifikat
      </h3>
      <p className="text-xs text-gray-500 uppercase tracking-widest font-extrabold mt-1">
        Lebenssimulation GOAL für Schüler & Jugendliche
      </p>

      <div className="my-6 py-4 border-y-2 border-amber-200/80">
        <p className="text-xs text-gray-600">Hiermit wird bescheinigt, dass</p>
        <h4 className="text-2xl font-black text-indigo-950 my-1">{certificate.studentName}</h4>
        <p className="text-xs text-gray-600">
          die Lebens- und Finanzsimulation erfolgreich mit der Gesamtnote{' '}
          <strong className="text-matcha-700 text-sm">
            {certificate.grade} ({certificate.overallScore} / 100 Punkten)
          </strong>{' '}
          abgeschlossen hat.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs mb-6">
        <div className="bg-white p-2.5 rounded-xl border border-amber-200">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            Endvermögen
          </span>
          <strong>{certificate.finalNetWorth.toLocaleString('de-DE')} €</strong>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-amber-200">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            Notgroschen
          </span>
          <strong>{certificate.finalEmergencyMonths} Monate</strong>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-amber-200">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            Ziele erreicht
          </span>
          <strong>
            {certificate.goalsAchievedCount} / {certificate.goalsTotalCount}
          </strong>
        </div>
        <div className="bg-white p-2.5 rounded-xl border border-amber-200">
          <span className="text-[10px] text-gray-400 font-bold uppercase block">
            Altersvorsorge
          </span>
          <strong>{certificate.pensionCoveragePercent} %</strong>
        </div>
      </div>

      <p className="text-[10px] text-gray-400 font-medium">
        Ausgestellt am {certificate.completionDate} • GOAL Educational Framework
      </p>
      {footerHint && (
        <p className="text-[10px] text-gray-500 font-bold mt-2">{footerHint}</p>
      )}
    </div>
  );
};
