import crypto from "node:crypto";

const SLUG_ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

// Gentle, easy-to-say words for family codes staff read aloud to families.
const CODE_WORDS = [
  "ASPEN", "BIRCH", "CEDAR", "CLOVER", "DAHLIA", "FERN", "HAZEL", "HEATHER",
  "IRIS", "JUNIPER", "LAUREL", "LILAC", "LILY", "LINDEN", "MAGNOLIA", "MAPLE",
  "MYRTLE", "OLIVE", "POPLAR", "ROSE", "ROWAN", "SAGE", "TULIP", "VIOLET",
  "WILLOW", "WREN",
] as const;

export function newId(): string {
  return crypto.randomBytes(8).toString("hex");
}

export function newSlug(): string {
  const bytes = crypto.randomBytes(10);
  let out = "";
  for (let i = 0; i < 10; i++) out += SLUG_ALPHABET[bytes[i] % SLUG_ALPHABET.length];
  return out;
}

export function newFamilyCode(): string {
  const first = CODE_WORDS[crypto.randomInt(CODE_WORDS.length)];
  let second = CODE_WORDS[crypto.randomInt(CODE_WORDS.length)];
  while (second === first) second = CODE_WORDS[crypto.randomInt(CODE_WORDS.length)];
  const digits = crypto.randomInt(1000, 10000);
  return `${first}-${second}-${digits}`;
}

export function normalizeFamilyCode(input: string): string {
  return input.trim().toUpperCase().replace(/[\s_]+/g, "-").replace(/-+/g, "-");
}

export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function newToken(): { token: string; tokenHash: string } {
  const token = crypto.randomBytes(32).toString("hex");
  return { token, tokenHash: hashToken(token) };
}
