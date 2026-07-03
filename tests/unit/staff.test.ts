import { describe, expect, it } from "vitest";
import { getDb, nowIso } from "@/lib/db";
import { hashToken } from "@/lib/ids";
import {
  createSession,
  createStaffUser,
  destroySession,
  getSessionUser,
  verifyStaffLogin,
} from "@/lib/staff";
import { ValidationError } from "@/lib/validate";

describe("staff auth", () => {
  it("creates a user and verifies the right password only", () => {
    const user = createStaffUser({ email: "staff1@example.com", name: "Staff One", password: "correct-horse-1" });
    expect(user.email).toBe("staff1@example.com");
    expect(verifyStaffLogin("staff1@example.com", "correct-horse-1")?.id).toBe(user.id);
    expect(verifyStaffLogin("STAFF1@EXAMPLE.COM", "correct-horse-1")?.id).toBe(user.id);
    expect(verifyStaffLogin("staff1@example.com", "wrong")).toBeNull();
    expect(verifyStaffLogin("nobody@example.com", "correct-horse-1")).toBeNull();
  });

  it("rejects duplicate emails and weak passwords", () => {
    createStaffUser({ email: "staff2@example.com", name: "Two", password: "long-enough-pw" });
    expect(() =>
      createStaffUser({ email: "staff2@example.com", name: "Dup", password: "long-enough-pw" }),
    ).toThrow(ValidationError);
    expect(() => createStaffUser({ email: "staff3@example.com", name: "Three", password: "short" })).toThrow(
      ValidationError,
    );
  });

  it("session roundtrip, destroy, and expiry", () => {
    const user = createStaffUser({ email: "staff4@example.com", name: "Four", password: "long-enough-pw" });
    const token = createSession(user.id);
    expect(getSessionUser(token)?.id).toBe(user.id);
    expect(getSessionUser("not-a-token")).toBeNull();

    destroySession(token);
    expect(getSessionUser(token)).toBeNull();

    const expired = createSession(user.id);
    getDb()
      .prepare("UPDATE sessions SET expires_at = ? WHERE token_hash = ?")
      .run(new Date(Date.now() - 1000).toISOString(), hashToken(expired));
    expect(getSessionUser(expired)).toBeNull();
    expect(nowIso() > new Date(Date.now() - 1000).toISOString()).toBe(true);
  });
});
