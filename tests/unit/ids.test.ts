import { describe, expect, it } from "vitest";
import { hashToken, newFamilyCode, newId, newSlug, newToken, normalizeFamilyCode } from "@/lib/ids";

describe("ids", () => {
  it("generates 16-char hex ids", () => {
    expect(newId()).toMatch(/^[a-f0-9]{16}$/);
  });

  it("generates 10-char slugs from the safe alphabet", () => {
    for (let i = 0; i < 50; i++) {
      expect(newSlug()).toMatch(/^[abcdefghjkmnpqrstuvwxyz23456789]{10}$/);
    }
  });

  it("generates two-word family codes like CEDAR-WREN-4821", () => {
    for (let i = 0; i < 50; i++) {
      const code = newFamilyCode();
      expect(code).toMatch(/^[A-Z]+-[A-Z]+-\d{4}$/);
      const [a, b] = code.split("-");
      expect(a).not.toBe(b);
    }
  });

  it("normalizes family codes", () => {
    expect(normalizeFamilyCode("  cedar-4821 ")).toBe("CEDAR-4821");
    expect(normalizeFamilyCode("cedar 4821")).toBe("CEDAR-4821");
    expect(normalizeFamilyCode("CEDAR--4821")).toBe("CEDAR-4821");
  });

  it("token hash is deterministic and matches hashToken", () => {
    const { token, tokenHash } = newToken();
    expect(token).toMatch(/^[a-f0-9]{64}$/);
    expect(hashToken(token)).toBe(tokenHash);
  });

  it("does not collide over 2000 generations", () => {
    const seen = new Set<string>();
    for (let i = 0; i < 2000; i++) seen.add(newSlug());
    expect(seen.size).toBe(2000);
  });
});
