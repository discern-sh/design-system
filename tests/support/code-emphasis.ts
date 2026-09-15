/**
 * Emphasis spans subdivide source text for presentation only.
 *
 * Unwrapping them must restore the original text exactly, so tests that
 * assert on rendered source can state that invariant directly instead of
 * accommodating the markup. Runs never nest, so one pass is sufficient.
 */
export function unwrapEmphasisSpans(html: string): string {
  return html.replaceAll(
    /<span data-discern-emphasis="[^"]*"[^>]*>([^<]*)<\/span>/g,
    "$1",
  );
}
