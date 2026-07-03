import { NextRequest, NextResponse } from "next/server";
import { handleApiError, readJson, requireOrganizer } from "@/lib/http";
import { createUpdate } from "@/lib/updates";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const organizer = requireOrganizer(req);
    const body = await readJson(req);
    const update = createUpdate(organizer.eventId, {
      authorKind: "organizer",
      authorName: organizer.name,
      title: body.title,
      bodyText: body.bodyText,
    });
    return NextResponse.json({ update });
  } catch (err) {
    return handleApiError(err);
  }
}
