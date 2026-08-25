import React, { useEffect, useState } from 'react';
import { fetchAdminContentEvents, publishAdminContent, saveAdminContentEvent } from '../api/client';
import { useGameStore } from '../store/gameStore';
import { ModalShell } from './ModalShell';

type AdminEventRow = {
  eventId: string;
  status: 'draft' | 'published';
  body: unknown;
  updatedAt?: string | null;
};

export const ContentAdminModal: React.FC = () => {
  const { closeModal, loadPublishedContent } = useGameStore();
  const [events, setEvents] = useState<AdminEventRow[]>([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const selectedEvent = events.find((event) => event.eventId === selectedEventId);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setBusy(true);
      setError(null);
      try {
        const data = await fetchAdminContentEvents();
        if (cancelled) return;
        const rows: AdminEventRow[] = data.events || [];
        setEvents(rows);
        const first = rows[0];
        if (first) {
          setSelectedEventId(first.eventId);
          setStatus(first.status);
          setJsonText(JSON.stringify(first.body, null, 2));
        }
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Inhalte konnten nicht geladen werden.');
      } finally {
        if (!cancelled) setBusy(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSelect = (eventId: string) => {
    const row = events.find((event) => event.eventId === eventId);
    setSelectedEventId(eventId);
    setStatus(row?.status ?? 'draft');
    setJsonText(row ? JSON.stringify(row.body, null, 2) : '');
    setMessage(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!selectedEventId) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const body = JSON.parse(jsonText);
      await saveAdminContentEvent(selectedEventId, body, status);
      setEvents((rows) =>
        rows.map((row) => (row.eventId === selectedEventId ? { ...row, body, status } : row))
      );
      setMessage('Entwurf gespeichert.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Event konnte nicht gespeichert werden.');
    } finally {
      setBusy(false);
    }
  };

  const handlePublish = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await publishAdminContent();
      await loadPublishedContent();
      setEvents((rows) => rows.map((row) => ({ ...row, status: 'published' })));
      setMessage(`Veröffentlicht: Version ${result.version}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Veröffentlichung fehlgeschlagen.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <ModalShell
      title="Content-Administration"
      subtitle="Globale Events bearbeiten und veröffentlichen"
      icon="🛠️"
      iconBgColor="bg-amber-100 text-amber-800"
      onClose={closeModal}
      maxWidthClass="max-w-5xl"
    >
      <div className="space-y-4 text-sm">
        {error && (
          <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700 font-bold">
            {error}
          </div>
        )}
        {message && (
          <div className="p-3 rounded-xl bg-matcha-50 border border-matcha-200 text-xs text-matcha-900 font-bold">
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-[280px_1fr] gap-4">
          <div className="rounded-2xl border border-gray-200 overflow-hidden bg-white">
            <div className="px-3 py-2 bg-gray-100 text-[10px] font-black uppercase text-gray-500">
              Events
            </div>
            <div className="max-h-[520px] overflow-y-auto divide-y divide-gray-100">
              {events.map((event) => (
                <button
                  key={event.eventId}
                  type="button"
                  onClick={() => handleSelect(event.eventId)}
                  className={`w-full text-left px-3 py-2 text-xs transition-all ${
                    selectedEventId === event.eventId ? 'bg-amber-50 text-amber-900' : 'hover:bg-gray-50'
                  }`}
                >
                  <span className="font-extrabold block">{event.eventId}</span>
                  <span className="text-[10px] text-gray-500">
                    {event.status === 'published' ? 'veröffentlicht' : 'Entwurf'}
                  </span>
                </button>
              ))}
              {!events.length && (
                <div className="px-3 py-4 text-xs text-gray-500">
                  {busy ? 'Lade Inhalte…' : 'Noch keine Events in der Datenbank.'}
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex flex-wrap gap-2 items-end">
              <label className="text-xs">
                <span className="text-[10px] font-black uppercase text-gray-500">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as 'draft' | 'published')}
                  className="block mt-1 px-3 py-2 rounded-xl border-2 border-gray-200 bg-white font-extrabold"
                  disabled={!selectedEvent}
                >
                  <option value="draft">Entwurf</option>
                  <option value="published">Veröffentlicht</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={busy || !selectedEvent}
                className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs disabled:opacity-50"
              >
                Speichern
              </button>
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={busy}
                className="px-4 py-2 rounded-xl bg-matcha-600 hover:bg-matcha-700 text-white font-extrabold text-xs disabled:opacity-50"
              >
                Alle Entwürfe veröffentlichen
              </button>
            </div>

            <textarea
              value={jsonText}
              onChange={(e) => setJsonText(e.target.value)}
              disabled={!selectedEvent}
              spellCheck={false}
              className="w-full min-h-[520px] font-mono text-xs rounded-2xl border-2 border-gray-200 p-4 bg-gray-950 text-gray-50 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    </ModalShell>
  );
};
