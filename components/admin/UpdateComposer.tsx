"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "./form-state";
import styles from "./admin.module.css";

export default function UpdateComposer({
  action,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={formAction} className={styles.card} style={{ marginBottom: "1rem" }}>
      <label className="field">
        <span className="field-label">Title</span>
        <input type="text" name="title" required maxLength={140} />
      </label>
      <label className="field">
        <span className="field-label">Message (optional)</span>
        <textarea name="body" rows={4} maxLength={4000} />
      </label>
      {state.error ? (
        <p className={`error-text ${styles.formStatus}`} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className={`${styles.okText} ${styles.formStatus}`}>{state.ok}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: "0.5rem" }}>
        {isPending ? "Posting" : "Post update"}
      </button>
    </form>
  );
}
