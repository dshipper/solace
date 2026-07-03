import { NextRequest, NextResponse } from "next/server";
import { publicEventBundle } from "@/lib/bundles";
import { checkOrigin, clientIp, handleApiError, rateLimit, readJson } from "@/lib/http";
import { deleteRsvpByManageToken, getRsvpByManageToken, updateRsvpByManageToken } from "@/lib/rsvps";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

const LINK_GONE = "This link is no longer valid. You can reply again from the service page.";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    const { token } = await params;
    const found = getRsvpByManageToken(token);
    // Drafts are staff-only; a retracted event's manage links go quiet too.
    if (!found || found.event.status === "draft") throw new ApiError(404, "not_found", LINK_GONE);
    // The event here is the public projection only (A6) — no familyCode, no id.
    const bundle = publicEventBundle(found.event);
    return NextResponse.json({
      rsvp: found.rsvp,
      event: bundle.event,
      services: bundle.services,
      updates: bundle.updates,
    });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    checkOrigin(req);
    // RSVP writes share one 20/min/IP budget with the public POST route.
    rateLimit(`rsvp:ip:${clientIp(req)}`, 20, 60_000);
    const { token } = await params;
    const body = await readJson(req);
    const { rsvp } = updateRsvpByManageToken(token, body, "manage-web");
    return NextResponse.json({ rsvp });
  } catch (err) {
    return handleApiError(err);
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  try {
    checkOrigin(req);
    rateLimit(`rsvp:ip:${clientIp(req)}`, 20, 60_000);
    const { token } = await params;
    if (!deleteRsvpByManageToken(token)) {
      throw new ApiError(404, "not_found", LINK_GONE);
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
