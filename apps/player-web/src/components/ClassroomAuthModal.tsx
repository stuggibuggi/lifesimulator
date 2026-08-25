import React, { useEffect, useState } from 'react';
import { EDUCATIONAL_SCENARIOS } from '@goal/game-content';
import { QRCodeSVG } from 'qrcode.react';
import { ModalShell } from './ModalShell';
import {
  createClassroom,
  deleteTeacherMe,
  joinClassroom,
  loadCloudRun,
  setStudentSession,
  teacherForgotPassword,
  teacherLogin,
  teacherRegister,
  teacherResendVerification,
  teacherResetPassword,
  teacherVerify,
  fetchTeacherMe,
  getTeacherOidcStartUrl,
  getTeacherProfile,
  getTeacherToken,
  setTeacherToken,
  setActiveClassroomId,
} from '../api/client';
import { useGameStore } from '../store/gameStore';
import { sound } from '../audio/soundSynth';
import {
  getEducationalScenarioTitle,
  normalizeClassroomCharacterName,
  resolveClassroomJoinNextStep,
  toClassroomExpiresAt,
} from './ClassroomAuthModal.helpers';

type Mode = 'JOIN' | 'TEACHER';
type TeacherView = 'AUTH' | 'FORGOT' | 'RESET' | 'CHECK_MAIL' | 'LOGGED_IN';

interface ClassroomAuthModalProps {
  mode: Mode;
  onClose: () => void;
}

function readQueryParam(name: string): string | null {
  try {
    return new URLSearchParams(window.location.search).get(name);
  } catch {
    return null;
  }
}

function clearAuthQueryParams() {
  try {
    const url = new URL(window.location.href);
    url.searchParams.delete('verifyTeacher');
    url.searchParams.delete('resetTeacher');
    url.searchParams.delete('teacherSsoToken');
    url.searchParams.delete('teacherSsoError');
    window.history.replaceState({}, '', url.pathname + url.hash);
  } catch {
    // ignore
  }
}

function makeClassroomJoinUrl(roomCode: string): string {
  return `https://vorsorgenavigator.stoffner.de/?join=${encodeURIComponent(roomCode)}`;
}

function getDefaultExpiryDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 90);
  return date.toISOString().slice(0, 10);
}

