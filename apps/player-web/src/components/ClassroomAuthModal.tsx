import React, { useState } from 'react';
import { ModalShell } from './ModalShell';
import {
  createClassroom,
  joinClassroom,
  listMyClassrooms,
  loadCloudRun,
  setStudentSession,
  teacherLogin,
  teacherRegister,
  getTeacherToken,
  setTeacherToken,
} from '../api/client';
import { useGameStore } from '../store/gameStore';
import { SeededRandom } from '@goal/simulation-engine';
import { sound } from '../audio/soundSynth';

type Mode = 'JOIN' | 'TEACHER';

interface ClassroomAuthModalProps {
  mode: Mode;
  onClose: () => void;
}

export const ClassroomAuthModal: React.FC<ClassroomAuthModalProps> = ({ mode, onClose }) => {
  const { importSaveState, setActiveModal } = useGameStore();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // Student join
  const [roomCode, setRoomCode] = useState('');
  const [alias, setAlias] = useState('');

  // Teacher
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isRegister, setIsRegister] = useState(false);
  const [createdCode, setCreatedCode] = useState<string | null>(null);
  const [classTitle, setClassTitle] = useState('Klasse 9b');
  const [teacherReady, setTeacherReady] = useState(Boolean(getTeacherToken()));
  const loggedIn = teacherReady;

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const session = await joinClassroom(roomCode, alias);
      sound.playFanfare();

      const cloud = await loadCloudRun();
      if (cloud?.run?.gameState) {
        const ok = importSaveState(JSON.stringify(cloud.run.gameState));
        if (!ok) throw new Error('Cloud-Spielstand ungültig.');
      } else {
        // No cloud save yet – start via scenarios if provided, else normal welcome flow continues
        setStudentSession(session);
        setActiveModal('SCENARIO_SELECTION_MODAL');
        onClose();
        return;
      }
      setStudentSession(session);
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
    try {
      if (isRegister) {
        await teacherRegister(email, password, displayName || undefined);
      } else {
        await teacherLogin(email, password);
      }
      setTeacherReady(true);
      sound.playPop();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login fehlgeschlagen.');
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
  };

  return (
    <ModalShell
      title={mode === 'JOIN' ? 'Klasse beitreten' : 'Lehrer anmelden'}
      subtitle={
        mode === 'JOIN'
          ? 'Raumcode + Alias (kein Klarnamen nötig)'
          : 'Klassenräume erstellen und auswerten (MariaDB)'
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
              <span className="text-[10px] font-black uppercase text-gray-500">Alias / Anzeigename</span>
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

        {mode === 'TEACHER' && !loggedIn && (
          <form onSubmit={handleTeacherAuth} className="space-y-3">
            <div className="flex gap-2 text-xs font-bold">
              <button
                type="button"
                onClick={() => setIsRegister(false)}
                className={`px-3 py-1.5 rounded-lg ${!isRegister ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
              >
                Login
              </button>
              <button
                type="button"
                onClick={() => setIsRegister(true)}
                className={`px-3 py-1.5 rounded-lg ${isRegister ? 'bg-indigo-600 text-white' : 'bg-gray-100'}`}
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
          </form>
        )}

        {mode === 'TEACHER' && loggedIn && (
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
                <div className="text-3xl font-black tracking-widest text-indigo-950">{createdCode}</div>
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

// silence unused import when tree-shaken oddly
void listMyClassrooms;
void SeededRandom;
