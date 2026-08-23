/** Shared non-colour connector treatments for enhanced Diagram CLI frames. */

import { triangleGlyph, TRIANGLES } from "./triangles.ts";

/** Closed connector treatment shared by enhanced Diagram kinds. */
export type DiagramTerminalLineTreatment =
  | "primary"
  | "secondary"
  | "return";

/** Render one right-pointing connector whose rail preserves its treatment. */
export function diagramTerminalConnectorGlyph(
  treatment: DiagramTerminalLineTreatment,
  unicode: boolean,
): string {
  const head = triangleGlyph(
    treatment === "secondary"
      ? TRIANGLES.unfilled.right
      : TRIANGLES.filledSmall.right,
    unicode,
  );
  if (treatment === "primary") return `${unicode ? "──" : "--"}${head}`;
  if (treatment === "secondary") return `${unicode ? "┄┄" : "-."}${head}`;
  return `${unicode ? "┈┈" : "~~"}${head}`;
}
