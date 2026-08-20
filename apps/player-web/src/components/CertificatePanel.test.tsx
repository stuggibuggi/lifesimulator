import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { CertificateData } from '@goal/shared-types';
import { CertificatePanel } from './CertificatePanel';

const certificate: CertificateData = {
  studentName: 'Mina Muster',
  completionDate: '18.08.2026',
  grade: 'A',
  overallScore: 91,
  finalNetWorth: 123456,
  finalEmergencyMonths: 8,
  goalsAchievedCount: 3,
  goalsTotalCount: 4,
  pensionCoveragePercent: 87,
  co2Score: 72,
  keyStrengths: ['Notgroschen aufgebaut'],
};

describe('CertificatePanel', () => {
  it('renders the shared certificate copy and values', () => {
    const html = renderToStaticMarkup(
      <CertificatePanel certificate={certificate} footerHint="Klassenlauf geladen" />
    );

    expect(html).toContain('Offizielles Finanzführerschein-Zertifikat');
    expect(html).toContain('Mina Muster');
    expect(html).toContain('A (91 / 100 Punkten)');
    expect(html).toContain('123.456');
    expect(html).toContain('3 / 4');
    expect(html).toContain('Ausgestellt am 18.08.2026');
    expect(html).toContain('Klassenlauf geladen');
  });
});
