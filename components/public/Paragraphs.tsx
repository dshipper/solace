/**
 * Renders foundation-stored plain text as escaped paragraphs, split on blank
 * lines. Single line breaks inside a paragraph are preserved via pre-line.
 * React escapes all text by construction — no HTML or markdown is interpreted.
 */
export default function Paragraphs({ text, className }: { text: string; className?: string }) {
  const paragraphs = text
    .replace(/\r\n/g, "\n")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
  return (
    <>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={className} style={{ whiteSpace: "pre-line" }}>
          {paragraph}
        </p>
      ))}
    </>
  );
}
