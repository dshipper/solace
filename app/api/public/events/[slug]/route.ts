import { NextRequest, NextResponse } from "next/server";
import { publicEventBundle } from "@/lib/bundles";
import { getEventBySlug } from "@/lib/events";
import { handleApiError } from "@/lib/http";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  try {
    const { slug } = await params;
    const event = getEventBySlug(slug);
    // Drafts are not public; archived services stay readable as a memorial.
    if (!event || event.status === "draft") {
      throw new ApiError(404, "not_found", "This page isn't available.");
    }
    return NextResponse.json(publicEventBundle(event));
  } catch (err) {
    return handleApiError(err);
  }
}
