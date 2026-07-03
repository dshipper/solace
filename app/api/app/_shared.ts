import type { Organizer } from "@/lib/types";

/** The organizer projection the iOS app sees — no consent bookkeeping internals. */
export function organizerJson(organizer: Organizer) {
  return {
    id: organizer.id,
    name: organizer.name,
    marketingOptIn: organizer.marketingOptIn,
    email: organizer.email,
    phone: organizer.phone,
  };
}
