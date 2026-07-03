"use client";

import { useRef, useState } from "react";
import styles from "./admin.module.css";

/**
 * Uploads the photo to /api/admin/photo as soon as it is chosen, shows a
 * preview, and keeps the stored path in a hidden input so the surrounding
 * server-action form can save it with the event.
 */
export default function PhotoUpload({
  initialPath = "",
  initialUrl = "",
}: {
  initialPath?: string;
  initialUrl?: string;
}) {
  const [photoPath, setPhotoPath] = useState(initialPath);
  const [photoUrl, setPhotoUrl] = useState(initialUrl);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      body.append("photo", file);
      const res = await fetch("/api/admin/photo", { method: "POST", body });
      const data = (await res.json()) as {
        photoPath?: string;
        photoUrl?: string;
        error?: { message?: string };
      };
      if (!res.ok || !data.photoPath) {
        setError(data.error?.message ?? "The photo could not be uploaded.");
      } else {
        setPhotoPath(data.photoPath);
        setPhotoUrl(data.photoUrl ?? "");
      }
    } catch {
      setError("The photo could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  function removePhoto() {
    setPhotoPath("");
    setPhotoUrl("");
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className={styles.photoBox}>
      <input type="hidden" name="photoPath" value={photoPath} />
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Photo preview" className={styles.photoPreview} />
      ) : null}
      <div className={styles.photoControls}>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={onChange} disabled={busy} />
        <span className={styles.hint}>JPEG, PNG, or WebP, up to 8 MB.</span>
        {busy ? <span className={styles.hint}>Uploading</span> : null}
        {error ? <span className={`error-text ${styles.hint}`}>{error}</span> : null}
        {photoPath ? (
          <button
            type="button"
            className={`btn ${styles.btnSm} ${styles.btnDangerText}`}
            onClick={removePhoto}
            style={{ marginTop: "0.4rem" }}
          >
            Remove photo
          </button>
        ) : null}
      </div>
    </div>
  );
}
