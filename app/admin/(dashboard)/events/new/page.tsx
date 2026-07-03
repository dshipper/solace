import type { Metadata } from "next";
import { requireStaff } from "@/lib/auth-server";
import EventForm from "@/components/admin/EventForm";
import { createEventAction } from "../actions";
import styles from "@/components/admin/admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "New event · Solace",
};

export default async function NewEventPage() {
  await requireStaff();
  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>New event</h1>
          <p className={styles.pageSub}>
            Once the event is saved you will get a family code to hand the family.
          </p>
        </div>
      </div>
      <EventForm action={createEventAction} submitLabel="Create event" />
    </>
  );
}
