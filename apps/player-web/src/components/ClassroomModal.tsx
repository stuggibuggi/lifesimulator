import React, { useCallback, useEffect, useState } from 'react';
import { useGameStore } from '../store/gameStore';
import { evaluateLifeRun } from '@goal/scoring-engine';
import { ModalShell } from './ModalShell';
import { Printer } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  deleteClassroom,
  fetchCertificate,
  fetchClassroomSummary,
  getActiveClassroomId,
  getStudentSession,
  getTeacherToken,
  listMyClassrooms,
  setActiveClassroomId,
} from '../api/client';
import type { ClassroomCertificateResponse } from '../api/client';
import { getEducationalScenarioTitle } from './ClassroomAuthModal.helpers';
import {
  canLoadClassroomCertificate,
  formatClassroomMemberAge,
  formatClassroomMemberScore,
  formatClassroomMemberStatus,
} from './ClassroomModal.helpers';
import type { ClassroomMemberRow } from './ClassroomModal.helpers';
import { CertificatePanel } from './CertificatePanel';

type ClassroomListItem = {
  id: number;
  roomCode: string;
  title: string;
  scenarioId?: string | null;
  memberCount?: number;
};

function makeClassroomJoinUrl(roomCode: string): string {
  return `https://vorsorgenavigator.stoffner.de/?join=${encodeURIComponent(roomCode)}`;
}

