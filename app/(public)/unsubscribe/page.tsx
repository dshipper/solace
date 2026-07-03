import type { Metadata } from "next";
import UnsubscribeForm from "@/components/public/UnsubscribeForm";

export const metadata: Metadata = {
  title: "Email preferences",
  robots: { index: false, follow: false },
};

export default function UnsubscribePage() {
  return (
    <main className="container" style={{ paddingTop: "4rem", paddingBottom: "3rem" }}>
      <h1 style={{ fontSize: "1.8rem" }}>{"Email preferences"}</h1>
      <p className="muted" style={{ maxWidth: "30rem" }}>
        {"If you would rather not receive email from us, enter your address below and we will remove it."}
      </p>
      <UnsubscribeForm />
    </main>
  );
}
