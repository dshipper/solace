"use client";

import { useActionState } from "react";
import { loginAction } from "@/app/admin/actions";
import styles from "./admin.module.css";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(loginAction, {});
  return (
    <form action={formAction}>
      <label className="field">
        <span className="field-label">Email</span>
        <input type="email" name="email" required autoComplete="username" autoFocus />
      </label>
      <label className="field">
        <span className="field-label">Password</span>
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      {state.error ? (
        <p className={`error-text ${styles.formStatus}`} role="alert">
          {state.error}
        </p>
      ) : null}
      <button type="submit" className="btn btn-primary" disabled={isPending} style={{ width: "100%", marginTop: "0.75rem" }}>
        {isPending ? "Signing in" : "Sign in"}
      </button>
    </form>
  );
}
