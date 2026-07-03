import { getDb } from "./db";
import { newId } from "./ids";
import { vEnum, vStr } from "./validate";
import { SERVICE_KINDS, type Service, type ServiceInput, type ServiceKind } from "./types";

interface ServiceRow {
  id: string;
  event_id: string;
  kind: ServiceKind;
  title: string | null;
  starts_at: string | null;
  ends_at: string | null;
  venue_name: string | null;
  address: string | null;
  notes: string | null;
  livestream_url: string | null;
  sort_order: number;
}

function toService(row: ServiceRow): Service {
  return {
    id: row.id,
    eventId: row.event_id,
    kind: row.kind,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    venueName: row.venue_name,
    address: row.address,
    notes: row.notes,
    livestreamUrl: row.livestream_url,
    sortOrder: row.sort_order,
  };
}

export function setServices(eventId: string, inputs: ServiceInput[]): Service[] {
  const db = getDb();
  const cleaned = inputs.map((input) => ({
    kind: vEnum(input.kind, "Service type", SERVICE_KINDS, { required: true })!,
    title: vStr(input.title, "Service title", { max: 200 }),
    startsAt: vStr(input.startsAt, "Start time", { max: 25 }),
    endsAt: vStr(input.endsAt, "End time", { max: 25 }),
    venueName: vStr(input.venueName, "Venue", { max: 200 }),
    address: vStr(input.address, "Address", { max: 300 }),
    notes: vStr(input.notes, "Notes", { max: 1000 }),
    livestreamUrl: vStr(input.livestreamUrl, "Livestream link", { max: 500 }),
  }));
  const replaceAll = db.transaction(() => {
    db.prepare("DELETE FROM services WHERE event_id = ?").run(eventId);
    const insert = db.prepare(
      `INSERT INTO services (id, event_id, kind, title, starts_at, ends_at, venue_name, address, notes, livestream_url, sort_order)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    );
    cleaned.forEach((s, index) => {
      insert.run(
        newId(),
        eventId,
        s.kind,
        s.title,
        s.startsAt,
        s.endsAt,
        s.venueName,
        s.address,
        s.notes,
        s.livestreamUrl,
        index,
      );
    });
  });
  replaceAll();
  return listServices(eventId);
}

export function listServices(eventId: string): Service[] {
  const rows = getDb()
    .prepare("SELECT * FROM services WHERE event_id = ? ORDER BY sort_order")
    .all(eventId) as ServiceRow[];
  return rows.map(toService);
}
