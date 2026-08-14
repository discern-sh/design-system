/** Internal semantic phases for verdict-like vertical triangle markers. */

/** Resolve vertical direction from semantic completion rather than item order. */
export function verticalTriangleStatusPhase(
  status: "complete" | "incomplete",
): number {
  return status === "complete" ? 2 : 1;
}
