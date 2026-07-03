import Link from "next/link";
import { requireStaff } from "@/lib/auth-server";
import { getFuneralHomeName } from "@/lib/settings";
import { logoutAction } from "@/app/admin/actions";
import AdminNav from "@/components/admin/AdminNav";
import styles from "@/components/admin/admin.module.css";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const staff = await requireStaff();
  const funeralHomeName = getFuneralHomeName();
  return (
    <div className={styles.shell}>
      <header className={styles.topbar}>
        <Link href="/admin" className={styles.wordmark}>
          Solace <span className={styles.wordmarkHome}>· {funeralHomeName}</span>
        </Link>
        <AdminNav />
        <div className={styles.topbarRight}>
          <span className={styles.staffName}>{staff.name}</span>
          <form action={logoutAction}>
            <button type="submit" className={`btn ${styles.btnSm}`}>
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}
