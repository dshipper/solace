import { NextRequest, NextResponse } from "next/server";
import { getStaffFromRequest } from "@/lib/auth-server";
import { jsonError } from "@/lib/http";
import { consentedCsv } from "@/lib/marketing";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  if (!getStaffFromRequest(req)) {
    return jsonError(401, "unauthorized", "Sign in required.");
  }
  return new NextResponse(consentedCsv(), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="solace-consented.csv"',
    },
  });
}
