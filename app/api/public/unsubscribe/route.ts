import { NextRequest, NextResponse } from "next/server";
import { checkOrigin, clientIp, handleApiError, rateLimit, readJson } from "@/lib/http";
import { unsubscribeEmail } from "@/lib/marketing";
import { vEmail } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    rateLimit(`unsubscribe:ip:${clientIp(req)}`, 10, 60_000);
    let email: string | null = null;
    try {
      const body = await readJson(req);
      email = vEmail(body.email, "Email");
    } catch {
      // Malformed input gets the same calm answer, so the list can't be probed.
      email = null;
    }
    if (email) unsubscribeEmail(email, "public-unsubscribe");
    return NextResponse.json({ ok: true });
  } catch (err) {
    return handleApiError(err);
  }
}
