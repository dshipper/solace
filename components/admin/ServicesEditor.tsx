"use client";

import { useRef, useState } from "react";
import { SERVICE_KINDS } from "@/lib/types";
import { KIND_LABELS } from "@/lib/format";
import styles from "./admin.module.css";

export interface ServiceDraft {
  kind: string;
  title: string;
  startsAt: string;
  endsAt: string;
  venueName: string;
  address: string;
  notes: string;
  livestreamUrl: string;
}

interface Row extends ServiceDraft {
  key: string;
}

const EMPTY: ServiceDraft = {
  kind: "visitation",
  title: "",
  startsAt: "",
  endsAt: "",
  venueName: "",
  address: "",
  notes: "",
  livestreamUrl: "",
};

/**
 * Dynamic list of service rows. The rows are serialized into a hidden JSON
 * input so the surrounding server-action form can save them in one submit.
 * Times are naive local wall-clock strings (A1) — the raw datetime-local
 * value is stored, never converted.
 */
export default function ServicesEditor({ initial = [] }: { initial?: ServiceDraft[] }) {
  const [rows, setRows] = useState<Row[]>(() => initial.map((s, i) => ({ ...s, key: `svc-${i}` })));
  const counter = useRef(initial.length);

  function addRow() {
    counter.current += 1;
    const key = `svc-new-${counter.current}`;
    setRows((prev) => [...prev, { ...EMPTY, key }]);
  }

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.key !== key));
  }

  function move(index: number, delta: -1 | 1) {
    setRows((prev) => {
      const target = index + delta;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      const [row] = next.splice(index, 1);
      next.splice(target, 0, row);
      return next;
    });
  }

  function setField(key: string, field: keyof ServiceDraft, value: string) {
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));
  }

  const json = JSON.stringify(
    rows.map(({ key: _key, ...rest }) => rest),
  );

  return (
    <div>
      <input type="hidden" name="servicesJson" value={json} />
      {rows.length === 0 ? (
        <p className={styles.hint} style={{ marginBottom: "0.6rem" }}>
          No services yet. Add the visitation, funeral, or any other gathering the family is planning.
        </p>
      ) : null}
      {rows.map((row, index) => (
        <div key={row.key} className={styles.serviceRow}>
          <div className={styles.serviceRowHead}>
            <span className={styles.serviceRowTitle}>Service {index + 1}</span>
            <span className={styles.actionsRow}>
              <button
                type="button"
                className={`btn ${styles.btnSm}`}
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label={`Move service ${index + 1} up`}
              >
                Up
              </button>
              <button
                type="button"
                className={`btn ${styles.btnSm}`}
                onClick={() => move(index, 1)}
                disabled={index === rows.length - 1}
                aria-label={`Move service ${index + 1} down`}
              >
                Down
              </button>
              <button
                type="button"
                className={`btn ${styles.btnSm} ${styles.btnDangerText}`}
                onClick={() => removeRow(row.key)}
              >
                Remove
              </button>
            </span>
          </div>
          <div className={styles.serviceGrid}>
            <label className={styles.serviceField}>
              <span className={styles.serviceFieldLabel}>Type</span>
              <select value={row.kind} onChange={(e) => setField(row.key, "kind", e.target.value)}>
                {SERVICE_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {KIND_LABELS[kind]}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.serviceField}>
              <span className={styles.serviceFieldLabel}>Title (optional)</span>
              <input
                type="text"
                value={row.title}
                maxLength={200}
                onChange={(e) => setField(row.key, "title", e.target.value)}
              />
            </label>
            <label className={styles.serviceField}>
              <span className={styles.serviceFieldLabel}>Starts</span>
              <input
                type="datetime-local"
                value={row.startsAt}
                onChange={(e) => setField(row.key, "startsAt", e.target.value)}
              />
            </label>
            <label className={styles.serviceField}>
              <span className={styles.serviceFieldLabel}>Ends (optional)</span>
              <input
                type="datetime-local"
                value={row.endsAt}
                onChange={(e) => setField(row.key, "endsAt", e.target.value)}
              />
            </label>
            <label className={styles.serviceField}>
              <span className={styles.serviceFieldLabel}>Venue</span>
              <input
                type="text"
                value={row.venueName}
                maxLength={200}
                onChange={(e) => setField(row.key, "venueName", e.target.value)}
              />
            </label>
            <label className={styles.serviceField}>
              <span className={styles.serviceFieldLabel}>Address</span>
              <input
                type="text"
                value={row.address}
                maxLength={300}
                onChange={(e) => setField(row.key, "address", e.target.value)}
              />
            </label>
            <label className={`${styles.serviceField} ${styles.serviceFieldWide}`}>
              <span className={styles.serviceFieldLabel}>Notes (optional)</span>
              <textarea
                rows={2}
                value={row.notes}
                maxLength={1000}
                onChange={(e) => setField(row.key, "notes", e.target.value)}
              />
            </label>
            <label className={`${styles.serviceField} ${styles.serviceFieldWide}`}>
              <span className={styles.serviceFieldLabel}>Livestream link (optional)</span>
              <input
                type="text"
                inputMode="url"
                placeholder="https://"
                value={row.livestreamUrl}
                maxLength={500}
                onChange={(e) => setField(row.key, "livestreamUrl", e.target.value)}
              />
            </label>
          </div>
        </div>
      ))}
      <button type="button" className={`btn ${styles.btnSm}`} onClick={addRow}>
        Add a service
      </button>
    </div>
  );
}
