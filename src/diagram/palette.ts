/** Literal Token resolution for portable diagram assets. */

import {
  authoredTokenValues,
  resolveTokenLiteral,
  type TokenPaletteVariant,
} from "../internal/token-literals.ts";
import {
  DIAGRAM_PAINT_TOKEN_NAMES,
  type DiagramPaintTokenName,
} from "./roles.ts";
import type { DiagramFontRole } from "./font-metrics.ts";
import type { DiagramPaintRole } from "./scene.ts";

/** Explicit package palette used by a standalone SVG asset. */
export type DiagramPaletteVariant = TokenPaletteVariant;

function resolveValue(
  name: string,
  values: ReadonlyMap<string, string>,
): string {
  return resolveTokenLiteral(name, values, "diagram");
}

/** Resolve every semantic diagram paint role to one self-contained literal. */
export function resolveDiagramPalette(
  variant: DiagramPaletteVariant,
): Readonly<Record<DiagramPaintRole, string>> {
  const values = authoredTokenValues(variant);
  return Object.freeze(Object.fromEntries(
    Object.entries(DIAGRAM_PAINT_TOKEN_NAMES).map(([role, tokenName]) => [
      role,
      resolveValue(tokenName as DiagramPaintTokenName, values),
    ]),
  ) as Record<DiagramPaintRole, string>);
}

/** Resolve the authored interface or annotation font stack without a web root. */
export function resolveDiagramFontStack(role: DiagramFontRole): string {
  const name = role === "mono" ? "--discern-font-mono" : "--discern-font-ui";
  return resolveValue(name, authoredTokenValues("light"));
}
