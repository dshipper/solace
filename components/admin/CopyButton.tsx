"use client";

import { useState } from "react";
import styles from "./admin.module.css";

export default function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false);
  function copy() {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })
      .catch(() => {
        // Clipboard access can be unavailable; the text is visible to select by hand.
      });
  }
  return (
    <button type="button" className={`btn ${styles.btnSm}`} onClick={copy}>
      {copied ? "Copied" : label}
    </button>
  );
}
