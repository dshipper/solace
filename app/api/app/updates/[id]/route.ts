import { NextRequest, NextResponse } from "next/server";
import { handleApiError, requireOrganizer } from "@/lib/http";
import { deleteUpdate, getUpdate } from "@/lib/updates";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const organizer = requireOrganizer(req);
    const { id } = await params;
    const update = getUpdate(id);
    if (!update || update.eventId !== organizer.eventId) {
      throw new ApiError(404, "not_found", "That update could not be found.");
    }
    if (update.authorKind === "staff") {
      throw new ApiError(
        403,
        "not_own_update",
        "This update was posted by the funeral home, so only they can remove it.",
      );
    }
    deleteUpdate(id);
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return handleApiError(err);
  }
}
