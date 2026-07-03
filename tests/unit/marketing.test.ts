import { describe, expect, it } from "vitest";
import { createEvent } from "@/lib/events";
import { joinEvent, setOrganizerOptIn } from "@/lib/organizers";
import { submitRsvp } from "@/lib/rsvps";
import { consentedCsv, listConsentedContacts, listSuppressions, unsubscribeEmail } from "@/lib/marketing";
import { CONSENT_VERSION } from "@/lib/types";

describe("marketing list", () => {
  it("contains ONLY people who personally opted in and left an email", () => {
    const event = createEvent({ deceasedName: "Consent Test" });
    submitRsvp(
      event.id,
      { name: "Opted In", email: "in@example.com", attending: "yes", marketingOptIn: true },
      "public-web",
    );
    submitRsvp(event.id, { name: "Opted Out", email: "out@example.com", attending: "yes" }, "public-web");
    submitRsvp(event.id, { name: "No Email", attending: "yes", marketingOptIn: true }, "public-web");
    const { organizer } = joinEvent(event.familyCode, "Organizer Opt")!;
    setOrganizerOptIn(organizer.id, { marketingOptIn: true, email: "org@example.com" });
    joinEvent(event.familyCode, "Organizer Silent");

    const contacts = listConsentedContacts();
    const names = contacts.map((c) => c.name).sort();
    expect(names).toEqual(["Opted In", "Organizer Opt"]);
    for (const c of contacts) {
      expect(c.email).toBeTruthy();
      expect(c.consentRecordedAt).toBeTruthy();
      expect(c.consentVersion).toBe(CONSENT_VERSION);
      expect(c.eventName).toBe("Consent Test");
      expect("phone" in c).toBe(false); // phone is never exported
    }
  });

  it("suppression removes a contact everywhere; a fresh consent afterwards wins", async () => {
    const event = createEvent({ deceasedName: "Suppress Test" });
    submitRsvp(
      event.id,
      { name: "Regrets", email: "regrets@example.com", attending: "yes", marketingOptIn: true },
      "public-web",
    );
    expect(listConsentedContacts().some((c) => c.email === "regrets@example.com")).toBe(true);

    unsubscribeEmail("Regrets@Example.com", "public-unsubscribe");
    expect(listConsentedContacts().some((c) => c.email === "regrets@example.com")).toBe(false);
    expect(listSuppressions()[0].email).toBe("regrets@example.com");

    // a later re-submission that re-checks the box postdates the suppression
    await new Promise((r) => setTimeout(r, 5));
    submitRsvp(
      event.id,
      { name: "Regrets", email: "regrets@example.com", attending: "yes", marketingOptIn: true },
      "public-web",
    );
    expect(listConsentedContacts().some((c) => c.email === "regrets@example.com")).toBe(true);
  });

  it("escapes CSV fields safely and has an email-only header", () => {
    const event = createEvent({ deceasedName: 'Quote "Test", Inc' });
    submitRsvp(
      event.id,
      { name: 'Comma, "Quoted"', email: "csv@example.com", attending: "yes", marketingOptIn: true },
      "public-web",
    );
    const csv = consentedCsv();
    expect(csv.split("\n")[0]).toBe("name,email,source,event,consent_recorded_at,consent_version");
    expect(csv).toContain('"Comma, ""Quoted"""');
    expect(csv).toContain('"Quote ""Test"", Inc"');
    expect(csv).not.toContain("phone");
  });
});
