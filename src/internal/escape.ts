/**
 * Deterministic escaping for the XML and Markdown boundaries every kind
 * family emits through.
 *
 * @module
 */

/** Escape text for safe embedding in XML element and attribute content. */
export function escapeXml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;").replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

/** Escape one alternative-text run for a CommonMark image label. */
export function escapeMarkdownAlternative(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll("[", "\\[")
    .replaceAll("]", "\\]");
}

/** Escape one title run for a double-quoted CommonMark image title. */
export function escapeMarkdownTitle(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}
