import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireOrganizer } from "@/lib/http";
import { deleteOrganizerByToken } from "@/lib/organizers";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest) {
  try {
    requireOrganizer(req);
    const match = /^Bearer\s+(.+)$/i.exec(req.headers.get("authorization") ?? "");
    const token = match ? match[1].trim() : "";
    if (!deleteOrganizerByToken(token)) {
      throw new ApiError(401, "unauthorized", "Missing or invalid token.");
    }
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
