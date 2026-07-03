import { absolutePhotoUrl, publicUrl } from "./events";
import { listServices } from "./services";
import { listUpdates } from "./updates";
import { rsvpSummary } from "./rsvps";
import { getFuneralHomeName } from "./settings";
import { inviteMessage } from "./format";
import type { EventRecord, EventUpdate, RsvpSummary, Service } from "./types";

export interface OrganizerEventBundle {
  event: {
    id: string;
    slug: string;
    publicUrl: string;
    familyCode: string;
    deceasedName: string;
    bornOn: string | null;
    diedOn: string | null;
    photoUrl: string | null;
    obituaryText: string;
    funeralHomeName: string;
    status: string;
  };
  services: Service[];
  updates: EventUpdate[];
  rsvpSummary: RsvpSummary;
  inviteTemplate: { message: string; url: string };
}

export interface PublicEventBundle {
  event: {
    slug: string;
    deceasedName: string;
    bornOn: string | null;
    diedOn: string | null;
    photoUrl: string | null;
    obituaryText: string;
    funeralHomeName: string;
    status: string;
  };
  services: Service[];
  updates: EventUpdate[];
}

export function organizerEventBundle(event: EventRecord): OrganizerEventBundle {
  const services = listServices(event.id);
  const url = publicUrl(event);
  return {
    event: {
      id: event.id,
      slug: event.slug,
      publicUrl: url,
      familyCode: event.familyCode,
      deceasedName: event.deceasedName,
      bornOn: event.bornOn,
      diedOn: event.diedOn,
      photoUrl: absolutePhotoUrl(event),
      obituaryText: event.obituaryText,
      funeralHomeName: getFuneralHomeName(),
      status: event.status,
    },
    services,
    updates: listUpdates(event.id),
    rsvpSummary: rsvpSummary(event.id),
    inviteTemplate: { message: inviteMessage(event, services[0] ?? null, url), url },
  };
}

export function publicEventBundle(event: EventRecord): PublicEventBundle {
  return {
    event: {
      slug: event.slug,
      deceasedName: event.deceasedName,
      bornOn: event.bornOn,
      diedOn: event.diedOn,
      photoUrl: absolutePhotoUrl(event),
      obituaryText: event.obituaryText,
      funeralHomeName: getFuneralHomeName(),
      status: event.status,
    },
    services: listServices(event.id),
    updates: listUpdates(event.id),
  };
}
