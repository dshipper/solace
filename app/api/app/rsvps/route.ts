import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireOrganizer } from "@/lib/http";
import { listRsvps } from "@/lib/rsvps";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const organizer = requireOrganizer(req);
    // PII-stripped for organizers (A3): names and notes only, never email or phone.
    const rsvps = listRsvps(organizer.eventId).map((rsvp) => ({
      id: rsvp.id,
      name: rsvp.name,
      attending: rsvp.attending,
      guestCount: rsvp.guestCount,
      note: rsvp.note,
      createdAt: rsvp.createdAt,
    }));
    return NextResponse.json({ rsvps });
  } catch (err) {
    return handleApiError(err);
  }
}
