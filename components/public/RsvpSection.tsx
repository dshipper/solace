"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RsvpForm from "./RsvpForm";
import styles from "./RsvpForm.module.css";

interface Props {
  slug: string;
  funeralHomeName: string;
}

/**
 * A7: after someone replies we keep their manage token in localStorage under
 * `solace_rsvp:{slug}`. When they come back, the form hides behind a card
 * linking to their manage page. A rotated or deleted token (404) clears the
 * key and shows the blank form again.
 */
export default function RsvpSection({ slug, funeralHomeName }: Props) {
  const [phase, setPhase] = useState<"checking" | "form" | "replied">("checking");
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(`solace_rsvp:${slug}`);
    } catch {
      stored = null;
    }
    if (!stored) {
      setPhase("form");
      return;
    }
    const candidate = stored;
    fetch(`/api/public/rsvps/${encodeURIComponent(candidate)}`)
      .then((res) => {
        if (cancelled) return;
        if (res.ok) {
          setToken(candidate);
          setPhase("replied");
        } else {
          if (res.status === 404) {
            try {
              window.localStorage.removeItem(`solace_rsvp:${slug}`);
            } catch {
              // Storage unavailable; nothing to clear.
            }
          }
          setPhase("form");
        }
      })
      .catch(() => {
        if (!cancelled) setPhase("form");
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  if (phase === "checking") {
    return <div className={styles.checking} aria-hidden="true" />;
  }

  if (phase === "replied" && token) {
    return (
      <div className={`card ${styles.repliedCard}`}>
        <p className={styles.repliedLink}>
          <Link href={`/rsvp/${token}`}>{"You've replied — change or remove your reply"}</Link>
        </p>
        <button type="button" className={`btn btn-quiet ${styles.repliedAlt}`} onClick={() => setPhase("form")}>
          {"Respond as someone else"}
        </button>
      </div>
    );
  }

  return <RsvpForm mode="create" slug={slug} funeralHomeName={funeralHomeName} />;
}
