"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth-server";
import { unsubscribeEmail } from "@/lib/marketing";

/**
 * Staff-side suppression (A8): zeroes the marketing flags everywhere and
 * records a suppression so the address never appears in the export again.
 */
export async function suppressEmailAction(email: string, _formData: FormData): Promise<void> {
  await requireStaff();
  unsubscribeEmail(email, "staff");
  revalidatePath("/admin/marketing");
}
