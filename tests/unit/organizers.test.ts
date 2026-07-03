import { describe, expect, it } from "vitest";
import { createEvent, updateEvent } from "@/lib/events";
import { getOrganizerByToken, joinEvent, setOrganizerOptIn } from "@/lib/organizers";

describe("organizers", () => {
  it("joins with a family code in any casing/format", () => {
    const event = createEvent({ deceasedName: "Join Test" });
    const lower = event.familyCode.toLowerCase();
    const joined = joinEvent(` ${lower} `, "Carol Jensen");
    expect(joined).not.toBeNull();
    expect(joined!.event.id).toBe(event.id);
    expect(joined!.organizer.name).toBe("Carol Jensen");
    expect(joined!.organizer.marketingOptIn).toBe(false); // never defaults on
  });

  it("returns null for unknown or archived events", () => {
    expect(joinEvent("NOPE-0000", "Nobody")).toBeNull();
    const event = createEvent({ deceasedName: "Archived", status: "archived" });
    expect(joinEvent(event.familyCode, "Nobody")).toBeNull();
  });

  it("authenticates by token and records opt-in with contact info", () => {
    const event = createEvent({ deceasedName: "Token Test" });
    const { token, organizer } = joinEvent(event.familyCode, "Pat Lowe")!;
    expect(getOrganizerByToken(token)?.id).toBe(organizer.id);
    expect(getOrganizerByToken("bogus")).toBeNull();

    const updated = setOrganizerOptIn(organizer.id, {
      marketingOptIn: true,
      email: "pat@example.com",
    });
    expect(updated.marketingOptIn).toBe(true);
    expect(updated.email).toBe("pat@example.com");
    expect(updated.consentRecordedAt).toBeTruthy();

    const withdrawn = setOrganizerOptIn(organizer.id, { marketingOptIn: false });
    expect(withdrawn.marketingOptIn).toBe(false);
    expect(withdrawn.email).toBe("pat@example.com"); // contact info preserved
  });

  it("still allows joining after the event was archived post-join", () => {
    const event = createEvent({ deceasedName: "Later Archived" });
    const { token } = joinEvent(event.familyCode, "Family Member")!;
    updateEvent(event.id, { status: "archived" });
    expect(getOrganizerByToken(token)).not.toBeNull(); // existing sessions keep read access
  });
});
