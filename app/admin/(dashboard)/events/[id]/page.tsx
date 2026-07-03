import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireStaff } from "@/lib/auth-server";
import { getEvent, photoUrlPath, publicUrl } from "@/lib/events";
import { listServices } from "@/lib/services";
import { listRsvps, rsvpSummary } from "@/lib/rsvps";
import { listOrganizers } from "@/lib/organizers";
import { listUpdates } from "@/lib/updates";
import { formatDate, formatYears } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import CopyButton from "@/components/admin/CopyButton";
import DeleteEventForm from "@/components/admin/DeleteEventForm";
import EventForm from "@/components/admin/EventForm";
import UpdateComposer from "@/components/admin/UpdateComposer";
import styles from "@/components/admin/admin.module.css";
import {
  createUpdateAction,
  deleteEventAction,
  deleteRsvpAction,
  deleteUpdateAction,
  regenerateFamilyCodeAction,
  removeOrganizerAction,
  updateEventAction,
} from "../actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Event details · Solace",
};

const STATUS_BADGE: Record<string, string> = {
  draft: "badge badge-gold",
  published: "badge",
  archived: "badge badge-muted",
};

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
};

function paragraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const event = getEvent(id);
  if (!event) notFound();

  const services = listServices(event.id);
  const rsvps = listRsvps(event.id);
  const summary = rsvpSummary(event.id);
  const organizers = listOrganizers(event.id);
  const updates = listUpdates(event.id);

  const link = publicUrl(event);
  const qrDataUrl = await QRCode.toDataURL(link, { margin: 1, width: 220 });

  const attendeeEmails = Array.from(
    new Set(
      rsvps
        .filter((r) => r.eventUpdatesOptIn && r.email)
        .map((r) => r.email!.toLowerCase()),
    ),
  );
  const attendeesMailto =
    attendeeEmails.length > 0
      ? `mailto:?bcc=${attendeeEmails.map(encodeURIComponent).join(",")}&subject=${encodeURIComponent(
          `About the service for ${event.deceasedName}`,
        )}`
      : null;

  const lastName = event.deceasedName.trim().split(/\s+/).pop() ?? event.deceasedName;
  const years = formatYears(event.bornOn, event.diedOn);

  const initialServices = services.map((s) => ({
    kind: s.kind,
    title: s.title ?? "",
    startsAt: s.startsAt ?? "",
    endsAt: s.endsAt ?? "",
    venueName: s.venueName ?? "",
    address: s.address ?? "",
    notes: s.notes ?? "",
    livestreamUrl: s.livestreamUrl ?? "",
  }));

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>{event.deceasedName}</h1>
          <p className={styles.pageSub}>
            {years ? `${years} · ` : ""}
            <span className={STATUS_BADGE[event.status] ?? "badge"}>
              {STATUS_LABEL[event.status] ?? event.status}
            </span>
          </p>
        </div>
        <a href={link} target="_blank" rel="noreferrer" className="btn">
          View public page
        </a>
      </div>

      <nav className={styles.sectionNav} aria-label="Sections">
        <a href="#share">Share</a>
        <a href="#rsvps">RSVPs</a>
        <a href="#organizers">Organizers</a>
        <a href="#updates">Updates</a>
        <a href="#edit">Edit</a>
        <a href="#danger">Danger zone</a>
      </nav>

      <section id="share" className={styles.section}>
        <h2 className={styles.sectionTitle}>Share with the family</h2>
        <div className={styles.card}>
          <div className={styles.shareGrid}>
            <div>
              <span className={styles.hint}>Family code</span>
              <p className={styles.familyCode}>{event.familyCode}</p>
              <div className={styles.actionsRow} style={{ marginBottom: "1rem" }}>
                <CopyButton text={event.familyCode} label="Copy code" />
              </div>
              <span className={styles.hint}>Public page</span>
              <p className={styles.shareLink}>
                <a href={link} target="_blank" rel="noreferrer">
                  {link}
                </a>
              </p>
              <div className={styles.actionsRow}>
                <CopyButton text={link} label="Copy link" />
              </div>
            </div>
            <div className={styles.qrBox}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qrDataUrl} alt={`QR code for the public page for ${event.deceasedName}`} width={220} height={220} />
            </div>
          </div>
          <div className={styles.readCard}>
            <p className={styles.readCardLabel}>Read this to the family</p>
            <p style={{ margin: 0 }}>
              Download the Solace app on your iPhone, then enter the code {event.familyCode}. You can invite people
              from your contacts and see who is coming.
            </p>
          </div>
        </div>
      </section>

      <section id="rsvps" className={styles.section}>
        <h2 className={styles.sectionTitle}>RSVPs</h2>
        <div className={styles.chips}>
          <span className={styles.chip}>
            <strong>{summary.responseCount}</strong> replies
          </span>
          <span className={styles.chip}>
            <strong>{summary.totalGuests}</strong> attending, including guests
          </span>
          <span className={styles.chip}>
            <strong>{summary.declinedCount}</strong> declined
          </span>
          {attendeesMailto ? (
            <a href={attendeesMailto} className={`btn ${styles.btnSm}`}>
              Email attendees
            </a>
          ) : null}
        </div>
        {rsvps.length === 0 ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <p style={{ marginBottom: 0 }}>No replies yet. They will appear here as people respond.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Attending</th>
                  <th>Guests</th>
                  <th>Note</th>
                  <th>Opt-ins</th>
                  <th>Replied</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {rsvps.map((r) => (
                  <tr key={r.id}>
                    <td>{r.name}</td>
                    <td>{r.email ?? "—"}</td>
                    <td>{r.phone ?? "—"}</td>
                    <td>{r.attending === "yes" ? "Yes" : "No"}</td>
                    <td>{r.guestCount}</td>
                    <td className={styles.noteCell}>{r.note ?? "—"}</td>
                    <td>
                      <span className={styles.badgeRow}>
                        {r.eventUpdatesOptIn ? <span className="badge">updates</span> : null}
                        {r.marketingOptIn ? <span className="badge badge-gold">marketing</span> : null}
                        {!r.eventUpdatesOptIn && !r.marketingOptIn ? "—" : null}
                      </span>
                    </td>
                    <td>{formatDate(r.createdAt)}</td>
                    <td>
                      <form action={deleteRsvpAction.bind(null, event.id, r.id)}>
                        <ConfirmButton label="Delete" confirmLabel="Delete reply" />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="organizers" className={styles.section}>
        <h2 className={styles.sectionTitle}>Organizers</h2>
        <p className={styles.hint} style={{ marginBottom: "0.75rem" }}>
          People who joined with the family code from the Solace app.
        </p>
        {organizers.length === 0 ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <p style={{ marginBottom: 0 }}>No one has joined with the family code yet.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Joined</th>
                  <th>Last seen</th>
                  <th>Marketing</th>
                  <th aria-label="Actions" />
                </tr>
              </thead>
              <tbody>
                {organizers.map((o) => (
                  <tr key={o.id}>
                    <td>{o.name}</td>
                    <td>{formatDate(o.createdAt)}</td>
                    <td>{o.lastSeenAt ? formatDate(o.lastSeenAt) : "—"}</td>
                    <td>{o.marketingOptIn ? <span className="badge badge-gold">opted in</span> : "—"}</td>
                    <td>
                      <form action={removeOrganizerAction.bind(null, event.id, o.id)}>
                        <ConfirmButton
                          label="Remove"
                          confirmLabel="Remove organizer"
                          note="Their access from the app stops immediately."
                        />
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section id="updates" className={styles.section}>
        <h2 className={styles.sectionTitle}>Updates</h2>
        <UpdateComposer action={createUpdateAction.bind(null, event.id)} />
        {updates.length === 0 ? (
          <p className={styles.hint}>
            No updates yet. Updates appear on the public page — schedule changes, a livestream link, a note of
            thanks.
          </p>
        ) : (
          updates.map((u) => (
            <div key={u.id} className={styles.updateItem}>
              <div className={styles.updateHead}>
                <h3 className={styles.updateTitle}>{u.title}</h3>
                <form action={deleteUpdateAction.bind(null, event.id, u.id)}>
                  <ConfirmButton label="Delete" confirmLabel="Delete update" />
                </form>
              </div>
              <p className={styles.updateMeta}>
                {u.authorName} · {u.authorKind === "staff" ? "staff" : "family"} · {formatDate(u.createdAt)}
              </p>
              <div className={styles.updateBody}>
                {paragraphs(u.bodyText).map((para, i) => (
                  <p key={i}>{para}</p>
                ))}
              </div>
            </div>
          ))
        )}
      </section>

      <section id="edit" className={styles.section}>
        <h2 className={styles.sectionTitle}>Edit</h2>
        <EventForm
          action={updateEventAction.bind(null, event.id)}
          initial={{
            deceasedName: event.deceasedName,
            bornOn: event.bornOn ?? "",
            diedOn: event.diedOn ?? "",
            obituaryText: event.obituaryText,
            status: event.status,
            photoPath: event.photoPath ?? "",
            photoUrl: photoUrlPath(event) ?? "",
            services: initialServices,
          }}
          showStatus
          submitLabel="Save changes"
        />
      </section>

      <section id="danger" className={styles.section}>
        <h2 className={styles.sectionTitle}>Danger zone</h2>
        <div className={styles.danger}>
          <div className={styles.dangerBlock}>
            <h3 className={styles.dangerHeading}>Regenerate family code</h3>
            <p className={styles.hint} style={{ marginBottom: "0.6rem" }}>
              If the code was shared more widely than intended, generate a new one.
            </p>
            <form action={regenerateFamilyCodeAction.bind(null, event.id)}>
              <ConfirmButton
                label="Regenerate family code"
                confirmLabel="Yes, regenerate"
                variant="default"
                note="The old code stops working immediately. People who already joined keep access."
              />
            </form>
          </div>
          <div className={styles.dangerBlock}>
            <h3 className={styles.dangerHeading}>Delete this event</h3>
            <DeleteEventForm action={deleteEventAction.bind(null, event.id)} confirmWord={lastName} />
          </div>
        </div>
      </section>
    </>
  );
}
