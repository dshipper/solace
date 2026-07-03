import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const SCHEMA = `
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS staff_users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE COLLATE NOCASE,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  staff_user_id TEXT NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  family_code TEXT NOT NULL UNIQUE,
  deceased_name TEXT NOT NULL,
  born_on TEXT,
  died_on TEXT,
  photo_path TEXT,
  obituary_text TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'published' CHECK (status IN ('draft','published','archived')),
  publication_authorized INTEGER NOT NULL DEFAULT 0,
  created_by TEXT REFERENCES staff_users(id),
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS services (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('visitation','funeral','graveside','memorial','reception','livestream')),
  title TEXT,
  starts_at TEXT,
  ends_at TEXT,
  venue_name TEXT,
  address TEXT,
  notes TEXT,
  livestream_url TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_services_event ON services(event_id, sort_order);

CREATE TABLE IF NOT EXISTS organizers (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  email TEXT,
  phone TEXT,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  consent_recorded_at TEXT,
  consent_source TEXT,
  consent_version TEXT,
  created_at TEXT NOT NULL,
  last_seen_at TEXT
);
CREATE INDEX IF NOT EXISTS idx_organizers_event ON organizers(event_id);

CREATE TABLE IF NOT EXISTS rsvps (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  manage_token_hash TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  attending TEXT NOT NULL CHECK (attending IN ('yes','no')),
  guest_count INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  event_updates_opt_in INTEGER NOT NULL DEFAULT 1,
  marketing_opt_in INTEGER NOT NULL DEFAULT 0,
  consent_recorded_at TEXT,
  consent_source TEXT,
  consent_version TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rsvps_event ON rsvps(event_id);

CREATE TABLE IF NOT EXISTS suppressions (
  email TEXT PRIMARY KEY COLLATE NOCASE,
  source TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS updates (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  author_kind TEXT NOT NULL CHECK (author_kind IN ('organizer','staff')),
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_updates_event ON updates(event_id);
`;

export function dataDir(): string {
  return process.env.SOLACE_DATA_DIR || path.join(process.cwd(), "data");
}

export function uploadsDir(): string {
  return path.join(dataDir(), "uploads");
}

export function baseUrl(): string {
  return (process.env.SOLACE_BASE_URL || "http://127.0.0.1:4863").replace(/\/+$/, "");
}

export function nowIso(): string {
  return new Date().toISOString();
}

type GlobalWithDb = typeof globalThis & { __solaceDb?: Database.Database };

export function getDb(): Database.Database {
  const g = globalThis as GlobalWithDb;
  if (!g.__solaceDb) {
    fs.mkdirSync(uploadsDir(), { recursive: true });
    const db = new Database(path.join(dataDir(), "solace.db"));
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    db.exec(SCHEMA);
    g.__solaceDb = db;
  }
  return g.__solaceDb;
}
