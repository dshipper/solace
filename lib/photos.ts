import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { getDb, uploadsDir } from "./db";
import { ValidationError } from "./validate";

const MAX_BYTES = 8 * 1024 * 1024;

const EXT_BY_MIME: Record<string, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
};

export const CONTENT_TYPES: Record<string, string> = {
  jpg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export const UPLOAD_NAME_RE = /^[a-f0-9]{24}\.(jpg|png|webp)$/;

function magicBytesMatch(buf: Buffer, ext: "jpg" | "png" | "webp"): boolean {
  if (ext === "jpg") return buf.length > 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff;
  if (ext === "png")
    return buf.length > 8 && buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47;
  return (
    buf.length > 12 && buf.subarray(0, 4).toString("ascii") === "RIFF" && buf.subarray(8, 12).toString("ascii") === "WEBP"
  );
}

export async function savePhoto(file: File): Promise<string> {
  if (file.size === 0) throw new ValidationError("The photo file is empty");
  if (file.size > MAX_BYTES) throw new ValidationError("Photo must be under 8 MB");
  const ext = EXT_BY_MIME[file.type];
  if (!ext) throw new ValidationError("Photo must be a JPEG, PNG, or WebP image");
  const buf = Buffer.from(await file.arrayBuffer());
  if (!magicBytesMatch(buf, ext)) throw new ValidationError("File content does not match its type");
  getDb(); // ensures the data + uploads directories exist
  const name = `${crypto.randomBytes(12).toString("hex")}.${ext}`;
  fs.writeFileSync(path.join(uploadsDir(), name), buf);
  return name;
}
