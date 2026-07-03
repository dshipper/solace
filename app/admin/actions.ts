"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { STAFF_COOKIE } from "@/lib/auth-server";
import { rateLimit } from "@/lib/http";
import { createSession, destroySession, verifyStaffLogin } from "@/lib/staff";
import type { FormState } from "@/components/admin/form-state";

const GENERIC_LOGIN_MESSAGE = "That email and password didn't match.";
const LOGIN_WINDOW_MS = 15 * 60 * 1000;

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const headerStore = await headers();
  const forwarded = headerStore.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "local";

  // A10: per-IP and per-email limits. The 429 collapses into the same
  // generic message so nothing about accounts or limits is revealed.
  try {
    rateLimit(`login:ip:${ip}`, 10, LOGIN_WINDOW_MS);
    if (email) rateLimit(`login:email:${email}`, 10, LOGIN_WINDOW_MS);
  } catch {
    return { error: GENERIC_LOGIN_MESSAGE };
  }

  const user = verifyStaffLogin(email, password);
  if (!user) return { error: GENERIC_LOGIN_MESSAGE };

  const token = createSession(user.id);
  const store = await cookies();
  store.set(STAFF_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/admin");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  const token = store.get(STAFF_COOKIE)?.value;
  if (token) destroySession(token);
  store.delete(STAFF_COOKIE);
  redirect("/admin/login");
}
