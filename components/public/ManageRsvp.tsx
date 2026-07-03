"use client";

import Link from "next/link";
import { useState } from "react";
import { apiErrorMessage } from "./api";
import RsvpForm, { type RsvpValues } from "./RsvpForm";
import styles from "./ManageRsvp.module.css";

interface Props {
  token: string;
  slug: string;
  funeralHomeName: string;
  eventOpen: boolean;
  initial: RsvpValues;
}

export default function ManageRsvp({ token, slug, funeralHomeName, eventOpen, initial }: Props) {
  const [current, setCurrent] = useState(initial);
  const [confirming, setConfirming] = useState(false);
  const [removed, setRemoved] = useState(false);
  const [busy, setBusy] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete() {
    if (busy) return;
    setBusy(true);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/public/rsvps/${encodeURIComponent(token)}`, { method: "DELETE" });
      if (res.ok || res.status === 404) {
        try {
          window.localStorage.removeItem(`solace_rsvp:${slug}`);
        } catch {
          // Storage unavailable; nothing to clear.
        }
        setRemoved(true);
      } else {
        const data: unknown = await res.json().catch(() => null);
        setDeleteError(apiErrorMessage(data) ?? "Something went wrong. Please try again.");
      }
    } catch {
      setDeleteError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (removed) {
    return (
      <div className={`card ${styles.removedCard}`}>
        <p className={styles.removedLead} role="status">
          {"Your reply has been removed."}
        </p>
        <p className={styles.removedBody}>
          <Link href={`/e/${slug}`}>{"Back to the service page"}</Link>
        </p>
      </div>
    );
  }

  const summary =
    current.attending === "yes"
      ? current.guestCount > 0
        ? `You replied that you'll be there, with ${current.guestCount} ${
            current.guestCount === 1 ? "other person" : "other people"
          }.`
        : "You replied that you'll be there."
      : "You replied that you're unable to come.";

  return (
    <div>
      <p className={styles.summary}>{summary}</p>
      {eventOpen ? (
        <RsvpForm
          mode="manage"
          token={token}
          funeralHomeName={funeralHomeName}
          initial={current}
          onSaved={setCurrent}
        />
      ) : (
        <p className={styles.closedNote}>
          {`This service has passed. For anything you need, please contact ${funeralHomeName}.`}
        </p>
      )}
      <hr className="divider" />
      <section className={styles.removeSection} aria-label="Remove your reply">
        {deleteError ? (
          <p className={styles.deleteError} role="alert">
            {deleteError}
          </p>
        ) : null}
        {confirming ? (
          <div>
            <p className={styles.confirmText}>
              {"This will remove your reply. The family will no longer see it."}
            </p>
            <div className={styles.confirmRow}>
              <button type="button" className={`btn ${styles.dangerBtn}`} onClick={handleDelete} disabled={busy}>
                {busy ? "Removing…" : "Yes, remove my reply"}
              </button>
              <button
                type="button"
                className="btn btn-quiet"
                onClick={() => setConfirming(false)}
                disabled={busy}
              >
                {"Keep my reply"}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            className={`btn ${styles.removeBtn}`}
            onClick={() => {
              setConfirming(true);
              setDeleteError(null);
            }}
          >
            {"Remove my reply"}
          </button>
        )}
      </section>
    </div>
  );
}
