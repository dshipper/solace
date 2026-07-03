import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { getSessionUser } from "./staff";
import type { StaffUser } from "./types";

export const STAFF_COOKIE = "solace_staff";

export async function getStaffOrNull(): Promise<StaffUser | null> {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  return token ? getSessionUser(token) : null;
}

export async function requireStaff(): Promise<StaffUser> {
  const user = await getStaffOrNull();
  if (!user) redirect("/admin/login");
  return user;
}

export function getStaffFromRequest(req: NextRequest): StaffUser | null {
  const token = req.cookies.get(STAFF_COOKIE)?.value;
  return token ? getSessionUser(token) : null;
}
