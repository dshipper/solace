import Link from "next/link";
import Ornament from "@/components/public/Ornament";
import PublicFooter from "@/components/public/PublicFooter";
import { getFuneralHomeName } from "@/lib/settings";
import styles from "./home.module.css";

export const dynamic = "force-dynamic";

export default function Home() {
  const funeralHome = getFuneralHomeName();
  return (
    <div className={styles.wrap}>
      <main className={styles.hero}>
        <span className="eyebrow rise">{funeralHome}</span>
        <h1 className={`${styles.title} rise`}>{"Solace"}</h1>
        <p className={`${styles.tag} rise-2`}>{"Service details, invitations, and replies, handled gently."}</p>
        <Ornament className={`${styles.heroOrnament} rise-2`} />
        <div className={`${styles.paths} rise-3`}>
          <div className={styles.path}>
            <p className={styles.pathLabel}>{"If you received an invitation"}</p>
            <p className={styles.pathBody}>
              {"Open the link in the message you were sent — it has the service details and a place to reply."}
            </p>
          </div>
          <div className={styles.path}>
            <p className={styles.pathLabel}>{"If you're arranging a service with us"}</p>
            <p className={styles.pathBody}>
              {"Download the Solace app on your iPhone and enter the family code we gave you. You can invite people from your contacts and see who is coming."}
            </p>
          </div>
          <div className={styles.path}>
            <p className={styles.pathLabel}>{"Funeral home staff"}</p>
            <p className={styles.pathBody}>
              <Link href="/admin">{"Sign in to the dashboard"}</Link>
              {"."}
            </p>
          </div>
        </div>
      </main>
      <PublicFooter funeralHomeName={funeralHome} />
    </div>
  );
}
