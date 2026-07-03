"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth-server";
import { createEvent, deleteEvent, getEvent, regenerateFamilyCode, updateEvent } from "@/lib/events";
import { setServices } from "@/lib/services";
import { deleteRsvp } from "@/lib/rsvps";
import { removeOrganizer } from "@/lib/organizers";
import { createUpdate, deleteUpdate, getUpdate } from "@/lib/updates";
import { ApiError } from "@/lib/validate";
import type { ServiceInput, ServiceKind } from "@/lib/types";
import type { FormState } from "@/components/admin/form-state";

const AUTHORIZATION_MESSAGE =
  "Please confirm the family has authorized publishing this obituary and photo.";

function asStr(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

/** The services editor submits its rows as one JSON hidden field. */
function parseServices(formData: FormData): ServiceInput[] {
  const raw = formData.get("servicesJson");
  if (typeof raw !== "string" || raw.trim() === "") return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new ApiError(400, "invalid_input", "The services list could not be read. Please try again.");
  }
  if (!Array.isArray(parsed)) {
    throw new ApiError(400, "invalid_input", "The services list could not be read. Please try again.");
  }
  return parsed.map((row) => {
    const r = (row ?? {}) as Record<string, unknown>;
    return {
      kind: asStr(r.kind) as ServiceKind,
      title: asStr(r.title),
      startsAt: asStr(r.startsAt),
      endsAt: asStr(r.endsAt),
      venueName: asStr(r.venueName),
      address: asStr(r.address),
      notes: asStr(r.notes),
      livestreamUrl: asStr(r.livestreamUrl),
    };
  });
}

export async function createEventAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const staff = await requireStaff();
  let eventId = "";
  try {
    // A11: publication must be explicitly authorized by the family.
    if (formData.get("publicationAuthorized") !== "on") {
      return { error: AUTHORIZATION_MESSAGE };
    }
    const services = parseServices(formData);
    const event = createEvent({
      deceasedName: formData.get("deceasedName"),
      bornOn: formData.get("bornOn"),
      diedOn: formData.get("diedOn"),
      photoPath: formData.get("photoPath"),
      obituaryText: formData.get("obituaryText"),
      publicationAuthorized: true,
      createdBy: staff.id,
    });
    eventId = event.id;
    setServices(event.id, services);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin");
  redirect(`/admin/events/${eventId}`);
}

export async function updateEventAction(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  try {
    if (formData.get("publicationAuthorized") !== "on") {
      return { error: AUTHORIZATION_MESSAGE };
    }
    const services = parseServices(formData);
    updateEvent(eventId, {
      deceasedName: formData.get("deceasedName"),
      bornOn: formData.get("bornOn"),
      diedOn: formData.get("diedOn"),
      photoPath: formData.get("photoPath"),
      obituaryText: formData.get("obituaryText"),
      status: formData.get("status"),
      publicationAuthorized: true,
    });
    setServices(eventId, services);
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: "Saved.", at: Date.now() };
}

export async function deleteRsvpAction(eventId: string, rsvpId: string, _formData: FormData): Promise<void> {
  await requireStaff();
  deleteRsvp(rsvpId);
  revalidatePath(`/admin/events/${eventId}`);
  revalidatePath("/admin");
}

export async function removeOrganizerAction(
  eventId: string,
  organizerId: string,
  _formData: FormData,
): Promise<void> {
  await requireStaff();
  removeOrganizer(organizerId);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function createUpdateAction(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const staff = await requireStaff();
  try {
    createUpdate(eventId, {
      authorKind: "staff",
      authorName: staff.name,
      title: formData.get("title"),
      bodyText: formData.get("body"),
    });
  } catch (err) {
    if (err instanceof ApiError) return { error: err.message };
    throw err;
  }
  revalidatePath(`/admin/events/${eventId}`);
  return { ok: "Posted.", at: Date.now() };
}

export async function deleteUpdateAction(eventId: string, updateId: string, _formData: FormData): Promise<void> {
  await requireStaff();
  const update = getUpdate(updateId);
  if (update && update.eventId === eventId) {
    deleteUpdate(updateId);
  }
  revalidatePath(`/admin/events/${eventId}`);
}

export async function regenerateFamilyCodeAction(eventId: string, _formData: FormData): Promise<void> {
  await requireStaff();
  regenerateFamilyCode(eventId);
  revalidatePath(`/admin/events/${eventId}`);
}

export async function deleteEventAction(
  eventId: string,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requireStaff();
  const event = getEvent(eventId);
  if (event) {
    const lastName = event.deceasedName.trim().split(/\s+/).pop() ?? "";
    const typed = String(formData.get("confirmName") ?? "").trim();
    if (typed.toLowerCase() !== lastName.toLowerCase()) {
      return { error: "That name doesn't match. Please type the family name exactly as it appears." };
    }
    deleteEvent(eventId);
  }
  revalidatePath("/admin");
  redirect("/admin");
}
