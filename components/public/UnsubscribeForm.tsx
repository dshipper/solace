"use client";

import { useState } from "react";
import { apiErrorMessage } from "./api";
import styles from "./UnsubscribeForm.module.css";

export default function UnsubscribeForm() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const trimmed = email.trim();
    if (!trimmed) {
      setError("Please enter your email address.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/public/unsubscribe", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      if (res.ok) {
        setDone(true);
      } else {
        const data: unknown = await res.json().catch(() => null);
        setError(apiErrorMessage(data) ?? "Something went wrong. Please try again.");
      }
    } catch {
      setError("We couldn't reach the server. Please check your connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <p className={styles.done} role="status">
        {"If that address was on our list, it has been removed."}
      </p>
    );
  }

  return (
    <form className={styles.form} onSubmit={handleSubmit} noValidate>
      {error ? (
        <p className={styles.error} role="alert">
          {error}
        </p>
      ) : null}
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
      </label>
      <button type="submit" className="btn btn-primary" disabled={busy}>
        {busy ? "Removing…" : "Remove my email"}
      </button>
    </form>
  );
}
