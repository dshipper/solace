import { NextRequest, NextResponse } from "next/server";
import { handleApiError, readJson, requireOrganizer } from "@/lib/http";
import { setOrganizerOptIn } from "@/lib/organizers";
import { ValidationError, vBool } from "@/lib/validate";
import { organizerJson } from "../../_shared";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const organizer = requireOrganizer(req);
    const body = await readJson(req);
    if (body.marketingOptIn === undefined || body.marketingOptIn === null) {
      throw new ValidationError("Marketing preference is required");
    }
    const marketingOptIn = vBool(body.marketingOptIn, "Marketing preference", false);
    const updated = setOrganizerOptIn(
      organizer.id,
      { marketingOptIn, email: body.email, phone: body.phone },
      "ios-app",
    );
    return NextResponse.json({ organizer: organizerJson(updated) });
  } catch (err) {
    return handleApiError(err);
  }
}
