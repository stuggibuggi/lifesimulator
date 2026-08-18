import React, { useEffect, useState } from 'react';
import { ModalShell } from './ModalShell';
import {
  createClassroom,
  joinClassroom,
  loadCloudRun,
  setStudentSession,
  teacherForgotPassword,
  teacherLogin,
  teacherRegister,
  teacherResetPassword,
  teacherVerify,
  getTeacherToken,
  setTeacherToken,
  setActiveClassroomId,
} from '../api/client';
import { useGameStore } from '../store/gameStore';
import { sound } from '../audio/soundSynth';

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
    window.history.replaceState({}, '', url.pathname + url.hash);
  } catch {
    // ignore
  }
}

export const ClassroomAuthModal: React.FC<ClassroomAuthModalProps> = ({ mode, onClose }) => {
  const { importSaveState, setActiveModal } = useGameStore();
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [roomCode, setRoomCode] = useState('');
  const [alias, setAlias] = useState('');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState('Klasse 9b');
  const [teacherReady, setTeacherReady] = useState(Boolean(getTeacherToken()));
  const [teacherView, setTeacherView] = useState<TeacherView>(
    getTeacherToken() ? 'LOGGED_IN' : 'AUTH'
  );
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    if (mode !== 'TEACHER') return;

    const verifyToken = readQueryParam('verifyTeacher');
    const reset = readQueryParam('resetTeacher');

    if (verifyToken) {
      setBusy(true);
      teacherVerify(verifyToken)
        .then(() => {
          clearAuthQueryParams();
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

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await joinClassroom(roomCode, alias);
      sound.playFanfare();
      setStudentSession(session);

      const cloud = await loadCloudRun();
      if (cloud?.run?.gameState) {
        const ok = importSaveState(JSON.stringify(cloud.run.gameState));
        if (!ok) throw new Error('Cloud-Spielstand ungültig.');
        onClose();
        return;
      }

      setActiveModal('SCENARIO_SELECTION_MODAL');
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Beitritt fehlgeschlagen.');
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
        setTeacherView('CHECK_MAIL');
        setInfo(data.message || 'Bitte Bestätigungslink in der E-Mail öffnen.');
        sound.playPop();
      } else {
        await teacherLogin(email, password);
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
      const data = await createClassroom(classTitle);
      setCreatedCode(data.classroom.roomCode);
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
    setCreatedCode(null);
    setTeacherReady(false);
    setTeacherView('AUTH');
  };

  return (
    <ModalShell
      title={mode === 'JOIN' ? 'Klasse beitreten' : 'Lehrer anmelden'}
      subtitle={
        mode === 'JOIN'
          ? 'Raumcode + Alias (kein Klarnamen nötig)'
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
                onChange={(e) => setAlias(e.target.value)}
                className="mt-1 w-full px-3 py-2 rounded-xl border-2 border-gray-200"
                placeholder="z. B. Fuchs42"
                minLength={2}
                required
              />
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
            <p className="text-xs text-gray-700 font-medium leading-relaxed">
              Prüfe dein Postfach (und den Spam-Ordner). Öffne den Link in der Mail, dann kannst du
              dich anmelden bzw. das Passwort setzen.
            </p>
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
                <div className="text-[10px] font-black uppercase text-indigo-700">Raumcode</div>
                <div className="text-3xl font-black tracking-widest text-indigo-950">
                  {createdCode}
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
            <button type="button" onClick={handleLogout} className="text-xs text-gray-500 underline">
              Abmelden
            </button>
          </div>
        )}
      </div>
    </ModalShell>
  );
};
