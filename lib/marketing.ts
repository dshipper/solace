import { getDb, nowIso } from "./db";

export interface ConsentedContact {
  name: string;
  email: string;
  source: "rsvp" | "organizer";
  eventName: string;
  consentRecordedAt: string | null;
  consentVersion: string | null;
}

interface ConsentRow {
  name: string;
  email: string | null;
  source: "rsvp" | "organizer";
  event_name: string;
  consent_recorded_at: string | null;
  consent_version: string | null;
}

/**
 * The only marketing surface in the system: people who personally checked the
 * funeral-home communications box AND left an email. Email only — phone
 * numbers are never exported (texting requires TCPA-grade consent this
 * product does not collect). A suppression recorded after the consent
 * timestamp always wins, even if an old row still has the flag set.
 */
export function listConsentedContacts(): ConsentedContact[] {
  const rows = getDb()
    .prepare(
      `SELECT * FROM (
         SELECT r.name AS name, r.email AS email, 'rsvp' AS source,
                e.deceased_name AS event_name, r.consent_recorded_at AS consent_recorded_at,
                r.consent_version AS consent_version
         FROM rsvps r JOIN events e ON e.id = r.event_id
         WHERE r.marketing_opt_in = 1 AND r.email IS NOT NULL
         UNION ALL
         SELECT o.name AS name, o.email AS email, 'organizer' AS source,
                e.deceased_name AS event_name, o.consent_recorded_at AS consent_recorded_at,
                o.consent_version AS consent_version
         FROM organizers o JOIN events e ON e.id = o.event_id
         WHERE o.marketing_opt_in = 1 AND o.email IS NOT NULL
       ) c
       WHERE NOT EXISTS (
         SELECT 1 FROM suppressions s
         WHERE s.email = c.email COLLATE NOCASE
           AND (c.consent_recorded_at IS NULL OR s.created_at >= c.consent_recorded_at)
       )
       ORDER BY consent_recorded_at DESC`,
    )
    .all() as ConsentRow[];
  return rows
    .filter((row): row is ConsentRow & { email: string } => row.email !== null)
    .map((row) => ({
      name: row.name,
      email: row.email,
      source: row.source,
      eventName: row.event_name,
      consentRecordedAt: row.consent_recorded_at,
      consentVersion: row.consent_version,
    }));
}

/**
 * Withdraw consent for an email address everywhere: zero the flags on every
 * matching row and record a suppression so exports exclude it even if a
 * stale flag survives. A later re-submission that re-checks the box is a
 * fresh consent and takes precedence (its timestamp postdates the suppression).
 */
export function unsubscribeEmail(email: string, source: string): void {
  const db = getDb();
  const run = db.transaction(() => {
    db.prepare("UPDATE rsvps SET marketing_opt_in = 0 WHERE lower(email) = lower(?)").run(email);
    db.prepare("UPDATE organizers SET marketing_opt_in = 0 WHERE lower(email) = lower(?)").run(email);
    db.prepare(
      `INSERT INTO suppressions (email, source, created_at) VALUES (?, ?, ?)
       ON CONFLICT(email) DO UPDATE SET source = excluded.source, created_at = excluded.created_at`,
    ).run(email.toLowerCase(), source, nowIso());
  });
  run();
}

export function listSuppressions(): Array<{ email: string; source: string; createdAt: string }> {
  const rows = getDb().prepare("SELECT * FROM suppressions ORDER BY created_at DESC").all() as Array<{
    email: string;
    source: string;
    created_at: string;
  }>;
  return rows.map((r) => ({ email: r.email, source: r.source, createdAt: r.created_at }));
}

function csvCell(value: string | null): string {
  const str = value ?? "";
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

export function consentedCsv(): string {
  const header = "name,email,source,event,consent_recorded_at,consent_version";
  const lines = listConsentedContacts().map((c) =>
    [c.name, c.email, c.source, c.eventName, c.consentRecordedAt, c.consentVersion].map(csvCell).join(","),
  );
  return [header, ...lines].join("\n") + "\n";
}
