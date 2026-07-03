import { NextRequest, NextResponse } from "next/server";
import { getEventBySlug } from "@/lib/events";
import { checkOrigin, clientIp, handleApiError, rateLimit, readJson } from "@/lib/http";
import { submitRsvp } from "@/lib/rsvps";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    checkOrigin(req);
    rateLimit(`rsvp:ip:${clientIp(req)}`, 20, 60_000);
    const { slug } = await params;
    const event = getEventBySlug(slug);
    if (!event || event.status === "draft") {
      throw new ApiError(404, "not_found", "This page isn't available.");
    }
    const body = await readJson(req);
    const { rsvp, manageToken, updated } = submitRsvp(event.id, body, "public-web");
    return NextResponse.json({ manageToken, rsvp, updated });
  } catch (err) {
    return handleApiError(err);
  }
}
