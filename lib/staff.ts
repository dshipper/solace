import crypto from "node:crypto";
import { getDb, nowIso } from "./db";
import { hashToken, newId, newToken } from "./ids";
import { ValidationError, vEmail, vStr } from "./validate";
import type { StaffUser } from "./types";

const SESSION_DAYS = 30;

interface StaffRow {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  created_at: string;
}

function toStaffUser(row: StaffRow): StaffUser {
  return { id: row.id, email: row.email, name: row.name, createdAt: row.created_at };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.scryptSync(password, salt, 64).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const parts = stored.split(":");
  if (parts.length !== 3 || parts[0] !== "scrypt") return false;
  const [, salt, expected] = parts;
  const actual = crypto.scryptSync(password, salt, 64).toString("hex");
  const a = Buffer.from(actual, "hex");
  const b = Buffer.from(expected, "hex");
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export function getStaffByEmail(email: string): StaffUser | null {
  const row = getDb().prepare("SELECT * FROM staff_users WHERE email = ?").get(email.trim()) as
    | StaffRow
    | undefined;
  return row ? toStaffUser(row) : null;
}

export function createStaffUser(input: { email: unknown; name: unknown; password: unknown }): StaffUser {
  const email = vEmail(input.email, "Email", { required: true })!;
  const name = vStr(input.name, "Name", { required: true, max: 120 })!;
  if (typeof input.password !== "string" || input.password.length < 8) {
    throw new ValidationError("Password must be at least 8 characters");
  }
  if (getStaffByEmail(email)) throw new ValidationError("A staff account with that email already exists", "email_taken");
  const id = newId();
  getDb()
    .prepare("INSERT INTO staff_users (id, email, name, password_hash, created_at) VALUES (?, ?, ?, ?, ?)")
    .run(id, email, name, hashPassword(input.password), nowIso());
  return { id, email, name, createdAt: nowIso() };
}

export function verifyStaffLogin(email: unknown, password: unknown): StaffUser | null {
  if (typeof email !== "string" || typeof password !== "string") return null;
  const row = getDb().prepare("SELECT * FROM staff_users WHERE email = ?").get(email.trim().toLowerCase()) as
    | StaffRow
    | undefined;
  if (!row) return null;
  return verifyPassword(password, row.password_hash) ? toStaffUser(row) : null;
}

export function createSession(staffUserId: string): string {
  const { token, tokenHash } = newToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000).toISOString();
  getDb()
    .prepare("INSERT INTO sessions (token_hash, staff_user_id, created_at, expires_at) VALUES (?, ?, ?, ?)")
    .run(tokenHash, staffUserId, nowIso(), expires);
  return token;
}

export function getSessionUser(token: string): StaffUser | null {
  const row = getDb()
    .prepare(
      `SELECT u.*, s.expires_at FROM sessions s JOIN staff_users u ON u.id = s.staff_user_id
       WHERE s.token_hash = ?`,
    )
    .get(hashToken(token)) as (StaffRow & { expires_at: string }) | undefined;
  if (!row) return null;
  if (row.expires_at < nowIso()) {
    getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
    return null;
  }
  return toStaffUser(row);
}

export function destroySession(token: string): void {
  getDb().prepare("DELETE FROM sessions WHERE token_hash = ?").run(hashToken(token));
}

export function listStaffUsers(): StaffUser[] {
  const rows = getDb().prepare("SELECT * FROM staff_users ORDER BY created_at").all() as StaffRow[];
  return rows.map(toStaffUser);
}
