import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, formatServiceLine, formatYears, inviteMessage } from "@/lib/format";
import type { Service } from "@/lib/types";

const service: Service = {
  id: "s1",
  eventId: "e1",
  kind: "funeral",
  title: null,
  startsAt: "2026-07-11T11:00",
  endsAt: null,
  venueName: "First Presbyterian Church",
  address: null,
  notes: null,
  livestreamUrl: null,
  sortOrder: 0,
};

describe("format", () => {
  it("formats dates and datetimes without timezone drift", () => {
    expect(formatDate("1941-03-08")).toBe("March 8, 1941");
    expect(formatDateTime("2026-07-11T11:00")).toBe("Saturday, July 11, 2026 at 11:00 AM");
    expect(formatDateTime("2026-07-10")).toBe("Friday, July 10, 2026");
    expect(formatDateTime(null)).toBe("");
  });

  it("formats year ranges", () => {
    expect(formatYears("1941-03-08", "2026-06-20")).toBe("1941–2026");
    expect(formatYears(null, "2026-06-20")).toBe("2026");
    expect(formatYears(null, null)).toBe("");
  });

  it("builds service lines and invite messages", () => {
    expect(formatServiceLine(service)).toBe(
      "Funeral Service on Saturday, July 11, 2026 at 11:00 AM at First Presbyterian Church",
    );
    const msg = inviteMessage({ deceasedName: "Margaret Ellen Hayes" }, service, "http://x.test/e/abc");
    expect(msg).toContain("in memory of Margaret Ellen Hayes");
    expect(msg).toContain("Funeral Service on Saturday, July 11, 2026");
    expect(msg).toContain("Details and RSVP: http://x.test/e/abc");
    const bare = inviteMessage({ deceasedName: "M" }, null, "http://x.test/e/abc");
    expect(bare).toBe("You're invited to a service in memory of M. Details and RSVP: http://x.test/e/abc");
  });
});
