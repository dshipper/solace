import Link from "next/link";
import PublicFooter from "@/components/public/PublicFooter";
import { getFuneralHomeName } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function Home() {
  const funeralHome = getFuneralHomeName();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <main className="container" style={{ flex: "1 0 auto", paddingTop: "5rem", paddingBottom: "2rem" }}>
        <p
          className="muted small"
          style={{ fontFamily: "var(--sans)", letterSpacing: "0.08em", textTransform: "uppercase" }}
        >
          {funeralHome}
        </p>
        <h1 style={{ fontSize: "2.4rem" }}>Solace</h1>
        <p className="muted" style={{ maxWidth: "34rem" }}>
          Service details, invitations, and RSVPs, handled gently.
        </p>
        <hr className="divider" />
        <div style={{ display: "grid", gap: "1rem" }}>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem" }}>Received an invitation?</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Open the link in the message you were sent — it has the service details and a place to reply.
            </p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem" }}>Arranging a service with us?</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              Download the Solace app on your iPhone and enter the family code we gave you. From there you can
              invite people from your contacts and see who is coming.
            </p>
          </div>
          <div className="card" style={{ padding: "1.25rem" }}>
            <h3 style={{ fontSize: "1.1rem" }}>Staff</h3>
            <p className="muted" style={{ marginBottom: 0 }}>
              <Link href="/admin">Sign in to the dashboard</Link>.
            </p>
          </div>
        </div>
      </main>
      <PublicFooter funeralHomeName={funeralHome} />
    </div>
  );
}
