"use server";

import { revalidatePath } from "next/cache";
import { requireStaff } from "@/lib/auth-server";
import { setSetting } from "@/lib/settings";
import { createStaffUser } from "@/lib/staff";
import { ApiError } from "@/lib/validate";
import type { FormState } from "@/components/admin/form-state";

export async function saveFuneralHomeNameAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  const name = String(formData.get("funeralHomeName") ?? "").trim();
  if (!name) return { error: "Please enter a name." };
  if (name.length > 200) return { error: "The name must be at most 200 characters." };
  setSetting("funeral_home_name", name);
  // The name appears in the admin top bar and across public pages.
  revalidatePath("/admin", "layout");
  revalidatePath("/", "layout");
  return { ok: "Saved.", at: Date.now() };
}

export async function addStaffUserAction(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireStaff();
  let createdName = "";
  try {
    const user = createStaffUser({
      email: formData.get("email"),
      name: formData.get("name"),
      password: formData.get("password"),
    });
    createdName = user.name;
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin/settings");
  return { ok: `Added ${createdName}. They can sign in now.`, at: Date.now() };
}
