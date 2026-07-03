import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-server";
import { listConsentedContacts, listSuppressions } from "@/lib/marketing";
import { getFuneralHomeName } from "@/lib/settings";
import { formatDate } from "@/lib/format";
import ConfirmButton from "@/components/admin/ConfirmButton";
import styles from "@/components/admin/admin.module.css";
import { suppressEmailAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Marketing · Solace",
};

const SOURCE_LABEL: Record<string, string> = {
  rsvp: "Reply",
  organizer: "Organizer",
};

export default async function MarketingPage() {
  await requireStaff();
  const funeralHomeName = getFuneralHomeName();
  const contacts = listConsentedContacts();
  const suppressions = listSuppressions();

  const emails = Array.from(new Set(contacts.map((c) => c.email.toLowerCase())));
  const composeMailto = emails.length > 0 ? `mailto:?bcc=${emails.map(encodeURIComponent).join(",")}` : null;

  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Marketing</h1>
          <p className={styles.pageSub}>
            Everyone here personally opted in to hear from {funeralHomeName}. Consent wording is versioned;
            suppressions win over stale flags.
          </p>
        </div>
        <div className={styles.actionsRow}>
          <a href="/admin/marketing/export" className="btn">
            Download CSV
          </a>
          {composeMailto ? (
            <a href={composeMailto} className="btn btn-primary">
              Compose email
            </a>
          ) : null}
        </div>
      </div>

      {contacts.length === 0 ? (
        <div className={`${styles.card} ${styles.empty}`}>
          <p style={{ marginBottom: 0 }}>
            No one has opted in yet. People opt in on the RSVP form or in the family app, one checkbox at a time.
          </p>
        </div>
      ) : (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Source</th>
                <th>Event</th>
                <th>Consented</th>
                <th>Version</th>
                <th aria-label="Actions" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, i) => (
                <tr key={`${c.email}-${c.source}-${i}`}>
                  <td>{c.name}</td>
                  <td>{c.email}</td>
                  <td>{SOURCE_LABEL[c.source] ?? c.source}</td>
                  <td>{c.eventName}</td>
                  <td>{c.consentRecordedAt ? formatDate(c.consentRecordedAt) : "—"}</td>
                  <td className="muted">{c.consentVersion ?? "—"}</td>
                  <td>
                    <form action={suppressEmailAction.bind(null, c.email)}>
                      <ConfirmButton
                        label="Suppress"
                        confirmLabel="Suppress address"
                        note="Removes this address from every future export."
                      />
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p className={styles.hint} style={{ marginTop: "0.75rem" }}>
        The export contains email addresses only. Phone numbers are never exported.
      </p>

      <section className={styles.section} style={{ marginTop: "2.5rem" }}>
        <h2 className={styles.sectionTitle}>Suppressed addresses</h2>
        <p className={styles.hint} style={{ marginBottom: "0.75rem" }}>
          These addresses never appear in the export, even if an older reply still has the box checked. A person can
          opt back in later by checking the box again on a new reply.
        </p>
        {suppressions.length === 0 ? (
          <div className={`${styles.card} ${styles.empty}`}>
            <p style={{ marginBottom: 0 }}>No suppressed addresses.</p>
          </div>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Email</th>
                  <th>Source</th>
                  <th>Suppressed</th>
                </tr>
              </thead>
              <tbody>
                {suppressions.map((s) => (
                  <tr key={s.email}>
                    <td>{s.email}</td>
                    <td>{s.source === "staff" ? "Staff" : s.source === "public-unsubscribe" ? "Unsubscribe page" : s.source}</td>
                    <td>{formatDate(s.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  );
}
