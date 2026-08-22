/** Literal Token resolution for portable diagram assets. */

import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../tokens/tokens.ts";
import {
  DIAGRAM_PAINT_TOKEN_NAMES,
  type DiagramPaintTokenName,
} from "./roles.ts";
import type { DiagramFontRole } from "./font-metrics.ts";
import type { DiagramPaintRole } from "./scene.ts";

/** Explicit package palette used by a standalone SVG asset. */
export type DiagramPaletteVariant = "light" | "dark";

function authoredValues(
  variant: DiagramPaletteVariant,
): ReadonlyMap<string, string> {
  return new Map([
    ...baseTokens.map((token) => [token.name, token.value] as const),
    ...discernThemeTokens.map((token) => [token.name, token.value] as const),
    ...themeTokens.map((token) => [token.name, token[variant]] as const),
  ]);
}

function resolveValue(
  name: string,
  values: ReadonlyMap<string, string>,
  stack: ReadonlySet<string> = new Set(),
): string {
  if (stack.has(name)) {
    throw new TypeError(`Circular diagram Token reference at ${name}`);
  }
  const source = values.get(name);
  if (source === undefined) {
    throw new TypeError(`Unknown diagram Token reference ${name}`);
  }
  const nextStack = new Set(stack).add(name);
  return source.replace(
    /var\(\s*(--discern-[a-z0-9-]+)\s*\)/giu,
    (_match, dependency: string) => resolveValue(dependency, values, nextStack),
  );
}

/** Resolve every semantic diagram paint role to one self-contained literal. */
export function resolveDiagramPalette(
  variant: DiagramPaletteVariant,
): Readonly<Record<DiagramPaintRole, string>> {
  const values = authoredValues(variant);
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
  return resolveValue(name, authoredValues("light"));
}
