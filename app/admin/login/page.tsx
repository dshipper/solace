import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getStaffOrNull } from "@/lib/auth-server";
import LoginForm from "@/components/admin/LoginForm";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Staff sign in · Solace",
};

export default async function LoginPage() {
  const staff = await getStaffOrNull();
  if (staff) redirect("/admin");
  return (
    <main className={styles.loginWrap}>
      <div className={`card ${styles.loginCard}`}>
        <p className={styles.loginWordmark}>Solace</p>
        <p className={styles.loginSub}>Staff sign in</p>
        <LoginForm />
      </div>
    </main>
  );
}
