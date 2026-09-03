/** Literal Token resolution for portable chart assets. */

import type { SceneFontRole } from "../internal/font-metrics.ts";
import { type OklabColor, oklabContrast } from "../internal/oklch.ts";
import {
  authoredTokenValues,
  resolveTokenLiteral,
  type TokenPaletteVariant,
} from "../internal/token-literals.ts";
import { evaluateField, themeTokens } from "../tokens/tokens.ts";
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

function parseOklch(value: string): OklabColor {
  const match = value.match(
    /^oklch\(([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)\)$/,
  );
  if (match === null) {
    throw new TypeError(`Expected opaque chart oklch(), got ${value}`);
  }
  const chroma = Number(match[2]);
  const radians = Number(match[3]) * Math.PI / 180;
  return {
    lightness: Number(match[1]) / 100,
    a: chroma * Math.cos(radians),
    b: chroma * Math.sin(radians),
  };
}

function poleSeriesValue(
  name: ChartPaintTokenName,
  darkness: number,
  canvas: OklabColor,
): string {
  const token = themeTokens.find((candidate) => candidate.name === name);
  if (token === undefined) throw new TypeError(`Missing chart Token ${name}`);
  if (darkness === 0) return token.light;
  if (darkness === 1) return token.dark;
  const lightContrast = oklabContrast(parseOklch(token.light), canvas);
  const darkContrast = oklabContrast(parseOklch(token.dark), canvas);
  return darkContrast > lightContrast ? token.dark : token.light;
}

/**
 * Resolve the portable chart palette at any field point. Field roles evaluate
 * directly; each fixed series slot selects its more visible authored pole value.
 */
export function resolveChartPaletteAtDarkness(
  darkness: number,
): Readonly<Record<ChartPaintRole, string>> {
  const field = evaluateField({ darkness });
  const canvasValue = field["--discern-color-canvas"];
  if (canvasValue === undefined) throw new TypeError("Field has no canvas");
  const canvas = parseOklch(canvasValue);
  return Object.freeze(Object.fromEntries(
    Object.entries(CHART_PAINT_TOKEN_NAMES).map(([role, tokenName]) => {
      const fieldValue = field[tokenName as keyof typeof field];
      return [
        role,
        fieldValue ?? poleSeriesValue(tokenName, darkness, canvas),
      ];
    }),
  ) as Record<ChartPaintRole, string>);
}

/** Resolve every semantic chart paint role to one self-contained literal. */
export function resolveChartPalette(
  variant: ChartPaletteVariant,
): Readonly<Record<ChartPaintRole, string>> {
  return resolveChartPaletteAtDarkness(variant === "light" ? 0 : 1);
}

/** Resolve the authored interface or annotation font stack without a web root. */
export function resolveChartFontStack(role: SceneFontRole): string {
  const name = role === "mono" ? "--discern-font-mono" : "--discern-font-ui";
  return resolveValue(name, authoredTokenValues("light"));
}
