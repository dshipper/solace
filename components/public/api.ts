/** Pulls the human-readable message out of a `{"error":{...}}` API body, if present. */
export function apiErrorMessage(data: unknown): string | null {
  if (data && typeof data === "object" && "error" in data) {
    const err = (data as { error?: { message?: unknown } }).error;
    if (err && typeof err.message === "string" && err.message.trim() !== "") {
      return err.message;
    }
  }
  return null;
}
