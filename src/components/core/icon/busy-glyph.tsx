/** Decorative pending artwork; its Icon wrapper owns sizing and motion. */
export function BusyGlyph() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="100%"
      height="100%"
      fill="none"
      stroke="currentColor"
      focusable="false"
    >
      <circle cx="12" cy="12" r="9" strokeWidth="2.5" strokeOpacity="0.25" />
      <path d="M12 3a9 9 0 0 1 9 9" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}
