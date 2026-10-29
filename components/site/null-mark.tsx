export function NullMark({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 40 40"
      aria-hidden="true"
      fill="none"
    >
      <circle cx="20" cy="20" r="12.5" stroke="currentColor" strokeWidth="1.2" />
      <path d="M9.5 30.5 30.5 9.5" stroke="var(--acid)" strokeWidth="2.4" />
      <path d="M20 3.5v4M20 32.5v4M3.5 20h4M32.5 20h4" stroke="currentColor" strokeWidth="1" opacity=".6" />
      <rect x="29.5" y="5.5" width="5" height="5" fill="var(--acid)" />
    </svg>
  );
}
