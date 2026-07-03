"use client";

import { useActionState } from "react";
import PhotoUpload from "./PhotoUpload";
import ServicesEditor, { type ServiceDraft } from "./ServicesEditor";
import type { FormState } from "./form-state";
import styles from "./admin.module.css";

export interface EventFormInitial {
  deceasedName: string;
  bornOn: string;
  diedOn: string;
  obituaryText: string;
  status: string;
  photoPath: string;
  photoUrl: string;
  services: ServiceDraft[];
}

/**
 * Shared create/edit form. `action` is a server action shaped for
 * useActionState; the create action redirects on success, the edit action
 * returns { ok } so the form can show a quiet confirmation.
 */
export default function EventForm({
  action,
  initial,
  showStatus = false,
  submitLabel,
}: {
  action: (prevState: FormState, formData: FormData) => Promise<FormState>;
  initial?: EventFormInitial;
  showStatus?: boolean;
  submitLabel: string;
}) {
  const [state, formAction, isPending] = useActionState(action, {});
  return (
    <form action={formAction} className={styles.formCard}>
      <label className="field">
        <span className="field-label">Full name of the deceased</span>
        <input type="text" name="deceasedName" required maxLength={200} defaultValue={initial?.deceasedName ?? ""} />
      </label>
      <div className={styles.formRow2}>
        <label className="field">
          <span className="field-label">Born</span>
          <input type="date" name="bornOn" defaultValue={initial?.bornOn ?? ""} />
        </label>
        <label className="field">
          <span className="field-label">Died</span>
          <input type="date" name="diedOn" defaultValue={initial?.diedOn ?? ""} />
        </label>
      </div>
      <div className="field">
        <span className="field-label">Photo</span>
        <PhotoUpload initialPath={initial?.photoPath ?? ""} initialUrl={initial?.photoUrl ?? ""} />
      </div>
      <label className="field">
        <span className="field-label">Obituary</span>
        <textarea name="obituaryText" rows={14} maxLength={20000} defaultValue={initial?.obituaryText ?? ""} />
        <span className={styles.hint}>Plain text. Leave a blank line between paragraphs.</span>
      </label>
      <div className="field">
        <span className="field-label">Services</span>
        <ServicesEditor initial={initial?.services ?? []} />
      </div>
      {showStatus ? (
        <label className="field">
          <span className="field-label">Status</span>
          <select name="status" defaultValue={initial?.status ?? "published"}>
            <option value="draft">Draft</option>
            <option value="published">Published</option>
            <option value="archived">Archived</option>
          </select>
          <span className={styles.hint}>
            Draft: visible to staff only. Published: the public page is live and accepting replies. Archived: the
            obituary stays up, replies close, and the family code stops working.
          </span>
        </label>
      ) : null}
      <label className="checkbox-row">
        <input type="checkbox" name="publicationAuthorized" required defaultChecked={Boolean(initial)} />
        <span>The family has authorized publishing this obituary and photo</span>
      </label>
      {state.error ? (
        <p className={`error-text ${styles.formStatus}`} role="alert">
          {state.error}
        </p>
      ) : null}
      {state.ok ? <p className={`${styles.okText} ${styles.formStatus}`}>{state.ok}</p> : null}
      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ marginTop: "0.75rem" }}>
        {isPending ? "Saving" : submitLabel}
      </button>
    </form>
  );
}