export const ClassroomAuthModal: React.FC<ClassroomAuthModalProps> = ({ mode, onClose }) => {
  const { contentScenarios, importSaveState, setActiveModal, startScenarioGame } = useGameStore();
  const scenarios = contentScenarios.length ? contentScenarios : EDUCATIONAL_SCENARIOS;
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [alias, setAlias] = useState('');
  const [characterName, setCharacterName] = useState('');
  const [pin, setPin] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [createdScenarioName, setCreatedScenarioName] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState('Klasse 9b');
  const [selectedScenarioId, setSelectedScenarioId] = useState(EDUCATIONAL_SCENARIOS[0]?.id ?? '');
  const [expiresDate, setExpiresDate] = useState(getDefaultExpiryDate);
  const [teacherReady, setTeacherReady] = useState(Boolean(getTeacherToken()));
  const [teacherProfile, setTeacherProfileState] = useState(getTeacherProfile());
  const [teacherView, setTeacherView] = useState<TeacherView>(
    getTeacherToken() ? 'LOGGED_IN' : 'AUTH'
  );
  const [mailSent, setMailSent] = useState(true);
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');

  useEffect(() => {
    if (mode !== 'TEACHER') return;

    const verifyToken = readQueryParam('verifyTeacher');
    const reset = readQueryParam('resetTeacher');
    const teacherSsoToken = readQueryParam('teacherSsoToken');
    const teacherSsoError = readQueryParam('teacherSsoError');

    if (teacherSsoError) {
      clearAuthQueryParams();
      setError(teacherSsoError);
      setTeacherView('AUTH');
      return;
    }

    if (teacherSsoToken) {
      setBusy(true);
      setTeacherToken(teacherSsoToken);
      fetchTeacherMe()
        .then((profile) => {
          clearAuthQueryParams();
          setTeacherProfileState(profile);
          setTeacherReady(true);
          setTeacherView('LOGGED_IN');
          setInfo('Schul-SSO erfolgreich. Du bist angemeldet.');
          sound.playFanfare();
        })
        .catch((err) => {
          setTeacherToken(null);
          setError(err instanceof Error ? err.message : 'Schul-SSO-Anmeldung fehlgeschlagen.');
          setTeacherView('AUTH');
        })
        .finally(() => setBusy(false));
      return;
    }

    if (verifyToken) {
      setBusy(true);
      teacherVerify(verifyToken)
        .then(() => {
          clearAuthQueryParams();
          setTeacherProfileState(getTeacherProfile());
          setTeacherReady(true);
          setTeacherView('LOGGED_IN');
          setInfo('E-Mail bestätigt. Du bist angemeldet.');
          sound.playFanfare();
        })
        .catch((err) => {
          setError(err instanceof Error ? err.message : 'Bestätigung fehlgeschlagen.');
          setTeacherView('AUTH');
        })
        .finally(() => setBusy(false));
      return;
    }

    if (reset) {
      setResetToken(reset);
      setTeacherView('RESET');
      clearAuthQueryParams();
    }
  }, [mode]);

  useEffect(() => {
    if (mode !== 'TEACHER' || !getTeacherToken()) return;
    fetchTeacherMe()
      .then((profile) => setTeacherProfileState(profile))
      .catch(() => {
        // Existing token may be stale; normal actions will surface auth errors.
      });
  }, [mode, teacherReady]);

  useEffect(() => {
    if (mode !== 'JOIN') return;
    const joinCode = readQueryParam('join')?.trim().toUpperCase();
    if (joinCode) setRoomCode(joinCode);
  }, [mode]);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await joinClassroom(roomCode, alias, pin);
      const normalizedCharacterName = normalizeClassroomCharacterName(session.alias, characterName);
      const sessionWithCharacterName = {
        ...session,
        characterName: normalizedCharacterName,
      };
      sound.playFanfare();
      setStudentSession(sessionWithCharacterName);

      const cloud = await loadCloudRun();
      const nextStep = resolveClassroomJoinNextStep({
        hasCloudGameState: Boolean(cloud?.run?.gameState),
        scenarioId: sessionWithCharacterName.scenarioId,
      });
      if (cloud?.run?.gameState) {
        const ok = importSaveState(JSON.stringify(cloud.run.gameState));
        if (!ok) throw new Error('Cloud-Spielstand ungültig.');
        onClose();
        return;
      }

      if (nextStep.type === 'START_SCENARIO') {
        startScenarioGame(nextStep.scenario, sessionWithCharacterName.characterName);
      } else {
        setActiveModal('SCENARIO_SELECTION_MODAL');
      }
      onClose();
    } catch (err) {
      const needsPin = Boolean(err && typeof err === 'object' && 'needsPin' in err);
      const message = err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.';
      setError(
        needsPin && !pin.trim()
          ? 'Diesen Alias gibt es schon. Gib die passende PIN ein, um deinen Spielstand zu laden.'
          : message
      );
    } finally {
      setBusy(false);
    }
  };

  const handleTeacherAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      if (isRegister) {
        const data = await teacherRegister(email, password, displayName || undefined);
        setMailSent(data.mailSent !== false);
        setTeacherView('CHECK_MAIL');
        setInfo(data.message || 'Bitte Bestätigungslink in der E-Mail öffnen.');
        sound.playPop();
      } else {
        await teacherLogin(email, password);
        setTeacherProfileState(getTeacherProfile());
        setTeacherReady(true);
        setTeacherView('LOGGED_IN');
        sound.playPop();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleTeacherOidcStart = () => {
    setError(null);
    setInfo(null);
    window.location.assign(getTeacherOidcStartUrl());
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const data = await teacherForgotPassword(email);
      setInfo(data.message);
      setTeacherView('CHECK_MAIL');
      sound.playPop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anfrage fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetToken) return;
    setBusy(true);
    setError(null);
    try {
      const data = await teacherResetPassword(resetToken, newPassword);
      setInfo(data.message);
      setTeacherView('AUTH');
      setIsRegister(false);
      setResetToken(null);
      setNewPassword('');
      sound.playFanfare();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reset fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleCreateRoom = async () => {
    setBusy(true);
    setError(null);
    try {
      const data = await createClassroom(
        classTitle,
        selectedScenarioId || undefined,
        toClassroomExpiresAt(expiresDate)
      );
      setCreatedCode(data.classroom.roomCode);
      setCreatedScenarioName(getEducationalScenarioTitle(data.classroom.scenarioId));
      if (data.classroom?.id) setActiveClassroomId(data.classroom.id);
      sound.playFanfare();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Raum erstellen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = () => {
    setTeacherToken(null);
    setTeacherProfileState(null);
    setCreatedCode(null);
    setCreatedScenarioName(null);
    setTeacherReady(false);
    setTeacherView('AUTH');
  };

  const handleDeleteTeacherAccount = async () => {
    const ok = window.confirm(
      'Lehrerkonto wirklich löschen?\n\nAlle Klassenräume, Schüler-Zugänge, Spielstände und Zertifikate werden dauerhaft entfernt.'
    );
    if (!ok) return;

    setBusy(true);
    setError(null);
    try {
      await deleteTeacherMe(deletePassword);
      setDeletePassword('');
      setCreatedCode(null);
      setCreatedScenarioName(null);
      setTeacherReady(false);
      setTeacherView('AUTH');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Konto löschen fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title={mode === 'JOIN' ? 'Klasse beitreten' : 'Lehrer anmelden'}
      subtitle={
        mode === 'JOIN'
          ? 'Raumcode + Alias + PIN (kein Klarnamen nötig)'
          : 'E-Mail-Bestätigung, Passwort-Reset & Klassenräume (MariaDB)'
      }
      icon={mode === 'JOIN' ? '🧑‍🎓' : '👩‍🏫'}
      iconBgColor="bg-indigo-100 text-indigo-700"
      onClose={onClose}
      maxWidthClass="max-w-lg"
    >
      <div className="space-y-4 text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-bold">
            {error}
          </div>
        )}
        {info && (
          <div className="p-3 rounded-xl bg-matcha-50 border border-matcha-200 text-matcha-900 text-xs font-bold">
            {info}
          </div>
        )}

        {mode === 'JOIN' && (
          <form onSubmit={handleJoin} className="space-y-3">
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">Raumcode</span>
              <input
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-extrabold tracking-widest"
                placeholder="z. B. 9BK7M2"
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">
                Alias / Anzeigename
              </span>
              <input
                value={alias}
                onChange={(e) => {
                  const nextAlias = e.target.value;
                  setAlias(nextAlias);
                  if (!characterName.trim()) setCharacterName(nextAlias);
                }}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200"
                placeholder="z. B. Fuchs42"
                minLength={2}
                required
              />
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">
                Vorname fürs Spiel
              </span>
              <input
                value={characterName}
                onChange={(e) => setCharacterName(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200"
                placeholder={alias || 'z. B. Mia'}
                maxLength={40}
              />
              <span className="mt-1 block text-[11px] font-semibold text-gray-500">
                Dieser Name erscheint im Spiel. Wenn du leer lässt, verwenden wir deinen Alias.
              </span>
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">
                PIN für diesen Alias
              </span>
              <input
                type="password"
                inputMode="numeric"
                pattern="\d{4,6}"
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200 tracking-widest"
                placeholder="4–6 Ziffern, z. B. 1234"
                minLength={4}
                maxLength={6}
                required
              />
              <span className="mt-1 block text-[11px] font-semibold text-gray-500">
                Merke dir die PIN: Damit kannst du denselben Alias auf einem anderen Gerät fortsetzen.
              </span>
            </label>
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold disabled:opacity-50"
            >
              {busy ? 'Verbinde…' : 'Beitreten & Cloud-Save aktivieren'}
            </button>
          </form>
        )}

        {mode === 'TEACHER' && teacherView === 'AUTH' && (
          <form onSubmit={handleTeacherAuth} className="space-y-3">
            <div className="flex gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className={`px-3 py-1.5 rounded-lg ${
                  !isRegister ? 'bg-indigo-600 text-white' : 'bg-gray-100'
                }`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className={`px-3 py-1.5 rounded-lg ${
                  isRegister ? 'bg-indigo-600 text-white' : 'bg-gray-100'
                }`}
              >
                Registrieren
              </button>
            </div>
            {isRegister && (
              <input
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
                placeholder="Anzeigename (optional)"
              />
            )}
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
              placeholder="E-Mail"
              required
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
              placeholder="Passwort (mind. 8 Zeichen)"
              minLength={8}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold disabled:opacity-50"
            >
              {busy ? 'Bitte warten…' : isRegister ? 'Konto anlegen' : 'Anmelden'}
            </button>
            {!isRegister && (
              <button
                type="button"
                disabled={busy}
                onClick={handleTeacherOidcStart}
                className="w-full py-3 rounded-2xl bg-gray-900 hover:bg-gray-800 text-white font-extrabold disabled:opacity-50"
              >
                Mit Schul-SSO anmelden
              </button>
            )}
            {!isRegister && (
              <button
                type="button"
                onClick={() => {
                  setTeacherView('FORGOT');
                  setError(null);
                  setInfo(null);
                }}
                className="text-xs text-indigo-700 underline font-bold"
              >
                Passwort vergessen?
              </button>
            )}
          </form>
        )}

        {mode === 'TEACHER' && teacherView === 'FORGOT' && (
          <form onSubmit={handleForgot} className="space-y-3">
            <p className="text-xs text-gray-600">
              Wir senden einen Reset-Link an deine bestätigte E-Mail-Adresse.
            </p>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
              placeholder="E-Mail"
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-extrabold disabled:opacity-50"
            >
              Link senden
            </button>
            <button
              type="button"
              onClick={() => setTeacherView('AUTH')}
              className="text-xs text-gray-500 underline"
            >
              Zurück zum Login
            </button>
          </form>
        )}

        {mode === 'TEACHER' && teacherView === 'RESET' && (
          <form onSubmit={handleReset} className="space-y-3">
            <p className="text-xs text-gray-600">Neues Passwort wählen (mind. 8 Zeichen).</p>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
              placeholder="Neues Passwort"
              minLength={8}
              required
            />
            <button
              type="submit"
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-matcha-600 text-white font-extrabold disabled:opacity-50"
            >
              Passwort speichern
            </button>
          </form>
        )}

        {mode === 'TEACHER' && teacherView === 'CHECK_MAIL' && (
          <div className="space-y-3">
            {mailSent ? (
              <p className="text-xs text-gray-700 font-medium leading-relaxed">
                Prüfe dein Postfach (und den Spam-Ordner). Öffne den Link in der Mail, dann kannst du
                dich anmelden bzw. das Passwort setzen.
              </p>
            ) : (
              <p className="text-xs text-amber-900 font-medium leading-relaxed">
                Die Mail konnte serverseitig nicht versendet werden. Sobald SMTP funktioniert, kannst
                du die Bestätigung erneut anfordern.
              </p>
            )}
            {email && (
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  setBusy(true);
                  setError(null);
                  try {
                    const data = await teacherResendVerification(email);
                    setInfo(data.message);
                    setMailSent(true);
                    sound.playPop();
                  } catch (err) {
                    setError(err instanceof Error ? err.message : 'Senden fehlgeschlagen.');
                  } finally {
                    setBusy(false);
                  }
                }}
                className="w-full py-2 rounded-xl bg-indigo-600 text-white font-extrabold text-xs disabled:opacity-50"
              >
                Bestätigung erneut senden
              </button>
            )}
            <button
              type="button"
              onClick={() => setTeacherView('AUTH')}
              className="w-full py-2 rounded-xl bg-gray-900 text-white font-extrabold text-xs"
            >
              Zurück zum Login
            </button>
          </div>
        )}

        {mode === 'TEACHER' && teacherView === 'LOGGED_IN' && teacherReady && (
          <div className="space-y-3">
            <p className="text-xs text-gray-600 font-medium">
              Angemeldet. Erstelle einen Raumcode für deine Klasse.
            </p>
            <input
              value={classTitle}
              onChange={(e) => setClassTitle(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border-2 border-gray-200"
              placeholder="Klassentitel"
            />
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">
                Gültig bis
              </span>
              <input
                type="date"
                value={expiresDate}
                onChange={(e) => setExpiresDate(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200"
              />
              <span className="mt-1 block text-[11px] font-semibold text-gray-500">
                Standard: 90 Tage. Nach Ablauf können keine Schüler mehr beitreten.
              </span>
            </label>
            <label className="block">
              <span className="text-[10px] font-black uppercase text-gray-500">
                Festes Unterrichtsszenario
              </span>
              <select
                value={selectedScenarioId}
                onChange={(e) => setSelectedScenarioId(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200 font-extrabold bg-white"
              >
                {scenarios.map((scenario) => (
                  <option key={scenario.id} value={scenario.id}>
                    {scenario.title}
                  </option>
                ))}
              </select>
              <span className="mt-1 block text-[11px] font-semibold text-gray-500">
                Schüler starten automatisch mit diesem Szenario, solange kein Cloud-Spielstand
                existiert.
              </span>
            </label>
            <button
              type="button"
              onClick={handleCreateRoom}
              disabled={busy}
              className="w-full py-3 rounded-2xl bg-matcha-600 hover:bg-matcha-700 text-white font-extrabold disabled:opacity-50"
            >
              Raumcode erzeugen
            </button>
            {createdCode && (
              <div className="p-4 rounded-2xl bg-indigo-50 border-2 border-indigo-200 text-center">
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-center text-left">
                  <div className="text-center sm:text-left">
                    <div className="text-[10px] font-black uppercase text-indigo-700">Raumcode</div>
                    <div className="text-3xl font-black tracking-widest text-indigo-950">
                      {createdCode}
                    </div>
                    {createdScenarioName && (
                      <div className="mt-1 text-xs font-extrabold text-indigo-800">
                        Szenario: {createdScenarioName}
                      </div>
                    )}
                    <a
                      href={makeClassroomJoinUrl(createdCode)}
                      className="mt-2 block text-[11px] font-bold text-indigo-700 underline break-all"
                    >
                      {makeClassroomJoinUrl(createdCode)}
                    </a>
                  </div>
                  <div className="mx-auto p-2 rounded-xl bg-white border border-indigo-200">
                    <QRCodeSVG value={makeClassroomJoinUrl(createdCode)} size={112} />
                  </div>
                </div>
              </div>
            )}
            <button
              type="button"
              onClick={() => {
                onClose();
                setActiveModal('CLASSROOM_MODAL');
              }}
              className="w-full py-2 rounded-xl bg-gray-900 text-white font-extrabold text-xs"
            >
              Zum Klassen-Dashboard
            </button>
            {teacherProfile?.isAdmin && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  setActiveModal('CONTENT_ADMIN_MODAL');
                }}
                className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs"
              >
                Content verwalten
              </button>
            )}
            <button type="button" onClick={handleLogout} className="text-xs text-gray-500 underline">
              Abmelden
            </button>
            <div className="mt-4 p-3 rounded-2xl bg-red-50 border border-red-200 space-y-2">
              <div>
                <div className="text-[10px] font-black uppercase text-red-700">
                  Konto löschen
                </div>
                <p className="text-[11px] font-semibold text-red-800">
                  Entfernt dein Lehrerkonto inklusive Klassenräumen, Spielständen und Zertifikaten.
                </p>
              </div>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border-2 border-red-200 bg-white"
                placeholder="Passwort zur Bestätigung"
                minLength={1}
              />
              <button
                type="button"
                onClick={() => void handleDeleteTeacherAccount()}
                disabled={busy || !deletePassword}
                className="w-full py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs disabled:opacity-50"
              >
                Konto dauerhaft löschen
              </button>
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
