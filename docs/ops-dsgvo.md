# Ops / DSGVO: Klassenmodus

Diese Notiz beschreibt die Datenhaltung fuer den Klassenmodus der GOAL Lebenssimulation. Sie ist fuer Betrieb, Support und manuelle Datenschutz-Anfragen gedacht.

## Gespeicherte Daten

- `teachers`: Lehrer-Konto mit E-Mail, Passwort-Hash, optionalem Anzeigenamen sowie Verifikations- und Reset-Token-Hashes.
- `classrooms`: Klassenraum mit Lehrer-Zuordnung, Raumcode, Titel, optionalem Szenario und Ablaufdatum.
- `memberships`: Schueler-Alias, Session-Token, PIN-Hash und letzter Zugriff. Es werden keine Klarnamen benoetigt.
- `game_runs`: Spielstand, aktuelles Alter, Abschlussstatus und Score fuer den Alias.
- `evaluations`: Zertifikat und Bewertungsdimensionen nach abgeschlossenem Lauf.

## Loeschverhalten

Lehrer koennen eigene Klassen im Dashboard ueber **Klasse loeschen** entfernen. Die API prueft den Lehrer-JWT, laesst nur den Besitzer loeschen und fuehrt dann `DELETE FROM classrooms WHERE id = ? AND teacher_id = ?` aus.

Die MariaDB-FKs in `apps/api/schema.sql` sind mit `ON DELETE CASCADE` definiert:

- `classrooms` -> `memberships`
- `memberships` -> `game_runs`
- `game_runs` -> `evaluations`

Damit entfernt eine Klassenloeschung automatisch alle Alias-Zugaenge, Spielstaende und Zertifikate dieser Klasse. Lehrer-Konten bleiben bestehen.

## Aufbewahrung

- Aktive Klassen bleiben erhalten, bis der Lehrer sie loescht oder ein Ops-Prozess abgelaufene Klassen entfernt.
- `expires_at` markiert abgelaufene Klassen fuer den Beitritt, loescht aber nicht automatisch Daten.
- Empfohlene Routine: abgelaufene Klassen nach der mit der Schule vereinbarten Frist loeschen, z. B. nach Schuljahresende plus Support-Puffer.
- Backups folgen der Plesk/MariaDB-Backup-Retention. Loeschungen verschwinden erst nach Ablauf der Backup-Aufbewahrung aus Sicherungen.

## Manuelle SQL-Operationen

Vor manuellen Loeschungen immer ein aktuelles Backup pruefen und die betroffene Klasse eindeutig identifizieren.

```sql
-- Klasse eines Lehrers finden
SELECT c.id, c.room_code, c.title, c.created_at, c.expires_at, t.email
FROM classrooms c
JOIN teachers t ON t.id = c.teacher_id
WHERE c.room_code = 'ABC123';

-- Umfang vor Loeschung pruefen
SELECT
  (SELECT COUNT(*) FROM memberships WHERE classroom_id = 42) AS memberships,
  (SELECT COUNT(*)
   FROM game_runs g
   JOIN memberships m ON m.id = g.membership_id
   WHERE m.classroom_id = 42) AS game_runs,
  (SELECT COUNT(*)
   FROM evaluations e
   JOIN game_runs g ON g.id = e.game_run_id
   JOIN memberships m ON m.id = g.membership_id
   WHERE m.classroom_id = 42) AS evaluations;

-- Loescht Klasse und per FK-Cascade alle zugehoerigen Schuelerdaten
DELETE FROM classrooms
WHERE id = 42 AND teacher_id = 7;
```

Fuer ein komplettes Lehrer-Konto loescht `DELETE FROM teachers WHERE id = ?` wegen FK-Cascade auch dessen Klassen und alle daran haengenden Schuelerdaten. Diese Operation nur nach verifizierter Account-Anfrage ausfuehren.
