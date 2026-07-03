import { describe, expect, it } from "vitest";
import { savePhoto, UPLOAD_NAME_RE } from "@/lib/photos";
import { ValidationError } from "@/lib/validate";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3, 4, 5]);
const JPG_BYTES = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3, 4, 5, 6, 7, 8, 9]);

describe("photos", () => {
  it("saves a valid png and returns a safe filename", async () => {
    const name = await savePhoto(new File([PNG_BYTES], "photo.png", { type: "image/png" }));
    expect(name).toMatch(UPLOAD_NAME_RE);
    expect(name.endsWith(".png")).toBe(true);
  });

  it("rejects content that does not match the claimed type", async () => {
    await expect(savePhoto(new File([JPG_BYTES], "fake.png", { type: "image/png" }))).rejects.toThrow(
      ValidationError,
    );
  });

  it("rejects unsupported types and empty files", async () => {
    await expect(savePhoto(new File([PNG_BYTES], "x.gif", { type: "image/gif" }))).rejects.toThrow(
      ValidationError,
    );
    await expect(savePhoto(new File([], "empty.png", { type: "image/png" }))).rejects.toThrow(ValidationError);
  });

  it("upload name pattern rejects traversal attempts", () => {
    expect(UPLOAD_NAME_RE.test("../../etc/passwd")).toBe(false);
    expect(UPLOAD_NAME_RE.test("abc.png")).toBe(false);
    expect(UPLOAD_NAME_RE.test("zzzzzzzzzzzzzzzzzzzzzzzz.png")).toBe(false); // not hex
  });
});