export const ClassroomModal: React.FC = () => {
  const { gameState, closeModal } = useGameStore();
  const [activeTab, setActiveTab] = useState<'CLASS' | 'CERTIFICATE'>('CLASS');
  const [classrooms, setClassrooms] = useState<ClassroomListItem[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(getActiveClassroomId());
  const [roomCode, setRoomCode] = useState('—');
  const [summary, setSummary] = useState<{
    memberCount: number;
    finishedCount: number;
    averageScore: number | null;
    averageGrade: string | null;
    haftpflichtSharePercent: number;
    debtTrapAvoidedPercent: number;
    topChoices: { label: string; count: number }[];
  } | null>(null);
  const [members, setMembers] = useState<ClassroomMemberRow[]>([]);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);
  const [loadedCertificate, setLoadedCertificate] = useState<ClassroomCertificateResponse | null>(
    null
  );
  const [certificateRunIdLoading, setCertificateRunIdLoading] = useState<number | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingClassroomId, setDeletingClassroomId] = useState<number | null>(null);
  const studentSession = getStudentSession();

  const loadSummary = useCallback(async (classroomId: number, options?: { silent?: boolean }) => {
    if (!options?.silent) setLoading(true);
    setApiError(null);
    try {
      const data = await fetchClassroomSummary(classroomId);
      setSummary(data.summary);
      setMembers(data.members || []);
      setRoomCode(data.classroom.roomCode);
      setClassrooms((rooms) =>
        rooms.map((room) =>
          room.id === classroomId ? { ...room, scenarioId: data.classroom.scenarioId } : room
        )
      );
      setActiveClassroomId(classroomId);
      setSelectedId(classroomId);
      setLastUpdatedAt(new Date());
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'API nicht erreichbar');
    } finally {
      if (!options?.silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (studentSession?.roomCode) {
      setRoomCode(studentSession.roomCode);
    }

    const token = getTeacherToken();
    if (!token) return;

    let cancelled = false;
    (async () => {
      setLoading(true);
      setApiError(null);
      try {
        const list = await listMyClassrooms();
        if (cancelled) return;
        const rooms: ClassroomListItem[] = list.classrooms || [];
        setClassrooms(rooms);
        if (!rooms.length) {
          setSummary(null);
          setMembers([]);
          return;
        }

        const preferred =
          rooms.find((r) => r.id === getActiveClassroomId()) || rooms[0];
        await loadSummary(preferred.id);
      } catch (err) {
        if (!cancelled) {
          setApiError(err instanceof Error ? err.message : 'API nicht erreichbar');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [studentSession?.roomCode, loadSummary]);

  useEffect(() => {
    if (!getTeacherToken() || selectedId == null) return;

    const intervalId = window.setInterval(() => {
      void loadSummary(selectedId, { silent: true });
    }, 30000);

    return () => window.clearInterval(intervalId);
  }, [selectedId, loadSummary]);

  if (!gameState) return null;

  const evaluation = evaluateLifeRun(gameState);
  const { certificate } = evaluation;
  const certificateToShow = loadedCertificate?.certificate ?? certificate;
  const canPrintCertificate = Boolean(loadedCertificate?.certificate) || gameState.isGameOver;
  const selectedClassroom = classrooms.find((classroom) => classroom.id === selectedId);
  const joinUrl = roomCode && roomCode !== '—' ? makeClassroomJoinUrl(roomCode) : null;
  const scenarioName = getEducationalScenarioTitle(
    selectedClassroom?.scenarioId ?? studentSession?.scenarioId
  );

  const handlePrint = () => {
    window.print();
  };

  const handleSelectClassroom = (id: number) => {
    setLoadedCertificate(null);
    void loadSummary(id);
  };

  const handleDeleteClassroom = async () => {
    if (selectedId == null || !selectedClassroom) return;
    const ok = window.confirm(
      `Klasse "${selectedClassroom.title}" wirklich löschen?\n\nAlle Schüler-Zugänge, Spielstände und Zertifikate dieser Klasse werden dauerhaft entfernt.`
    );
    if (!ok) return;

    setDeletingClassroomId(selectedId);
    setApiError(null);
    try {
      await deleteClassroom(selectedId);
      const remainingClassrooms = classrooms.filter((classroom) => classroom.id !== selectedId);
      const nextClassroom = remainingClassrooms[0] ?? null;
      setClassrooms(remainingClassrooms);
      setLoadedCertificate(null);

      if (nextClassroom) {
        setActiveClassroomId(nextClassroom.id);
        await loadSummary(nextClassroom.id);
      } else {
        setSelectedId(null);
        setActiveClassroomId(null);
        setRoomCode('—');
        setSummary(null);
        setMembers([]);
        setLastUpdatedAt(null);
      }
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Klasse löschen fehlgeschlagen.');
    } finally {
      setDeletingClassroomId(null);
    }
  };

  const handleLoadCertificate = async (member: ClassroomMemberRow) => {
    if (selectedId == null || member.runId == null) return;

    setCertificateRunIdLoading(member.runId);
    setApiError(null);
    try {
      const data = await fetchCertificate(selectedId, member.runId);
      if (!data.certificate) {
        throw new Error('Zertifikat ist für diesen Lauf noch nicht gespeichert.');
      }
      setLoadedCertificate(data);
      setActiveTab('CERTIFICATE');
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Zertifikat laden fehlgeschlagen.');
    } finally {
      setCertificateRunIdLoading(null);
    }
  };

  return (
    <ModalShell
      title="Schulklasse & Lehrer-Dashboard"
      subtitle="Klassen-Challenge, Raum-Code & Finanzführerschein-Zertifikat"
      icon="🎓"
      iconBgColor="bg-indigo-100 text-indigo-700"
      onClose={closeModal}
      maxWidthClass="max-w-4xl"
    >
      <div className="space-y-6">
        <div className="flex gap-2 border-b border-gray-200 pb-3">
          <button
            type="button"
            onClick={() => setActiveTab('CLASS')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'CLASS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Klassen-Challenge & Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('CERTIFICATE')}
            className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
              activeTab === 'CERTIFICATE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            Finanzführerschein Zertifikat
          </button>
        </div>

        {apiError && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
            {apiError}
          </div>
        )}

        {lastUpdatedAt && (
          <p className="text-[10px] text-indigo-700 font-bold">
            Aktualisiert {lastUpdatedAt.toLocaleTimeString('de-DE')}
          </p>
        )}

        {activeTab === 'CLASS' && (
          <div className="space-y-6">
            {!getTeacherToken() && !studentSession && (
              <div className="p-4 rounded-2xl bg-amber-50 border-2 border-amber-200 text-xs text-amber-950">
                <strong className="font-black">Hinweis:</strong> Melde dich als Lehrer an oder tritt
                einer Klasse bei, um echte MariaDB-Daten zu sehen.
              </div>
            )}

            {classrooms.length > 0 && (
              <label className="block text-xs">
                <span className="text-[10px] font-black uppercase text-gray-500">
                  Aktiver Klassenraum
                </span>
                <select
                  value={selectedId ?? ''}
                  onChange={(e) => handleSelectClassroom(Number(e.target.value))}
                  className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-extrabold bg-white"
                >
                  {classrooms.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} ({c.roomCode})
                      {c.memberCount != null ? ` · ${c.memberCount} Schüler` : ''}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <div className="p-5 rounded-3xl bg-indigo-50/80 border-2 border-indigo-200 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-black uppercase text-indigo-800 tracking-wider">
                  Aktiver Schulklassen-Raum
                </span>
                <div className="text-2xl font-black text-indigo-950 tracking-widest mt-0.5">
                  {roomCode}
                </div>
                {scenarioName && (
                  <div className="text-xs font-extrabold text-indigo-800 mt-1">
                    Szenario: {scenarioName}
                  </div>
                )}
                <p className="text-xs text-gray-600 mt-1">
                  {loading ? 'Lade Klassendaten…' : 'Schüler verbinden sich mit diesem Code.'}
                </p>
                {joinUrl && (
                  <a
                    href={joinUrl}
                    className="mt-2 block text-[11px] font-bold text-indigo-700 underline break-all"
                  >
                    {joinUrl}
                  </a>
                )}
              </div>
              <div className="bg-white p-3 rounded-2xl border border-indigo-200 flex flex-col items-center gap-2 shadow-2xs">
                {joinUrl ? (
                  <QRCodeSVG value={joinUrl} size={96} />
                ) : (
                  <div className="w-24 h-24 rounded-xl bg-gray-100" />
                )}
                <span className="text-xs font-bold text-gray-700">Raumcode teilen</span>
              </div>
            </div>

            {getTeacherToken() && selectedClassroom && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleDeleteClassroom()}
                  disabled={deletingClassroomId === selectedClassroom.id || loading}
                  className="px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 border border-red-200 text-red-700 font-extrabold text-xs transition-all disabled:opacity-50"
                >
                  {deletingClassroomId === selectedClassroom.id ? 'Lösche Klasse…' : 'Klasse löschen'}
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-center">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  Klassendurchschnitt Note
                </span>
                <p className="text-2xl font-black text-matcha-800">
                  {summary?.averageGrade ?? '–'}
                  {summary?.averageScore != null ? ` (${summary.averageScore})` : ''}
                </p>
                <span className="text-[10px] text-gray-500">
                  {summary
                    ? `${summary.finishedCount} / ${summary.memberCount} abgeschlossen`
                    : 'Noch keine Klassenläufe'}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  Schuldenfallen vermieden
                </span>
                <p className="text-2xl font-black text-skyline-800">
                  {summary ? `${summary.debtTrapAvoidedPercent} %` : '–'}
                </p>
                <span className="text-[10px] text-gray-500">
                  {summary?.topChoices?.[0]
                    ? `Häufigste Wahl: ${summary.topChoices[0].label}`
                    : 'Aggregate ohne Giro-Details'}
                </span>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200">
                <span className="text-[10px] text-gray-400 font-bold uppercase">
                  Haftpflicht aktiv
                </span>
                <p className="text-2xl font-black text-amber-800">
                  {summary ? `${summary.haftpflichtSharePercent} %` : '–'}
                </p>
                <span className="text-[10px] text-gray-500">Anteil der Klasse</span>
              </div>
            </div>

            {members.length > 0 && (
              <div className="rounded-2xl border border-gray-200 overflow-hidden">
                <div className="bg-gray-100 px-3 py-2 text-[10px] font-black uppercase text-gray-500">
                  Schüler (Alter, Status und Score, ohne Kontostände)
                </div>
                <div className="grid grid-cols-[1.4fr_0.6fr_1fr_0.7fr_auto] gap-2 px-3 py-2 bg-white text-[10px] font-black uppercase text-gray-400">
                  <span>Alias</span>
                  <span>Alter</span>
                  <span>Status</span>
                  <span>Score</span>
                  <span className="sr-only">Zertifikat</span>
                </div>
                <ul className="divide-y divide-gray-100 text-xs">
                  {members.map((m) => (
                    <li
                      key={`${m.alias}-${m.runId}`}
                      className="grid grid-cols-[1.4fr_0.6fr_1fr_0.7fr_auto] gap-2 px-3 py-2 items-center"
                    >
                      <span className="font-extrabold text-gray-800">{m.alias}</span>
                      <span className="text-gray-600">{formatClassroomMemberAge(m)}</span>
                      <span className="text-gray-600">{formatClassroomMemberStatus(m)}</span>
                      <span className="text-gray-600 font-bold">{formatClassroomMemberScore(m)}</span>
                      <span>
                        {canLoadClassroomCertificate(m) && (
                          <button
                            type="button"
                            onClick={() => void handleLoadCertificate(m)}
                            disabled={certificateRunIdLoading === m.runId}
                            className="px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-900 font-extrabold text-[10px] transition-all disabled:opacity-50"
                          >
                            {certificateRunIdLoading === m.runId ? 'Lädt…' : 'Zertifikat'}
                          </button>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {activeTab === 'CERTIFICATE' && (
          <div>
            {loadedCertificate?.certificate && (
              <div className="mb-4 p-3 rounded-2xl bg-indigo-50 border border-indigo-200 text-xs text-indigo-900 font-bold">
                Zertifikat aus Klassenlauf geladen: {loadedCertificate.alias}
              </div>
            )}
            {!gameState.isGameOver && !loadedCertificate?.certificate && (
              <div className="mb-4 p-3 rounded-2xl bg-gray-100 border border-gray-200 text-xs text-gray-600 font-medium">
                Das Zertifikat wird nach Abschluss des Lebenslaufs freigeschaltet. Die Vorschau
                zeigt den Zwischenstand.
              </div>
            )}
            <div className={`mb-6 ${!canPrintCertificate ? 'opacity-75' : ''}`}>
              <CertificatePanel certificate={certificateToShow} />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handlePrint}
                disabled={!canPrintCertificate}
                className="px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs rounded-xl shadow-xs transition-all active:scale-95 flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <Printer className="w-4 h-4" />
                Zertifikat ausdrucken / als PDF speichern
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
