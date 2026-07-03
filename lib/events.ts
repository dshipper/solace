import { baseUrl, getDb, nowIso } from "./db";
import { newFamilyCode, newId, newSlug, normalizeFamilyCode } from "./ids";
import { ApiError, vBool, vEnum, vStr } from "./validate";
import type { EventRecord, EventStatus } from "./types";

const STATUSES = ["draft", "published", "archived"] as const;

interface EventRow {
  id: string;
  slug: string;
  family_code: string;
  deceased_name: string;
  born_on: string | null;
  died_on: string | null;
  photo_path: string | null;
  obituary_text: string;
  status: EventStatus;
  publication_authorized: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

function toEvent(row: EventRow): EventRecord {
  return {
    id: row.id,
    slug: row.slug,
    familyCode: row.family_code,
    deceasedName: row.deceased_name,
    bornOn: row.born_on,
    diedOn: row.died_on,
    photoPath: row.photo_path,
    obituaryText: row.obituary_text,
    status: row.status,
    publicationAuthorized: row.publication_authorized === 1,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export interface EventInput {
  deceasedName: unknown;
  bornOn?: unknown;
  diedOn?: unknown;
  photoPath?: unknown;
  obituaryText?: unknown;
  status?: unknown;
  publicationAuthorized?: unknown;
  createdBy?: string | null;
}

function cleanEventInput(input: EventInput) {
  return {
    deceasedName: vStr(input.deceasedName, "Name", { required: true, max: 200 })!,
    bornOn: vStr(input.bornOn, "Date of birth", { max: 10 }),
    diedOn: vStr(input.diedOn, "Date of death", { max: 10 }),
    photoPath: vStr(input.photoPath, "Photo", { max: 100 }),
    obituaryText: vStr(input.obituaryText, "Obituary", { max: 20000 }) ?? "",
    status: (vEnum(input.status, "Status", STATUSES) ?? "published") as EventStatus,
    publicationAuthorized: vBool(input.publicationAuthorized, "Publication authorization", false),
  };
}

export function createEvent(input: EventInput): EventRecord {
  const clean = cleanEventInput(input);
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO events (id, slug, family_code, deceased_name, born_on, died_on, photo_path, obituary_text, status, publication_authorized, created_by, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  for (let attempt = 0; attempt < 20; attempt++) {
    const id = newId();
    const now = nowIso();
    try {
      insert.run(
        id,
        newSlug(),
        newFamilyCode(),
        clean.deceasedName,
        clean.bornOn,
        clean.diedOn,
        clean.photoPath,
        clean.obituaryText,
        clean.status,
        clean.publicationAuthorized ? 1 : 0,
        input.createdBy ?? null,
        now,
        now,
      );
      return getEvent(id)!;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (!code.startsWith("SQLITE_CONSTRAINT")) throw err;
      // slug/family_code collision — retry with fresh random values
    }
  }
  throw new Error("Could not allocate a unique event code");
}

export function updateEvent(id: string, patch: EventInput): EventRecord {
  const existing = getEvent(id);
  if (!existing) throw new ApiError(404, "not_found", "Event not found");
  const clean = cleanEventInput({
    deceasedName: patch.deceasedName ?? existing.deceasedName,
    bornOn: patch.bornOn !== undefined ? patch.bornOn : existing.bornOn,
    diedOn: patch.diedOn !== undefined ? patch.diedOn : existing.diedOn,
    photoPath: patch.photoPath !== undefined ? patch.photoPath : existing.photoPath,
    obituaryText: patch.obituaryText !== undefined ? patch.obituaryText : existing.obituaryText,
    status: patch.status !== undefined ? patch.status : existing.status,
    publicationAuthorized:
      patch.publicationAuthorized !== undefined ? patch.publicationAuthorized : existing.publicationAuthorized,
  });
  getDb()
    .prepare(
      `UPDATE events SET deceased_name = ?, born_on = ?, died_on = ?, photo_path = ?, obituary_text = ?, status = ?, publication_authorized = ?, updated_at = ?
       WHERE id = ?`,
    )
    .run(
      clean.deceasedName,
      clean.bornOn,
      clean.diedOn,
      clean.photoPath,
      clean.obituaryText,
      clean.status,
      clean.publicationAuthorized ? 1 : 0,
      nowIso(),
      id,
    );
  return getEvent(id)!;
}

/** Invalidate a leaked family code; joined organizers keep their tokens. */
export function regenerateFamilyCode(id: string): EventRecord {
  const existing = getEvent(id);
  if (!existing) throw new ApiError(404, "not_found", "Event not found");
  const update = getDb().prepare("UPDATE events SET family_code = ?, updated_at = ? WHERE id = ?");
  for (let attempt = 0; attempt < 20; attempt++) {
    try {
      update.run(newFamilyCode(), nowIso(), id);
      return getEvent(id)!;
    } catch (err) {
      const code = (err as { code?: string }).code ?? "";
      if (!code.startsWith("SQLITE_CONSTRAINT")) throw err;
    }
  }
  throw new Error("Could not allocate a unique event code");
}

/** Permanent purge: services, organizers, RSVPs, and updates cascade away. */
export function deleteEvent(id: string): void {
  getDb().prepare("DELETE FROM events WHERE id = ?").run(id);
}

export function listEvents(): EventRecord[] {
  const rows = getDb().prepare("SELECT * FROM events ORDER BY created_at DESC").all() as EventRow[];
  return rows.map(toEvent);
}

export function getEvent(id: string): EventRecord | null {
  const row = getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRow | undefined;
  return row ? toEvent(row) : null;
}

export function getEventBySlug(slug: string): EventRecord | null {
  const row = getDb().prepare("SELECT * FROM events WHERE slug = ?").get(slug) as EventRow | undefined;
  return row ? toEvent(row) : null;
}

export function getEventByFamilyCode(code: string): EventRecord | null {
  const normalized = normalizeFamilyCode(code);
  const row = getDb().prepare("SELECT * FROM events WHERE family_code = ?").get(normalized) as
    | EventRow
    | undefined;
  return row ? toEvent(row) : null;
}

export function publicUrl(event: Pick<EventRecord, "slug">): string {
  return `${baseUrl()}/e/${event.slug}`;
}

export function photoUrlPath(event: Pick<EventRecord, "photoPath">): string | null {
  return event.photoPath ? `/api/uploads/${event.photoPath}` : null;
}

export function absolutePhotoUrl(event: Pick<EventRecord, "photoPath">): string | null {
  const rel = photoUrlPath(event);
  return rel ? `${baseUrl()}${rel}` : null;
}
