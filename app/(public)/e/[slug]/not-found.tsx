export default function NotFound() {
  return (
    <main className="container" style={{ paddingTop: "6rem", paddingBottom: "6rem", textAlign: "center" }}>
      <h1 style={{ fontSize: "1.5rem" }}>{"This page isn't available."}</h1>
      <p className="muted" style={{ maxWidth: "26rem", margin: "0 auto" }}>
        {"If someone sent you this link, it may not have come through completely. Please check with them and try again."}
      </p>
    </main>
  );
}
