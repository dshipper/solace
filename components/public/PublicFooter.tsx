import Link from "next/link";
import styles from "./PublicFooter.module.css";

export default function PublicFooter({ funeralHomeName }: { funeralHomeName: string }) {
  return (
    <footer className={styles.footer}>
      <div className={`container ${styles.inner}`}>
        <span className={styles.name}>{funeralHomeName}</span>
        <Link className={styles.link} href="/unsubscribe">
          {"Email preferences"}
        </Link>
      </div>
    </footer>
  );
}
