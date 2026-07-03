import { KIND_LABELS, formatDateTime, formatTime } from "@/lib/format";
import type { Service } from "@/lib/types";
import styles from "./EventPage.module.css";

export default function ServiceCard({ service }: { service: Service }) {
  const title = service.title?.trim() ?? "";
  const when = formatDateTime(service.startsAt);
  const endTime = formatTime(service.endsAt);
  return (
    <div className={`card ${styles.serviceCard}`}>
      {title ? <p className={styles.serviceKind}>{KIND_LABELS[service.kind]}</p> : null}
      <h3 className={styles.serviceTitle}>{title || KIND_LABELS[service.kind]}</h3>
      {when ? <p className={styles.serviceWhen}>{endTime ? `${when} – ${endTime}` : when}</p> : null}
      {service.venueName ? <p className={styles.serviceVenue}>{service.venueName}</p> : null}
      {service.address ? (
        <p className={styles.serviceAddress}>
          <a
            href={`https://maps.apple.com/?q=${encodeURIComponent(service.address)}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {service.address}
          </a>
        </p>
      ) : null}
      {service.notes ? <p className={styles.serviceNotes}>{service.notes}</p> : null}
      {service.livestreamUrl ? (
        <p className={styles.serviceLivestream}>
          <a href={service.livestreamUrl} target="_blank" rel="noopener noreferrer">
            {"Watch the livestream"}
          </a>
        </p>
      ) : null}
    </div>
  );
}
