import { getDb, nowIso } from "./db";
import { newId } from "./ids";
import { ApiError, vStr } from "./validate";
import { getEvent } from "./events";
import type { EventUpdate } from "./types";

interface UpdateRow {
  id: string;
  event_id: string;
  author_kind: "organizer" | "staff";
  author_name: string;
  title: string;
  body_text: string;
  created_at: string;
}

function toUpdate(row: UpdateRow): EventUpdate {
  return {
    id: row.id,
    eventId: row.event_id,
    authorKind: row.author_kind,
    authorName: row.author_name,
    title: row.title,
    bodyText: row.body_text,
    createdAt: row.created_at,
  };
}

export function createUpdate(
  eventId: string,
  input: { authorKind: "organizer" | "staff"; authorName: string; title: unknown; bodyText?: unknown },
): EventUpdate {
  if (!getEvent(eventId)) throw new ApiError(404, "not_found", "Event not found");
  const title = vStr(input.title, "Title", { required: true, max: 140 })!;
  const bodyText = vStr(input.bodyText, "Message", { max: 4000 }) ?? "";
  const id = newId();
  getDb()
    .prepare(
      `INSERT INTO updates (id, event_id, author_kind, author_name, title, body_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(id, eventId, input.authorKind, input.authorName, title, bodyText, nowIso());
  const row = getDb().prepare("SELECT * FROM updates WHERE id = ?").get(id) as UpdateRow;
  return toUpdate(row);
}

export function listUpdates(eventId: string): EventUpdate[] {
  const rows = getDb()
    .prepare("SELECT * FROM updates WHERE event_id = ? ORDER BY created_at DESC")
    .all(eventId) as UpdateRow[];
  return rows.map(toUpdate);
}

export function getUpdate(id: string): EventUpdate | null {
  const row = getDb().prepare("SELECT * FROM updates WHERE id = ?").get(id) as UpdateRow | undefined;
  return row ? toUpdate(row) : null;
}

/** Authorization (staff = any, organizer = own posts only) is the caller's job. */
export function deleteUpdate(id: string): void {
  getDb().prepare("DELETE FROM updates WHERE id = ?").run(id);
}
