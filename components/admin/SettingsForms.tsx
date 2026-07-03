"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "./form-state";
import styles from "./admin.module.css";

export function FuneralHomeNameForm({
  action,
  initialName,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initialName: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  return (
    <form action={formAction}>
      <label className="field">
        <span className="field-label">Funeral home name</span>
        <input type="text" name="funeralHomeName" required maxLength={200} defaultValue={initialName} />
        <span className={styles.hint}>
          Shown on public pages, in the app, and in the consent wording people agree to.
        </span>
      </label>
      {state.error ? (
        <p className={`error-text ${styles.formStatus}`} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className={`${styles.okText} ${styles.formStatus}`}>{state.ok}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: "0.5rem" }}>
        {isPending ? "Saving" : "Save"}
      </button>
    </form>
  );
}

export function AddStaffForm({
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
    <form ref={formRef} action={formAction}>
      <label className="field">
        <span className="field-label">Name</span>
        <input type="text" name="name" required maxLength={120} autoComplete="off" />
      </label>
      <label className="field">
        <span className="field-label">Email</span>
        <input type="email" name="email" required autoComplete="off" />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <input type="password" name="password" required minLength={8} autoComplete="new-password" />
        <span className={styles.hint}>At least 8 characters.</span>
      </label>
      {state.error ? (
        <p className={`error-text ${styles.formStatus}`} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className={`${styles.okText} ${styles.formStatus}`}>{state.ok}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: "0.5rem" }}>
        {isPending ? "Adding" : "Add staff user"}
      </button>
    </form>
  );
}
