import { NextRequest, NextResponse } from "next/server";
import { organizerEventBundle } from "@/lib/bundles";
import { checkOrigin, clientIp, handleApiError, jsonError, rateLimit, readJson } from "@/lib/http";
import { joinEvent } from "@/lib/organizers";
import { organizerJson } from "../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    rateLimit(`join:ip:${clientIp(req)}`, 10, 60_000);
    rateLimit("join:global", 100, 3_600_000);
    const body = await readJson(req);
    const joined = joinEvent(body.familyCode, body.name);
    if (!joined) {
      // Unknown and archived codes answer identically, so codes can't be probed.
      return jsonError(
        404,
        "unknown_code",
        "That code didn't match a service. Please check it with the funeral home.",
      );
    }
    return NextResponse.json({
      token: joined.token,
      organizer: organizerJson(joined.organizer),
      bundle: organizerEventBundle(joined.event),
    });
  } catch (err) {
    return handleApiError(err);
  }
}
