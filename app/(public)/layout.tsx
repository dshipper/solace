import PublicFooter from "@/components/public/PublicFooter";
import { getFuneralHomeName } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  const funeralHomeName = getFuneralHomeName();
  return (
    <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column" }}>
      <div style={{ flex: "1 0 auto" }}>{children}</div>
      <PublicFooter funeralHomeName={funeralHomeName} />
    </div>
  );
}
