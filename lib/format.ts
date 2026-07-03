import type { EventRecord, Service, ServiceKind } from "./types";

export const KIND_LABELS: Record<ServiceKind, string> = {
  visitation: "Visitation",
  funeral: "Funeral Service",
  graveside: "Graveside Service",
  memorial: "Memorial Service",
  reception: "Reception",
  livestream: "Livestream",
};

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

interface DateParts {
  year: number;
  month: number;
  day: number;
  hour: number | null;
  minute: number | null;
}

function parseParts(value: string): DateParts | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/.exec(value.trim());
  if (!match) return null;
  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3]),
    hour: match[4] !== undefined ? Number(match[4]) : null,
    minute: match[5] !== undefined ? Number(match[5]) : null,
  };
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const p = parseParts(value);
  if (!p) return value;
  return `${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
}

function formatClock(hour: number, minute: number): string {
  const suffix = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${String(minute).padStart(2, "0")} ${suffix}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "";
  const p = parseParts(value);
  if (!p) return value;
  const weekday = WEEKDAYS[new Date(p.year, p.month - 1, p.day).getDay()];
  const datePart = `${weekday}, ${MONTHS[p.month - 1]} ${p.day}, ${p.year}`;
  if (p.hour === null || p.minute === null) return datePart;
  return `${datePart} at ${formatClock(p.hour, p.minute)}`;
}

export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const p = parseParts(value);
  if (!p || p.hour === null || p.minute === null) return "";
  return formatClock(p.hour, p.minute);
}

export function formatYears(bornOn: string | null, diedOn: string | null): string {
  const born = bornOn ? parseParts(bornOn)?.year : null;
  const died = diedOn ? parseParts(diedOn)?.year : null;
  if (born && died) return `${born}–${died}`;
  if (died) return String(died);
  if (born) return String(born);
  return "";
}

export function formatServiceLine(service: Service): string {
  const label = service.title?.trim() || KIND_LABELS[service.kind];
  const when = formatDateTime(service.startsAt);
  const where = service.venueName?.trim();
  let line = label;
  if (when) line += ` on ${when}`;
  if (where) line += ` at ${where}`;
  return line;
}

export function inviteMessage(
  event: Pick<EventRecord, "deceasedName">,
  firstService: Service | null,
  url: string,
): string {
  const serviceLine = firstService ? `${formatServiceLine(firstService)}. ` : "";
  return `You're invited to a service in memory of ${event.deceasedName}. ${serviceLine}Details and RSVP: ${url}`;
}
