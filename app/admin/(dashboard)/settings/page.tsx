import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-server";
import { getFuneralHomeName } from "@/lib/settings";
import { listStaffUsers } from "@/lib/staff";
import { formatDate } from "@/lib/format";
import { AddStaffForm, FuneralHomeNameForm } from "@/components/admin/SettingsForms";
import styles from "@/components/admin/admin.module.css";
import { addStaffUserAction, saveFuneralHomeNameAction } from "./actions";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settings · Solace",
};

export default async function SettingsPage() {
  await requireStaff();
  const funeralHomeName = getFuneralHomeName();
  const staffUsers = listStaffUsers();

  return (
    <>
      <div className={styles.pageHeader}>
        <h1 className={styles.pageTitle}>Settings</h1>
      </div>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Funeral home</h2>
        <div className={styles.formCard}>
          <FuneralHomeNameForm action={saveFuneralHomeNameAction} initialName={funeralHomeName} />
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Staff</h2>
        {staffUsers.length === 0 ? null : (
          <div className={styles.tableWrap} style={{ marginBottom: "1.25rem" }}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Added</th>
                </tr>
              </thead>
              <tbody>
                {staffUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{formatDate(u.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <div className={styles.formCard}>
          <h3 style={{ fontFamily: "var(--sans)", fontSize: "1rem", marginBottom: "0.9rem" }}>Add staff user</h3>
          <AddStaffForm action={addStaffUserAction} />
        </div>
      </section>
    </>
  );
}
