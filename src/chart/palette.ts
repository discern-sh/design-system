/** Literal Token resolution for portable chart assets. */

import type { SceneFontRole } from "../internal/font-metrics.ts";
import {
  authoredTokenValues,
  resolveTokenLiteral,
  type TokenPaletteVariant,
} from "../internal/token-literals.ts";
import type { ChartPaintRole } from "./scene.ts";

/** Explicit package palette used by a standalone SVG asset. */
export type ChartPaletteVariant = TokenPaletteVariant;

/** Public Token behind each semantic chart paint role. */
export const CHART_PAINT_TOKEN_NAMES = {
  canvas: "--discern-color-canvas",
  axis: "--discern-color-ink-faint",
  grid: "--discern-color-border",
  reference: "--discern-color-ink-muted",
  "axis-label": "--discern-color-ink-muted",
  annotation: "--discern-color-ink-faint",
  "series-1": "--discern-color-series-1",
  "series-2": "--discern-color-series-2",
  "series-3": "--discern-color-series-3",
  "series-4": "--discern-color-series-4",
  "series-5": "--discern-color-series-5",
  "series-6": "--discern-color-series-6",
  "ramp-1": "--discern-color-accent-200",
  "ramp-2": "--discern-color-accent-400",
  "ramp-3": "--discern-color-accent-600",
  "ramp-4": "--discern-color-accent-800",
} as const satisfies Readonly<Record<ChartPaintRole, `--discern-${string}`>>;

/** One public Token name enrolled behind a chart paint role. */
export type ChartPaintTokenName =
  typeof CHART_PAINT_TOKEN_NAMES[ChartPaintRole];

function resolveValue(
  name: string,
  values: ReadonlyMap<string, string>,
): string {
  return resolveTokenLiteral(name, values, "chart");
}

/** Resolve every semantic chart paint role to one self-contained literal. */
export function resolveChartPalette(
  variant: ChartPaletteVariant,
): Readonly<Record<ChartPaintRole, string>> {
  const values = authoredTokenValues(variant);
  return Object.freeze(Object.fromEntries(
    Object.entries(CHART_PAINT_TOKEN_NAMES).map(([role, tokenName]) => [
      role,
      resolveValue(tokenName as ChartPaintTokenName, values),
    ]),
  ) as Record<ChartPaintRole, string>);
}

/** Resolve the authored interface or annotation font stack without a web root. */
export function resolveChartFontStack(role: SceneFontRole): string {
  const name = role === "mono" ? "--discern-font-mono" : "--discern-font-ui";
  return resolveValue(name, authoredTokenValues("light"));
}
