"use client";

import { useActionState, useState } from "react";
import type { FormState } from "./form-state";
import styles from "./admin.module.css";

/**
 * Typed-confirmation deletion. The button stays disabled until the staff
 * member types the family name; the server action verifies it again.
 */
export default function DeleteEventForm({
  action,
  confirmWord,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  confirmWord: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const [value, setValue] = useState("");
  const ready = value.trim().toLowerCase() === confirmWord.toLowerCase();

  return (
    <form action={formAction}>
      <p className={styles.hint} style={{ marginBottom: "0.6rem" }}>
        This permanently removes the event, its services, organizers, replies, and updates. There is no undo. Type{" "}
        <strong>{confirmWord}</strong> to confirm.
      </p>
      <input
        type="text"
        name="confirmName"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        autoComplete="off"
        aria-label={`Type ${confirmWord} to confirm deletion`}
        style={{ maxWidth: "18rem", display: "block", marginBottom: "0.6rem" }}
      />
      {state.error ? (
        <p className={`error-text ${styles.formStatus}`} role="alert" style={{ marginBottom: "0.6rem" }}>
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        className={`btn ${styles.btnDangerOutline}`}
        disabled={!ready || isPending}
      >
        {isPending ? "Deleting" : "Delete this event and all its data"}
      </button>
    </form>
  );
}
