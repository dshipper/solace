import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { uploadsDir } from "@/lib/db";
import { CONTENT_TYPES, UPLOAD_NAME_RE } from "@/lib/photos";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  if (!UPLOAD_NAME_RE.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const filePath = path.join(uploadsDir(), name);
  if (!fs.existsSync(filePath)) {
    return new NextResponse("Not found", { status: 404 });
  }
  const ext = name.split(".").pop()!;
  return new NextResponse(new Uint8Array(fs.readFileSync(filePath)), {
    headers: {
      "content-type": CONTENT_TYPES[ext],
      "cache-control": "public, max-age=86400, immutable",
      "x-content-type-options": "nosniff",
    },
  });
}
