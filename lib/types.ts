export type EventStatus = "draft" | "published" | "archived";

export const SERVICE_KINDS = [
  "visitation",
  "funeral",
  "graveside",
  "memorial",
  "reception",
  "livestream",
] as const;
export type ServiceKind = (typeof SERVICE_KINDS)[number];

export interface EventRecord {
  id: string;
  slug: string;
  familyCode: string;
  deceasedName: string;
  bornOn: string | null;
  diedOn: string | null;
  photoPath: string | null;
  obituaryText: string;
  status: EventStatus;
  publicationAuthorized: boolean;
  createdBy: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Service {
  id: string;
  eventId: string;
  kind: ServiceKind;
  title: string | null;
  startsAt: string | null;
  endsAt: string | null;
  venueName: string | null;
  address: string | null;
  notes: string | null;
  livestreamUrl: string | null;
  sortOrder: number;
}

export interface ServiceInput {
  kind: ServiceKind;
  title?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
  venueName?: string | null;
  address?: string | null;
  notes?: string | null;
  livestreamUrl?: string | null;
}

export interface Organizer {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  marketingOptIn: boolean;
  consentRecordedAt: string | null;
  consentSource: string | null;
  consentVersion: string | null;
  createdAt: string;
  lastSeenAt: string | null;
}

/** Version tag stored with every recorded consent so the exact wording is provable. */
export const CONSENT_VERSION = "v1-email-2026-07";

export interface Rsvp {
  id: string;
  eventId: string;
  name: string;
  email: string | null;
  phone: string | null;
  attending: "yes" | "no";
  guestCount: number;
  note: string | null;
  eventUpdatesOptIn: boolean;
  marketingOptIn: boolean;
  consentRecordedAt: string | null;
  consentSource: string | null;
  consentVersion: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface EventUpdate {
  id: string;
  eventId: string;
  authorKind: "organizer" | "staff";
  authorName: string;
  title: string;
  bodyText: string;
  createdAt: string;
}

export interface RsvpSummary {
  responseCount: number;
  attendingCount: number;
  totalGuests: number;
  declinedCount: number;
}

export interface StaffUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
}
