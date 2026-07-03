import type { Metadata } from "next";
import Link from "next/link";
import { requireStaff } from "@/lib/auth-server";
import { listEvents } from "@/lib/events";
import { rsvpSummary } from "@/lib/rsvps";
import { formatDate, formatYears } from "@/lib/format";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Events · Solace",
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

export default async function AdminEventsPage() {
  await requireStaff();
  const events = listEvents();
  const rows = events.map((event) => ({ event, summary: rsvpSummary(event.id) }));

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Events</h1>
        <Link href="/admin/events/new" className="btn btn-primary">
          New event
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <h2 style={{ fontSize: "1.15rem" }}>No events yet</h2>
          <p>
            When a family arranges a service, create the event here. You will get a family code to hand them — with
            it, they can use the Solace app to invite people from their own contacts and watch replies come in.
            Invitees reply on a simple web page, with no app and no account.
          </p>
          <Link href="/admin/events/new" className="btn btn-primary">
            Create the first event
          </Link>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Dates</th>
                <th>Status</th>
                <th>Replies</th>
                <th>Attending</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ event, summary }) => (
                <tr key={event.id}>
                  <td>
                    <Link href={`/admin/events/${event.id}`}>{event.deceasedName}</Link>
                  </td>
                  <td>{formatYears(event.bornOn, event.diedOn) || "—"}</td>
                  <td>
                    <span className={STATUS_BADGE[event.status] ?? "badge"}>
                      {STATUS_LABEL[event.status] ?? event.status}
                    </span>
                  </td>
                  <td>{summary.responseCount}</td>
                  <td>{summary.totalGuests}</td>
                  <td>{formatDate(event.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
