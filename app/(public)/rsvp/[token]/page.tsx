import type { Metadata } from "next";
import Link from "next/link";
import ManageRsvp from "@/components/public/ManageRsvp";
import { formatServiceLine } from "@/lib/format";
import { getRsvpByManageToken } from "@/lib/rsvps";
import { listServices } from "@/lib/services";
import { getFuneralHomeName } from "@/lib/settings";
import styles from "@/components/public/EventPage.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Your reply",
  robots: { index: false, follow: false },
};

interface PageProps {
  params: Promise<{ token: string }>;
}

export default async function ManageRsvpPage({ params }: PageProps) {
  const { token } = await params;
  const found = getRsvpByManageToken(token);

  if (!found) {
    return (
      <main className="container" style={{ paddingTop: "6rem", paddingBottom: "6rem", textAlign: "center" }}>
        <h1 style={{ fontSize: "1.5rem" }}>{"This link is no longer valid."}</h1>
        <p className="muted">{"You can reply again from the service page."}</p>
      </main>
    );
  }

  const { rsvp, event } = found;
  const funeralHomeName = getFuneralHomeName();
  const services = listServices(event.id);
  const firstServiceLine = services.length > 0 ? formatServiceLine(services[0]) : null;

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.manageHeader}>
          <p className={styles.sectionTitle}>{"Your reply"}</p>
          <h1 className={styles.manageName}>{event.deceasedName}</h1>
          {firstServiceLine ? <p className={styles.serviceLine}>{firstServiceLine}</p> : null}
          <p className={styles.backLink}>
            <Link href={`/e/${event.slug}`}>{"See the service page"}</Link>
          </p>
        </header>
        <hr className="divider" />
        <ManageRsvp
          token={token}
          slug={event.slug}
          funeralHomeName={funeralHomeName}
          eventOpen={event.status === "published"}
          initial={{
            name: rsvp.name,
            email: rsvp.email ?? "",
            phone: rsvp.phone ?? "",
            attending: rsvp.attending,
            guestCount: rsvp.guestCount,
            note: rsvp.note ?? "",
            eventUpdatesOptIn: rsvp.eventUpdatesOptIn,
            marketingOptIn: rsvp.marketingOptIn,
          }}
        />
      </div>
    </main>
  );
}
