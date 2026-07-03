import { NextRequest, NextResponse } from "next/server";
import { getStaffFromRequest } from "@/lib/auth-server";
import { checkOrigin, handleApiError } from "@/lib/http";
import { savePhoto } from "@/lib/photos";
import { ApiError } from "@/lib/validate";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    checkOrigin(req);
    if (!getStaffFromRequest(req)) {
      throw new ApiError(401, "unauthorized", "Sign in required.");
    }
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      throw new ApiError(400, "invalid_form", "Expected multipart form data.");
    }
    const file = form.get("photo");
    if (!(file instanceof File)) {
      throw new ApiError(400, "invalid_form", "Missing photo file.");
    }
    const photoPath = await savePhoto(file);
    return NextResponse.json({ photoPath, photoUrl: `/api/uploads/${photoPath}` });
  } catch (err) {
    return handleApiError(err);
  }
}
