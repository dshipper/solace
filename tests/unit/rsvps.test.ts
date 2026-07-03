import { describe, expect, it } from "vitest";
import { createEvent, updateEvent } from "@/lib/events";
import {
  deleteRsvpByManageToken,
  getRsvpByManageToken,
  listRsvps,
  rsvpSummary,
  submitRsvp,
  updateRsvpByManageToken,
} from "@/lib/rsvps";
import { ApiError, ValidationError } from "@/lib/validate";

function makeEvent() {
  return createEvent({ deceasedName: "Test Person" });
}

describe("rsvps", () => {
  it("submits with consent defaults and records source", () => {
    const event = makeEvent();
    const { rsvp, manageToken } = submitRsvp(
      event.id,
      { name: "Alice Adams", email: "alice@example.com", attending: "yes", guestCount: 2 },
      "public-web",
    );
    expect(rsvp.attending).toBe("yes");
    expect(rsvp.guestCount).toBe(2);
    expect(rsvp.eventUpdatesOptIn).toBe(true); // default checked (event-scoped)
    expect(rsvp.marketingOptIn).toBe(false); // default UNchecked (marketing)
    expect(rsvp.consentSource).toBe("public-web");
    expect(rsvp.consentRecordedAt).toBeTruthy();
    expect(manageToken).toMatch(/^[a-f0-9]{64}$/);
  });

  it("dedupes by email: updates in place, rotates the manage token, flags updated", () => {
    const event = makeEvent();
    const first = submitRsvp(event.id, { name: "Bob", email: "bob@example.com", attending: "yes" }, "public-web");
    expect(first.updated).toBe(false);
    const second = submitRsvp(
      event.id,
      { name: "Bob Barker", email: "BOB@example.com", attending: "no", marketingOptIn: true },
      "public-web",
    );
    expect(second.updated).toBe(true); // callers surface "we updated your earlier reply"
    expect(listRsvps(event.id)).toHaveLength(1);
    expect(second.rsvp.id).toBe(first.rsvp.id);
    expect(second.rsvp.attending).toBe("no");
    expect(second.rsvp.marketingOptIn).toBe(true);
    expect(getRsvpByManageToken(first.manageToken)).toBeNull(); // old link rotated out
    expect(getRsvpByManageToken(second.manageToken)?.rsvp.id).toBe(first.rsvp.id);
  });

  it("a resubmission replaces every field — nothing from the earlier reply leaks", () => {
    const event = makeEvent();
    submitRsvp(
      event.id,
      { name: "Original", email: "leak@example.com", phone: "5550104477", attending: "yes", note: "private note" },
      "public-web",
    );
    const second = submitRsvp(
      event.id,
      { name: "Impersonator", email: "leak@example.com", attending: "no" },
      "public-web",
    );
    expect(second.rsvp.phone).toBeNull();
    expect(second.rsvp.note).toBeNull();
  });

  it("manage-token edits preserve consent bookkeeping unless consent changes", async () => {
    const event = makeEvent();
    const { manageToken, rsvp } = submitRsvp(
      event.id,
      { name: "Careful", email: "careful@example.com", attending: "yes", marketingOptIn: true },
      "public-web",
    );
    await new Promise((r) => setTimeout(r, 5));
    const edited = updateRsvpByManageToken(manageToken, { guestCount: 3 }, "manage-web");
    expect(edited.rsvp.marketingOptIn).toBe(true);
    expect(edited.rsvp.consentRecordedAt).toBe(rsvp.consentRecordedAt); // untouched
    expect(edited.rsvp.consentSource).toBe("public-web");

    const withdrawn = updateRsvpByManageToken(manageToken, { marketingOptIn: false }, "manage-web");
    expect(withdrawn.rsvp.marketingOptIn).toBe(false);
    expect(withdrawn.rsvp.consentSource).toBe("manage-web");
    expect(withdrawn.rsvp.consentRecordedAt! > rsvp.consentRecordedAt!).toBe(true);
  });

  it("deletes via manage token", () => {
    const event = makeEvent();
    const { manageToken } = submitRsvp(event.id, { name: "Gone", attending: "yes" }, "public-web");
    expect(deleteRsvpByManageToken(manageToken)).toBe(true);
    expect(deleteRsvpByManageToken(manageToken)).toBe(false);
    expect(listRsvps(event.id)).toHaveLength(0);
  });

  it("keeps separate rows for responses without email", () => {
    const event = makeEvent();
    submitRsvp(event.id, { name: "Guest One", attending: "yes" }, "public-web");
    submitRsvp(event.id, { name: "Guest Two", attending: "yes" }, "public-web");
    expect(listRsvps(event.id)).toHaveLength(2);
  });

  it("validates attending and guest bounds", () => {
    const event = makeEvent();
    expect(() => submitRsvp(event.id, { name: "X", attending: "maybe" }, "t")).toThrow(ValidationError);
    expect(() => submitRsvp(event.id, { name: "X" }, "t")).toThrow(ValidationError);
    expect(() => submitRsvp(event.id, { name: "X", attending: "yes", guestCount: 11 }, "t")).toThrow(
      ValidationError,
    );
  });

  it("computes the summary including guests", () => {
    const event = makeEvent();
    submitRsvp(event.id, { name: "A", attending: "yes", guestCount: 2 }, "t");
    submitRsvp(event.id, { name: "B", attending: "yes" }, "t");
    submitRsvp(event.id, { name: "C", attending: "no", guestCount: 3 }, "t");
    expect(rsvpSummary(event.id)).toEqual({
      responseCount: 3,
      attendingCount: 2,
      totalGuests: 4, // 1+2 for A, 1+0 for B; declined guests don't count
      declinedCount: 1,
    });
  });

  it("edits via manage token", () => {
    const event = makeEvent();
    const { manageToken } = submitRsvp(event.id, { name: "Edit Me", attending: "yes", guestCount: 1 }, "t");
    const { rsvp } = updateRsvpByManageToken(manageToken, { attending: "no", guestCount: 0 }, "manage-web");
    expect(rsvp.attending).toBe("no");
    expect(rsvp.name).toBe("Edit Me"); // untouched fields survive
    expect(rsvp.consentSource).toBe("t"); // consent untouched ⇒ bookkeeping preserved (A5)
    expect(() => updateRsvpByManageToken("bogus", { attending: "yes" }, "t")).toThrow(ApiError);
  });

  it("rejects RSVPs when the event is not published", () => {
    const event = makeEvent();
    updateEvent(event.id, { status: "archived" });
    try {
      submitRsvp(event.id, { name: "Late", attending: "yes" }, "t");
      expect.unreachable("should have thrown");
    } catch (err) {
      expect((err as ApiError).code).toBe("rsvps_closed");
      expect((err as ApiError).status).toBe(409);
    }
  });
});
