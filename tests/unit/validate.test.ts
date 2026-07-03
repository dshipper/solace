import { describe, expect, it } from "vitest";
import { ValidationError, vBool, vEmail, vEnum, vInt, vPhone, vStr } from "@/lib/validate";

describe("validate", () => {
  it("vStr trims, enforces required and max", () => {
    expect(vStr("  hello ", "F")).toBe("hello");
    expect(vStr("", "F")).toBeNull();
    expect(vStr(undefined, "F")).toBeNull();
    expect(() => vStr(undefined, "F", { required: true })).toThrow(ValidationError);
    expect(() => vStr("ab", "F", { max: 1 })).toThrow(ValidationError);
    expect(() => vStr(42, "F")).toThrow(ValidationError);
  });

  it("vEmail normalizes to lowercase and validates", () => {
    expect(vEmail(" Dan@Every.TO ", "Email")).toBe("dan@every.to");
    expect(() => vEmail("not-an-email", "Email")).toThrow(ValidationError);
    expect(vEmail("", "Email")).toBeNull();
  });

  it("vPhone strips formatting and validates", () => {
    expect(vPhone("(555) 010-4477", "Phone")).toBe("5550104477");
    expect(vPhone("+1 555 010 4477", "Phone")).toBe("+15550104477");
    expect(() => vPhone("123", "Phone")).toThrow(ValidationError);
    expect(() => vPhone("call me", "Phone")).toThrow(ValidationError);
  });

  it("vEnum accepts listed values only", () => {
    expect(vEnum("yes", "A", ["yes", "no"] as const)).toBe("yes");
    expect(() => vEnum("maybe", "A", ["yes", "no"] as const)).toThrow(ValidationError);
    expect(vEnum(undefined, "A", ["yes", "no"] as const)).toBeNull();
  });

  it("vInt enforces bounds, integers, and fallback", () => {
    expect(vInt(3, "G", { min: 0, max: 10 })).toBe(3);
    expect(vInt("4", "G", { min: 0, max: 10 })).toBe(4);
    expect(vInt(undefined, "G", { fallback: 0 })).toBe(0);
    expect(() => vInt(11, "G", { min: 0, max: 10 })).toThrow(ValidationError);
    expect(() => vInt(1.5, "G")).toThrow(ValidationError);
    expect(() => vInt("abc", "G")).toThrow(ValidationError);
  });

  it("vBool handles booleans, form strings, and defaults", () => {
    expect(vBool(true, "B", false)).toBe(true);
    expect(vBool("on", "B", false)).toBe(true);
    expect(vBool("false", "B", true)).toBe(false);
    expect(vBool(undefined, "B", true)).toBe(true);
    expect(() => vBool("banana", "B", false)).toThrow(ValidationError);
  });
});
