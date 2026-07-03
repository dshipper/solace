import { formatDate } from "@/lib/format";
import type { EventUpdate } from "@/lib/types";
import Paragraphs from "./Paragraphs";
import styles from "./EventPage.module.css";

export default function UpdatesFeed({ updates }: { updates: EventUpdate[] }) {
  return (
    <div className={styles.updateList}>
      {updates.map((update) => (
        <article key={update.id} className={styles.updateItem}>
          <h3 className={styles.updateTitle}>{update.title}</h3>
          <p className={styles.updateMeta}>{`${update.authorName} · ${formatDate(update.createdAt)}`}</p>
          {update.bodyText.trim() ? <Paragraphs text={update.bodyText} className={styles.updateBody} /> : null}
        </article>
      ))}
    </div>
  );
}
