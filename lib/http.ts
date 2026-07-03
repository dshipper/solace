import { NextResponse } from "next/server";
import { ApiError } from "./validate";
import { getOrganizerByToken } from "./organizers";
import type { Organizer } from "./types";

export function jsonError(status: number, code: string, message: string): NextResponse {
  return NextResponse.json({ error: { code, message } }, { status });
}

export function handleApiError(err: unknown): NextResponse {
  if (err instanceof ApiError) return jsonError(err.status, err.code, err.message);
  console.error(err);
  return jsonError(500, "internal", "Something went wrong.");
}

export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new Error("not an object");
    return body as Record<string, unknown>;
  } catch {
    throw new ApiError(400, "invalid_json", "Request body must be a JSON object.");
  }
}

export function requireOrganizer(req: Request): Organizer {
  const header = req.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  const organizer = match ? getOrganizerByToken(match[1].trim()) : null;
  if (!organizer) throw new ApiError(401, "unauthorized", "Missing or invalid token.");
  return organizer;
}

export function checkOrigin(req: Request): void {
  const origin = req.headers.get("origin");
  if (!origin || origin === "null") return;
  const host = req.headers.get("host");
  try {
    if (new URL(origin).host === host) return;
  } catch {
    // fall through to rejection
  }
  throw new ApiError(403, "bad_origin", "Cross-origin request rejected.");
}

const buckets = new Map<string, { count: number; resetAt: number }>();

export function rateLimit(key: string, max: number, windowMs: number): void {
  const now = Date.now();
  const bucket = buckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > max) {
    throw new ApiError(429, "rate_limited", "Too many requests. Please try again in a minute.");
  }
}

export function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  return forwarded ? forwarded.split(",")[0].trim() : "local";
}
