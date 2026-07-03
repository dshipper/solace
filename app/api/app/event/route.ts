import { NextRequest, NextResponse } from "next/server";
import { organizerEventBundle } from "@/lib/bundles";
import { getEvent } from "@/lib/events";
import { handleApiError, requireOrganizer } from "@/lib/http";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const organizer = requireOrganizer(req);
    const event = getEvent(organizer.eventId);
    if (!event) throw new ApiError(404, "not_found", "This service is no longer available.");
    return NextResponse.json(organizerEventBundle(event));
  } catch (err) {
    return handleApiError(err);
  }
}
