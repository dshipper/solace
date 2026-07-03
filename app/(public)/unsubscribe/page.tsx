import type { Metadata } from "next";
import Ornament from "@/components/public/Ornament";
import UnsubscribeForm from "@/components/public/UnsubscribeForm";
import { getFuneralHomeName } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  const funeralHome = getFuneralHomeName();
  return (
    <main className="container" style={{ maxWidth: "30rem", paddingTop: "4.5rem", paddingBottom: "3rem" }}>
      <div style={{ textAlign: "center" }} className="rise">
        <span className="eyebrow">{funeralHome}</span>
        <h1 style={{ fontSize: "2rem", fontWeight: 500, margin: "0.75rem 0 0.5rem" }}>{"Email preferences"}</h1>
        <p className="muted" style={{ fontStyle: "italic", marginBottom: 0 }}>
          {"If you would rather not receive email from us, enter your address below and we will remove it."}
        </p>
        <Ornament />
      </div>
      <div className="rise-2">
        <UnsubscribeForm />
      </div>
    </main>
  );
}
