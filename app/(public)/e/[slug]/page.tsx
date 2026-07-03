import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { publicEventBundle } from "@/lib/bundles";
import { getEventBySlug } from "@/lib/events";
import { formatYears } from "@/lib/format";
import Paragraphs from "@/components/public/Paragraphs";
import RsvpSection from "@/components/public/RsvpSection";
import ServiceCard from "@/components/public/ServiceCard";
import UpdatesFeed from "@/components/public/UpdatesFeed";
import styles from "@/components/public/EventPage.module.css";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || event.status === "draft") return { title: "Solace" };
  return {
    title: `In memory of ${event.deceasedName}`,
    description: "Service details and a place to reply.",
  };
}

export default async function EventPage({ params }: PageProps) {
  const { slug } = await params;
  const event = getEventBySlug(slug);
  if (!event || event.status === "draft") notFound();

  const bundle = publicEventBundle(event);
  const pub = bundle.event;
  const years = formatYears(pub.bornOn, pub.diedOn);
  const archived = pub.status === "archived";

  return (
    <main className={styles.page}>
      <div className="container">
        <header className={styles.header}>
          {pub.photoUrl ? (
            <img className={styles.photo} src={pub.photoUrl} alt={`Photograph of ${pub.deceasedName}`} />
          ) : null}
          <h1 className={styles.name}>{pub.deceasedName}</h1>
          {years ? <p className={styles.years}>{years}</p> : null}
          <p className={styles.home}>{pub.funeralHomeName}</p>
        </header>

        {pub.obituaryText.trim() ? (
          <section aria-label="Obituary">
            <Paragraphs text={pub.obituaryText} className={styles.obituaryPara} />
          </section>
        ) : null}

        {bundle.services.length > 0 ? (
          <section aria-label="Services">
            <hr className="divider" />
            <h2 className={styles.sectionTitle}>{"Services"}</h2>
            <div className={styles.serviceList}>
              {bundle.services.map((service) => (
                <ServiceCard key={service.id} service={service} />
              ))}
            </div>
          </section>
        ) : null}

        {bundle.updates.length > 0 ? (
          <section aria-label="Updates">
            <hr className="divider" />
            <h2 className={styles.sectionTitle}>{"Updates"}</h2>
            <UpdatesFeed updates={bundle.updates} />
          </section>
        ) : null}

        <section id="rsvp" aria-label="Reply">
          <hr className="divider" />
          {archived ? (
            <p className={styles.archivedNote}>
              {`This service has passed. For anything you need, please contact ${pub.funeralHomeName}.`}
            </p>
          ) : (
            <>
              <h2 className={styles.sectionTitle}>{"Reply"}</h2>
              <RsvpSection slug={pub.slug} funeralHomeName={pub.funeralHomeName} />
            </>
          )}
        </section>
      </div>
    </main>
  );
}
