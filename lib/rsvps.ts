import { getDb, nowIso } from "./db";
import { hashToken, newId, newToken } from "./ids";
import { getEvent } from "./events";
import { ApiError, vBool, vEmail, vEnum, vInt, vPhone, vStr } from "./validate";
import { CONSENT_VERSION, type EventRecord, type Rsvp, type RsvpSummary } from "./types";

interface RsvpRow {
  id: string;
  event_id: string;
  manage_token_hash: string;
  name: string;
  email: string | null;
  phone: string | null;
  attending: "yes" | "no";
  guest_count: number;
  note: string | null;
  event_updates_opt_in: number;
  marketing_opt_in: number;
  consent_recorded_at: string | null;
  consent_source: string | null;
  consent_version: string | null;
  created_at: string;
  updated_at: string;
}

function toRsvp(row: RsvpRow): Rsvp {
  return {
    id: row.id,
    eventId: row.event_id,
    name: row.name,
    email: row.email,
    phone: row.phone,
    attending: row.attending,
    guestCount: row.guest_count,
    note: row.note,
    eventUpdatesOptIn: row.event_updates_opt_in === 1,
    marketingOptIn: row.marketing_opt_in === 1,
    consentRecordedAt: row.consent_recorded_at,
    consentSource: row.consent_source,
    consentVersion: row.consent_version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface RsvpInput {
  name?: unknown;
  email?: unknown;
  phone?: unknown;
  attending?: unknown;
  guestCount?: unknown;
  note?: unknown;
  eventUpdatesOptIn?: unknown;
  marketingOptIn?: unknown;
}

function requireOpenEvent(eventId: string): EventRecord {
  const event = getEvent(eventId);
  if (!event) throw new ApiError(404, "not_found", "Event not found");
  if (event.status !== "published") {
    throw new ApiError(409, "rsvps_closed", "RSVPs are closed for this service.");
  }
  return event;
}

/**
 * Same event + same email replaces the earlier reply wholesale (no prior
 * field survives, so nothing about the earlier reply can leak) and rotates
 * the manage token. Callers must surface `updated: true` so an overwrite is
 * never silent to the person submitting.
 */
export function submitRsvp(
  eventId: string,
  input: RsvpInput,
  source: string,
): { rsvp: Rsvp; manageToken: string; updated: boolean } {
  requireOpenEvent(eventId);
  const clean = {
    name: vStr(input.name, "Name", { required: true, max: 120 })!,
    email: vEmail(input.email, "Email"),
    phone: vPhone(input.phone, "Phone"),
    attending: vEnum(input.attending, "Attending", ["yes", "no"] as const, { required: true })!,
    guestCount: vInt(input.guestCount, "Guests", { min: 0, max: 10, fallback: 0 })!,
    note: vStr(input.note, "Note", { max: 1000 }),
    eventUpdatesOptIn: vBool(input.eventUpdatesOptIn, "Event updates preference", true),
    marketingOptIn: vBool(input.marketingOptIn, "Communications preference", false),
  };
  const db = getDb();
  const now = nowIso();
  const { token, tokenHash } = newToken();
  const existing = clean.email
    ? (db
        .prepare("SELECT * FROM rsvps WHERE event_id = ? AND lower(email) = lower(?)")
        .get(eventId, clean.email) as RsvpRow | undefined)
    : undefined;
  if (existing) {
    db.prepare(
      `UPDATE rsvps SET manage_token_hash = ?, name = ?, phone = ?, attending = ?, guest_count = ?, note = ?,
         event_updates_opt_in = ?, marketing_opt_in = ?, consent_recorded_at = ?, consent_source = ?, consent_version = ?, updated_at = ?
       WHERE id = ?`,
    ).run(
      tokenHash,
      clean.name,
      clean.phone,
      clean.attending,
      clean.guestCount,
      clean.note,
      clean.eventUpdatesOptIn ? 1 : 0,
      clean.marketingOptIn ? 1 : 0,
      now,
      source,
      CONSENT_VERSION,
      now,
      existing.id,
    );
    return { rsvp: getRsvpById(existing.id)!, manageToken: token, updated: true };
  }
  const id = newId();
  db.prepare(
    `INSERT INTO rsvps (id, event_id, manage_token_hash, name, email, phone, attending, guest_count, note,
       event_updates_opt_in, marketing_opt_in, consent_recorded_at, consent_source, consent_version, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    eventId,
    tokenHash,
    clean.name,
    clean.email,
    clean.phone,
    clean.attending,
    clean.guestCount,
    clean.note,
    clean.eventUpdatesOptIn ? 1 : 0,
    clean.marketingOptIn ? 1 : 0,
    now,
    source,
    CONSENT_VERSION,
    now,
    now,
  );
  return { rsvp: getRsvpById(id)!, manageToken: token, updated: false };
}

export function getRsvpById(id: string): Rsvp | null {
  const row = getDb().prepare("SELECT * FROM rsvps WHERE id = ?").get(id) as RsvpRow | undefined;
  return row ? toRsvp(row) : null;
}

export function getRsvpByManageToken(token: string): { rsvp: Rsvp; event: EventRecord } | null {
  const row = getDb().prepare("SELECT * FROM rsvps WHERE manage_token_hash = ?").get(hashToken(token)) as
    | RsvpRow
    | undefined;
  if (!row) return null;
  const event = getEvent(row.event_id);
  if (!event) return null;
  return { rsvp: toRsvp(row), event };
}

export function updateRsvpByManageToken(
  token: string,
  input: RsvpInput,
  source: string,
): { rsvp: Rsvp; event: EventRecord } {
  const found = getRsvpByManageToken(token);
  if (!found) throw new ApiError(404, "not_found", "This RSVP link is no longer valid.");
  requireOpenEvent(found.event.id);
  const current = found.rsvp;
  const clean = {
    name: input.name !== undefined ? vStr(input.name, "Name", { required: true, max: 120 })! : current.name,
    email: input.email !== undefined ? vEmail(input.email, "Email") : current.email,
    phone: input.phone !== undefined ? vPhone(input.phone, "Phone") : current.phone,
    attending:
      input.attending !== undefined
        ? vEnum(input.attending, "Attending", ["yes", "no"] as const, { required: true })!
        : current.attending,
    guestCount:
      input.guestCount !== undefined
        ? vInt(input.guestCount, "Guests", { min: 0, max: 10, fallback: 0 })!
        : current.guestCount,
    note: input.note !== undefined ? vStr(input.note, "Note", { max: 1000 }) : current.note,
    eventUpdatesOptIn:
      input.eventUpdatesOptIn !== undefined
        ? vBool(input.eventUpdatesOptIn, "Event updates preference", true)
        : current.eventUpdatesOptIn,
    marketingOptIn:
      input.marketingOptIn !== undefined
        ? vBool(input.marketingOptIn, "Communications preference", false)
        : current.marketingOptIn,
  };
  // Consent bookkeeping only moves when a consent value actually changes;
  // editing a guest count must not refresh (or backdate) a consent record.
  const consentChanged =
    clean.eventUpdatesOptIn !== current.eventUpdatesOptIn || clean.marketingOptIn !== current.marketingOptIn;
  getDb()
    .prepare(
      `UPDATE rsvps SET name = ?, email = ?, phone = ?, attending = ?, guest_count = ?, note = ?,
         event_updates_opt_in = ?, marketing_opt_in = ?,
         consent_recorded_at = CASE WHEN ? THEN ? ELSE consent_recorded_at END,
         consent_source = CASE WHEN ? THEN ? ELSE consent_source END,
         consent_version = CASE WHEN ? THEN ? ELSE consent_version END,
         updated_at = ?
       WHERE id = ?`,
    )
    .run(
      clean.name,
      clean.email,
      clean.phone,
      clean.attending,
      clean.guestCount,
      clean.note,
      clean.eventUpdatesOptIn ? 1 : 0,
      clean.marketingOptIn ? 1 : 0,
      consentChanged ? 1 : 0,
      nowIso(),
      consentChanged ? 1 : 0,
      source,
      consentChanged ? 1 : 0,
      CONSENT_VERSION,
      nowIso(),
      current.id,
    );
  return { rsvp: getRsvpById(current.id)!, event: found.event };
}

/** Invitee self-service deletion from the manage page. */
export function deleteRsvpByManageToken(token: string): boolean {
  const result = getDb().prepare("DELETE FROM rsvps WHERE manage_token_hash = ?").run(hashToken(token));
  return result.changes > 0;
}

/** Staff-side deletion (e.g. verbal request to remove a reply). */
export function deleteRsvp(id: string): void {
  getDb().prepare("DELETE FROM rsvps WHERE id = ?").run(id);
}

export function listRsvps(eventId: string): Rsvp[] {
  const rows = getDb()
    .prepare("SELECT * FROM rsvps WHERE event_id = ? ORDER BY created_at DESC")
    .all(eventId) as RsvpRow[];
  return rows.map(toRsvp);
}

export function rsvpSummary(eventId: string): RsvpSummary {
  const row = getDb()
    .prepare(
      `SELECT COUNT(*) AS response_count,
              COALESCE(SUM(CASE WHEN attending = 'yes' THEN 1 ELSE 0 END), 0) AS attending_count,
              COALESCE(SUM(CASE WHEN attending = 'yes' THEN 1 + guest_count ELSE 0 END), 0) AS total_guests,
              COALESCE(SUM(CASE WHEN attending = 'no' THEN 1 ELSE 0 END), 0) AS declined_count
       FROM rsvps WHERE event_id = ?`,
    )
    .get(eventId) as {
    response_count: number;
    attending_count: number;
    total_guests: number;
    declined_count: number;
  };
  return {
    responseCount: row.response_count,
    attendingCount: row.attending_count,
    totalGuests: row.total_guests,
    declinedCount: row.declined_count,
  };
}
