"use client";

import Link from "next/link";
import { useId, useRef, useState } from "react";
import { apiErrorMessage } from "./api";
import styles from "./RsvpForm.module.css";

export interface RsvpValues {
  name: string;
  email: string;
  phone: string;
  attending: "yes" | "no";
  guestCount: number;
  note: string;
  eventUpdatesOptIn: boolean;
  marketingOptIn: boolean;
}

type Props =
  | { mode: "create"; slug: string; funeralHomeName: string }
  | {
      mode: "manage";
      token: string;
      funeralHomeName: string;
      initial: RsvpValues;
      onSaved?: (values: RsvpValues) => void;
    };

export default function RsvpForm(props: Props) {
  const initial = props.mode === "manage" ? props.initial : null;
  const [name, setName] = useState(initial?.name ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [attending, setAttending] = useState<"yes" | "no" | null>(initial?.attending ?? null);
  const [guestCount, setGuestCount] = useState(initial?.guestCount ?? 0);
  const [note, setNote] = useState(initial?.note ?? "");
  const [eventUpdatesOptIn, setEventUpdatesOptIn] = useState(initial?.eventUpdatesOptIn ?? true);
  const [marketingOptIn, setMarketingOptIn] = useState(initial?.marketingOptIn ?? false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [result, setResult] = useState<{ manageToken: string; updated: boolean } | null>(null);
  const topRef = useRef<HTMLDivElement | null>(null);
  const guestLabelId = useId();

  function scrollToTop() {
    requestAnimationFrame(() => {
      topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }

  function showError(message: string) {
    setError(message);
    scrollToTop();
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setSaved(false);
    const trimmedName = name.trim();
    if (!trimmedName) {
      showError("Please tell us your name.");
      return;
    }
    if (!attending) {
      showError("Please choose whether you can come.");
      return;
    }
    setBusy(true);
    setError(null);
    const payload = {
      name: trimmedName,
      email: email.trim() || null,
      phone: phone.trim() || null,
      attending,
      guestCount: attending === "yes" ? guestCount : 0,
      note: note.trim() || null,
      eventUpdatesOptIn,
      marketingOptIn,
    };
    try {
      const url =
        props.mode === "create"
          ? `/api/public/events/${encodeURIComponent(props.slug)}/rsvps`
          : `/api/public/rsvps/${encodeURIComponent(props.token)}`;
      const res = await fetch(url, {
        method: props.mode === "create" ? "POST" : "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data: unknown = await res.json().catch(() => null);
      if (!res.ok) {
        showError(apiErrorMessage(data) ?? "Something went wrong. Please try again.");
        return;
      }
      if (props.mode === "create") {
        const body = data as { manageToken?: unknown; updated?: unknown };
        const manageToken = typeof body?.manageToken === "string" ? body.manageToken : null;
        if (!manageToken) {
          showError("Something went wrong. Please try again.");
          return;
        }
        try {
          window.localStorage.setItem(`solace_rsvp:${props.slug}`, manageToken);
        } catch {
          // Private browsing may block storage; the manage link below still works.
        }
        setResult({ manageToken, updated: body.updated === true });
        scrollToTop();
      } else {
        setSaved(true);
        props.onSaved?.({
          name: trimmedName,
          email: email.trim(),
          phone: phone.trim(),
          attending,
          guestCount: attending === "yes" ? guestCount : 0,
          note: note.trim(),
          eventUpdatesOptIn,
          marketingOptIn,
        });
        scrollToTop();
      }
    } catch {
      showError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (props.mode === "create" && result) {
    return (
      <div ref={topRef} className={`card ${styles.confirm}`}>
        <p className={styles.confirmLead} role="status">
          {result.updated
            ? "We've updated your earlier reply."
            : "Thank you. The family will know you're thinking of them."}
        </p>
        <p className={styles.confirmLink}>
          <Link href={`/rsvp/${result.manageToken}`}>{"Save this link to change your reply later"}</Link>
        </p>
        <p className={styles.confirmNote}>{"We'll also remember your reply on this device."}</p>
      </div>
    );
  }

  return (
    <div ref={topRef}>
      <form className={styles.form} onSubmit={handleSubmit} noValidate>
        {error ? (
          <p className={styles.formError} role="alert">
            {error}
          </p>
        ) : null}
        {props.mode === "manage" && saved ? (
          <p className={styles.savedNote} role="status">
            {"Your reply has been updated."}
          </p>
        ) : null}
        {props.mode === "create" ? (
          <p className={styles.intro}>{"Please let the family know whether you can come."}</p>
        ) : null}

        <label className="field">
          <span className="field-label">{"Your name"}</span>
          <input
            type="text"
            name="name"
            autoComplete="name"
            maxLength={120}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </label>

        <div className={styles.twoCol}>
          <label className="field">
            <span className="field-label">{"Email"}</span>
            <input
              type="email"
              name="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <span className="field-hint">{"Optional"}</span>
          </label>
          <label className="field">
            <span className="field-label">{"Phone"}</span>
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <span className="field-hint">{"Optional"}</span>
          </label>
        </div>

        <fieldset className={styles.fieldset}>
          <legend className="field-label">{"Will you be attending?"}</legend>
          <div className={styles.choices}>
            <label className={`${styles.choice} ${attending === "yes" ? styles.choiceSelected : ""}`}>
              <input
                className={styles.choiceInput}
                type="radio"
                name="attending"
                value="yes"
                checked={attending === "yes"}
                onChange={() => setAttending("yes")}
              />
              <span className={styles.choiceTitle}>{"I'll be there"}</span>
            </label>
            <label className={`${styles.choice} ${attending === "no" ? styles.choiceSelected : ""}`}>
              <input
                className={styles.choiceInput}
                type="radio"
                name="attending"
                value="no"
                checked={attending === "no"}
                onChange={() => setAttending("no")}
              />
              <span className={styles.choiceTitle}>{"I'm unable to come"}</span>
            </label>
          </div>
        </fieldset>

        {attending === "yes" ? (
          <div className={styles.guestField}>
            <span className="field-label" id={guestLabelId}>
              {"People coming with you"}
            </span>
            <div className={styles.stepper} role="group" aria-labelledby={guestLabelId}>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => setGuestCount((n) => Math.max(0, n - 1))}
                disabled={busy || guestCount <= 0}
                aria-label="Fewer people"
              >
                {"−"}
              </button>
              <span className={styles.stepValue} aria-live="polite">
                {guestCount}
              </span>
              <button
                type="button"
                className={styles.stepBtn}
                onClick={() => setGuestCount((n) => Math.min(10, n + 1))}
                disabled={busy || guestCount >= 10}
                aria-label="More people"
              >
                {"+"}
              </button>
            </div>
            <span className="field-hint">{"Not counting yourself."}</span>
          </div>
        ) : null}

        <label className="field">
          <span className="field-label">{"A memory or message for the family, if you'd like"}</span>
          <textarea name="note" rows={4} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
        </label>

        <div className={styles.consents}>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={eventUpdatesOptIn}
              onChange={(e) => setEventUpdatesOptIn(e.target.checked)}
            />
            <span>{"Keep me posted about this service (schedule changes, livestream link)."}</span>
          </label>
          <label className="checkbox-row">
            <input
              type="checkbox"
              checked={marketingOptIn}
              onChange={(e) => setMarketingOptIn(e.target.checked)}
            />
            <span>
              {`I'm 16 or older and would like occasional emails from ${props.funeralHomeName} — grief resources and news about future services.`}
            </span>
          </label>
        </div>

        <p className={styles.disclosure}>
          {`Your reply is shared with the family and ${props.funeralHomeName}.`}
        </p>

        <button type="submit" className={`btn btn-primary ${styles.submit}`} disabled={busy}>
          {busy
            ? props.mode === "create"
              ? "Sending…"
              : "Saving…"
            : props.mode === "create"
              ? "Send reply"
              : "Save changes"}
        </button>
      </form>
    </div>
  );
}
