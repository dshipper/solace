import { getDb, nowIso } from "./db";
import { hashToken, newId, newToken } from "./ids";
import { getEventByFamilyCode } from "./events";
import { vEmail, vPhone, vStr } from "./validate";
import { CONSENT_VERSION, type EventRecord, type Organizer } from "./types";

interface OrganizerRow {
  id: string;
  event_id: string;
  name: string;
  token_hash: string;
  email: string | null;
  phone: string | null;
  marketing_opt_in: number;
  consent_recorded_at: string | null;
  consent_source: string | null;
  consent_version: string | null;
  created_at: string;
  last_seen_at: string | null;
}

function toOrganizer(row: OrganizerRow): Organizer {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    marketingOptIn: row.marketing_opt_in === 1,
    consentRecordedAt: row.consent_recorded_at,
    consentSource: row.consent_source,
    consentVersion: row.consent_version,
    createdAt: row.created_at,
    lastSeenAt: row.last_seen_at,
  };
}

export function joinEvent(
  familyCode: unknown,
  name: unknown,
): { token: string; organizer: Organizer; event: EventRecord } | null {
  const code = vStr(familyCode, "Family code", { required: true, max: 40 })!;
  const cleanName = vStr(name, "Your name", { required: true, max: 120 })!;
  const event = getEventByFamilyCode(code);
  if (!event || event.status === "archived") return null;
  const { token, tokenHash } = newToken();
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO organizers (id, event_id, name, token_hash, created_at, last_seen_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .run(id, event.id, cleanName, tokenHash, nowIso(), nowIso());
  return { token, organizer: getOrganizerById(id)!, event };
}

export function getOrganizerById(id: string): Organizer | null {
  const row = getDb().prepare("SELECT * FROM organizers WHERE id = ?").get(id) as OrganizerRow | undefined;
  return row ? toOrganizer(row) : null;
}

export function getOrganizerByToken(token: string): Organizer | null {
  const row = getDb().prepare("SELECT * FROM organizers WHERE token_hash = ?").get(hashToken(token)) as
    | OrganizerRow
    | undefined;
  if (!row) return null;
  getDb().prepare("UPDATE organizers SET last_seen_at = ? WHERE id = ?").run(nowIso(), row.id);
  return toOrganizer(row);
}

export function listOrganizers(eventId: string): Organizer[] {
  const rows = getDb()
    .prepare("SELECT * FROM organizers WHERE event_id = ? ORDER BY created_at")
    .all(eventId) as OrganizerRow[];
  return rows.map(toOrganizer);
}

/** Staff removal: the organizer's token stops working immediately. */
export function removeOrganizer(id: string): void {
  getDb().prepare("DELETE FROM organizers WHERE id = ?").run(id);
}

/** Self-service "Leave event": deletes the server-side record too. */
export function deleteOrganizerByToken(token: string): boolean {
  const result = getDb().prepare("DELETE FROM organizers WHERE token_hash = ?").run(hashToken(token));
  return result.changes > 0;
}

export function setOrganizerOptIn(
  id: string,
  input: { marketingOptIn: boolean; email?: unknown; phone?: unknown },
  source = "ios-app",
): Organizer {
  const email = vEmail(input.email, "Email");
  const phone = vPhone(input.phone, "Phone");
  const existing = getOrganizerById(id);
  if (!existing) throw new Error("Organizer not found");
  const consentChanged = existing.marketingOptIn !== input.marketingOptIn;
  getDb()
    .prepare(
      `UPDATE organizers SET marketing_opt_in = ?, email = COALESCE(?, email), phone = COALESCE(?, phone),
         consent_recorded_at = CASE WHEN ? THEN ? ELSE consent_recorded_at END,
         consent_source = CASE WHEN ? THEN ? ELSE consent_source END,
         consent_version = CASE WHEN ? THEN ? ELSE consent_version END
       WHERE id = ?`,
    )
    .run(
      input.marketingOptIn ? 1 : 0,
      email,
      phone,
      consentChanged ? 1 : 0,
      nowIso(),
      consentChanged ? 1 : 0,
      source,
      consentChanged ? 1 : 0,
      CONSENT_VERSION,
      id,
    );
  return getOrganizerById(id)!;
}
