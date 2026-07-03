/** Hairlines flanking a small leaf — the recurring print ornament. */
export default function Ornament({ className = "" }: { className?: string }) {
  return (
    <div className={`ornament ${className}`.trim()} aria-hidden="true">
      <svg width="96" height="14" viewBox="0 0 96 14" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M2 7h36" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
        <path d="M58 7h36" stroke="currentColor" strokeWidth="1" strokeLinecap="round" opacity="0.45" />
        <path
          d="M48 2.4c2.6 1.9 3.9 3.3 3.9 4.6 0 1.3-1.3 2.7-3.9 4.6-2.6-1.9-3.9-3.3-3.9-4.6 0-1.3 1.3-2.7 3.9-4.6Z"
          fill="currentColor"
          opacity="0.55"
        />
      </svg>
    </div>
  );
}
