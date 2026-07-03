"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import styles from "./admin.module.css";

function SubmitButton({ label, danger }: { label: string; danger: boolean }) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={`btn ${styles.btnSm} ${danger ? styles.btnDangerFill : "btn-primary"}`}
      disabled={pending}
    >
      {pending ? "Working" : label}
    </button>
  );
}

/**
 * Two-step confirmation for destructive row actions. Render inside a <form>
 * whose action performs the deletion; the first click only arms the button.
 */
export default function ConfirmButton({
  label,
  confirmLabel,
  note,
  variant = "danger",
}: {
  label: string;
  confirmLabel?: string;
  note?: string;
  variant?: "danger" | "default";
}) {
  const [armed, setArmed] = useState(false);
  const danger = variant === "danger";
  if (!armed) {
    return (
      <button
        type="button"
        className={`btn ${styles.btnSm} ${danger ? styles.btnDangerText : ""}`}
        onClick={() => setArmed(true)}
      >
        {label}
      </button>
    );
  }
  return (
    <span className={styles.confirmGroup}>
      {note ? <span className={styles.confirmNote}>{note}</span> : null}
      <SubmitButton label={confirmLabel ?? label} danger={danger} />
      <button type="button" className={`btn btn-quiet ${styles.btnSm}`} onClick={() => setArmed(false)}>
        Cancel
      </button>
    </span>
  );
}
