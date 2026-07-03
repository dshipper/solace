export class ApiError extends Error {
  status: number;
  code: string;
  constructor(status: number, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export class ValidationError extends ApiError {
  constructor(message: string, code = "invalid_input") {
    super(400, code, message);
  }
}

export function vStr(
  value: unknown,
  field: string,
  opts: { required?: boolean; max?: number } = {},
): string | null {
  const { required = false, max = 500 } = opts;
  if (value === undefined || value === null || (typeof value === "string" && value.trim() === "")) {
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  if (typeof value !== "string") throw new ValidationError(`${field} must be text`);
  const trimmed = value.trim();
  if (trimmed.length > max) throw new ValidationError(`${field} must be at most ${max} characters`);
  return trimmed;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function vEmail(value: unknown, field: string, opts: { required?: boolean } = {}): string | null {
  const str = vStr(value, field, { required: opts.required, max: 254 });
  if (str === null) return null;
  const normalized = str.toLowerCase();
  if (!EMAIL_RE.test(normalized)) throw new ValidationError(`${field} must be a valid email address`);
  return normalized;
}

export function vPhone(value: unknown, field: string, opts: { required?: boolean } = {}): string | null {
  const str = vStr(value, field, { required: opts.required, max: 30 });
  if (str === null) return null;
  const digits = str.replace(/[\s().-]/g, "");
  if (!/^\+?\d{7,15}$/.test(digits)) throw new ValidationError(`${field} must be a valid phone number`);
  return digits;
}

export function vEnum<T extends string>(
  value: unknown,
  field: string,
  allowed: readonly T[],
  opts: { required?: boolean } = {},
): T | null {
  const str = vStr(value, field, { required: opts.required, max: 50 });
  if (str === null) return null;
  if (!allowed.includes(str as T)) {
    throw new ValidationError(`${field} must be one of: ${allowed.join(", ")}`);
  }
  return str as T;
}

export function vInt(
  value: unknown,
  field: string,
  opts: { min?: number; max?: number; required?: boolean; fallback?: number } = {},
): number | null {
  const { min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER, required = false, fallback } = opts;
  if (value === undefined || value === null || value === "") {
    if (fallback !== undefined) return fallback;
    if (required) throw new ValidationError(`${field} is required`);
    return null;
  }
  const num = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN;
  if (!Number.isInteger(num)) throw new ValidationError(`${field} must be a whole number`);
  if (num < min || num > max) throw new ValidationError(`${field} must be between ${min} and ${max}`);
  return num;
}

export function vBool(value: unknown, field: string, fallback: boolean): boolean {
  if (value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (value === "true" || value === "on" || value === "1") return true;
  if (value === "false" || value === "off" || value === "0") return false;
  throw new ValidationError(`${field} must be true or false`);
}
