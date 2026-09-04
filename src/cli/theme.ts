/**
 * Terminal colours, spacing, and type roles derived from package Token metadata.
 *
 * @module
 */

import {
  ANSI_16_RGB,
  ANSI_256_RGB,
  nearestPaletteIndex,
  type TerminalRgbColor,
} from "./ansi-palette.ts";
import { oklchToSrgb } from "../internal/oklch.ts";
import {
  activePigmentTints,
  type Appearance,
  type AppearanceAxes,
  type AppearanceColorRoleName,
  baseTokens,
  evaluateOpaqueAppearance,
  type PigmentTintAxisName,
  resolveAppearance,
  themeTokens,
} from "../tokens/tokens.ts";

export type { TerminalRgbColor };

/**
 * Colour choices a terminal palette honours: an optional accent hue and the
 * optional paper and ink tints. The caller's ground supplies darkness, so no
 * other axis coordinate belongs here.
 */
export type TerminalAppearance =
  & Pick<Appearance, "accent">
  & Partial<Pick<AppearanceAxes, PigmentTintAxisName>>;

/** Retain only the accent and the tints that actually colour a pigment. */
function explicitTerminalAppearance(resolved: Appearance): TerminalAppearance {
  return {
    ...(resolved.accent === undefined ? {} : { accent: resolved.accent }),
    ...activePigmentTints(resolved),
  };
}

/** One semantic colour with precomputed terminal-palette fallbacks. */
export interface TerminalColor extends TerminalRgbColor {
  readonly ansi256: number;
  readonly ansi16: number;
}

/** Public semantic colour-token name addressable by CLI renderers. */
export type TerminalColorTokenName = `--discern-${string}`;

/** Public spacing-token name mapped to terminal character cells. */
export type TerminalSpacingTokenName = `--discern-space-${string}`;

/** Theme variant whose Token values feed one terminal palette. */
export type TerminalThemeVariant = "light" | "dark";

/** Independent ground and appearance inputs for one terminal palette. */
export interface TerminalThemeOptions {
  /** Caller-selected terminal ground; defaults to `"dark"`. */
  readonly theme?: TerminalThemeVariant;
  /** Caller-selected appearance; omission or an absent accent stays monochrome. */
  readonly appearance?: TerminalAppearance;
}

/** Semantic terminal type roles available without a font renderer. */
export type TerminalTextRole =
  | "body"
  | "strong"
  | "display"
  | "muted"
  | "emphasis"
  | "annotation";

/** ANSI attributes representing one terminal type role. */
export interface TerminalTypeStyle {
  readonly bold?: true;
  readonly dim?: true;
  readonly italic?: true;
}

/** Semantic tones shared by terminal foundation motifs. */
export type TerminalSemanticTone =
  | "accent"
  | "neutral"
  | "success"
  | "warning"
  | "danger";

/** One fully derived light or dark terminal theme. */
export interface TerminalTheme {
  readonly variant: TerminalThemeVariant;
  readonly appearance: TerminalAppearance;
  readonly colors: Readonly<Record<TerminalColorTokenName, TerminalColor>>;
  readonly spacing: Readonly<
    Record<TerminalSpacingTokenName, number>
  >;
  readonly typography: Readonly<Record<TerminalTextRole, TerminalTypeStyle>>;
}

const TONE_TOKENS = {
  accent: "--discern-color-accent-700",
  neutral: "--discern-color-ink-muted",
  success: "--discern-color-success-deep",
  warning: "--discern-color-warning-deep",
  danger: "--discern-color-danger",
} as const satisfies Readonly<
  Record<TerminalSemanticTone, TerminalColorTokenName>
>;

interface ParsedCssColor {
  readonly color: TerminalRgbColor;
  readonly chroma: number;
}

function parseCssColor(
  source: string,
): ParsedCssColor | undefined {
  const value = source.trim();
  const oklch = value.match(
    /^oklch\(\s*([0-9]+(?:\.[0-9]+)?)%\s+([0-9]+(?:\.[0-9]+)?)\s+(-?[0-9]+(?:\.[0-9]+)?)\s*\)$/u,
  );
  if (oklch !== null) {
    const chroma = Number(oklch[2]);
    return {
      color: oklchToSrgb(
        Number(oklch[1]) / 100,
        chroma,
        Number(oklch[3]),
      ),
      chroma,
    };
  }
  return undefined;
}

function terminalColor(
  color: TerminalRgbColor,
  ansi16 = nearestPaletteIndex(color, ANSI_16_RGB),
): TerminalColor {
  return {
    ...color,
    ansi256: nearestPaletteIndex(color, ANSI_256_RGB),
    ansi16,
  };
}

function rgbHue(color: TerminalRgbColor): number | undefined {
  const red = color.red / 255;
  const green = color.green / 255;
  const blue = color.blue / 255;
  const maximum = Math.max(red, green, blue);
  const minimum = Math.min(red, green, blue);
  const range = maximum - minimum;
  if (range === 0) return undefined;
  const sector = maximum === red
    ? (green - blue) / range
    : maximum === green
    ? (blue - red) / range + 2
    : (red - green) / range + 4;
  return ((sector * 60) % 360 + 360) % 360;
}

function circularHueDistance(first: number, second: number): number {
  const distance = Math.abs(first - second);
  return Math.min(distance, 360 - distance);
}

/**
 * Keep an evaluated chromatic role chromatic in ANSI 16. Euclidean RGB
 * proximity otherwise sends every pale role on dark ground to white. The
 * finite palette has six hue families, so select the nearest family by its
 * own RGB hue and use the ground-appropriate intensity. Collisions between
 * nearby authored hues are then the palette's real six-family limit.
 */
function chromaticAnsi16Index(
  color: TerminalRgbColor,
  variant: TerminalThemeVariant,
): number {
  const hue = rgbHue(color);
  if (hue === undefined) return nearestPaletteIndex(color, ANSI_16_RGB);
  const first = variant === "light" ? 1 : 9;
  let nearest = first;
  let distance = Number.POSITIVE_INFINITY;
  for (let index = first; index < first + 6; index += 1) {
    const candidate = ANSI_16_RGB[index];
    if (candidate === undefined) continue;
    const candidateHue = rgbHue(candidate);
    if (candidateHue === undefined) continue;
    const candidateDistance = circularHueDistance(hue, candidateHue);
    if (candidateDistance < distance) {
      nearest = index;
      distance = candidateDistance;
    }
  }
  return nearest;
}

function numericToken(name: string): number {
  const token = baseTokens.find((candidate) => candidate.name === name);
  if (token === undefined) {
    throw new TypeError(`Missing terminal bridge Token ${name}`);
  }
  const value = Number.parseFloat(token.value);
  if (!Number.isFinite(value)) {
    throw new TypeError(`Token ${name} is not numeric`);
  }
  return value;
}

function deriveSpacing(): Readonly<Record<TerminalSpacingTokenName, number>> {
  const cellPixels = numericToken("--discern-space-2");
  return Object.fromEntries(
    baseTokens.filter((token) => token.name.startsWith("--discern-space-")).map(
      (token) => {
        const pixels = Number.parseFloat(token.value);
        if (!Number.isFinite(pixels)) {
          throw new TypeError(
            `Spacing Token ${token.name} is not a pixel value`,
          );
        }
        return [token.name, Math.max(1, Math.round(pixels / cellPixels))];
      },
    ),
  ) as Readonly<Record<TerminalSpacingTokenName, number>>;
}

function deriveTypography(): Readonly<
  Record<TerminalTextRole, TerminalTypeStyle>
> {
  const bodyWeight = numericToken("--discern-font-weight-body");
  const strongWeight = numericToken("--discern-font-weight-strong");
  const displayWeight = numericToken("--discern-font-weight-display");
  return {
    body: {},
    strong: strongWeight > bodyWeight ? { bold: true } : {},
    display: displayWeight > bodyWeight ? { bold: true } : {},
    muted: { dim: true },
    emphasis: { italic: true },
    annotation: { dim: true, italic: true },
  };
}

/** Derive one terminal palette directly from the package's authored Token values. */
export function deriveTerminalTheme(
  variant: TerminalThemeVariant,
  appearance: TerminalAppearance = {},
): TerminalTheme {
  const resolved = resolveAppearance({
    ...appearance,
    darkness: variant === "light" ? 0 : 1,
  });
  const resolvedAppearance = explicitTerminalAppearance(resolved);
  const appearanceValues = evaluateOpaqueAppearance(resolved);
  const colors: Partial<Record<TerminalColorTokenName, TerminalColor>> = {};
  for (
    const token of themeTokens.filter((candidate) =>
      candidate.category === "Color"
    )
  ) {
    const appearanceValue = appearanceValues[
      token.name as AppearanceColorRoleName
    ];
    const source = appearanceValue ??
      (token.name.startsWith("--discern-color-series-")
        ? token[variant]
        : undefined);
    if (source === undefined) {
      throw new TypeError(
        `Appearance did not evaluate terminal colour ${token.name}`,
      );
    }
    const parsed = parseCssColor(source);
    if (parsed === undefined) {
      throw new TypeError(
        `Cannot derive terminal colour ${token.name} from ${source}`,
      );
    }
    const preservesIndependentSeries = token.name.startsWith(
      "--discern-color-series-",
    );
    const ansi16 = resolvedAppearance.accent !== undefined &&
        !preservesIndependentSeries && parsed.chroma > 0.0000001
      ? chromaticAnsi16Index(parsed.color, variant)
      : undefined;
    colors[token.name] = terminalColor(parsed.color, ansi16);
  }
  return {
    variant,
    appearance: resolvedAppearance,
    colors: colors as Readonly<Record<TerminalColorTokenName, TerminalColor>>,
    spacing: deriveSpacing(),
    typography: deriveTypography(),
  };
}

/** Package terminal themes, derived once from the light and dark Token variants. */
export const terminalThemes: Readonly<
  Record<TerminalThemeVariant, TerminalTheme>
> = {
  light: deriveTerminalTheme("light"),
  dark: deriveTerminalTheme("dark"),
};

/**
 * Resolve one terminal palette from independent ground and appearance inputs.
 * Untinted monochrome poles reuse the cached package palettes; an accent or
 * tinted palette is evaluated directly from the shared appearance law.
 */
export function resolveTerminalTheme(
  options: TerminalThemeOptions = {},
): TerminalTheme {
  const variant = options.theme ?? "dark";
  if (variant !== "light" && variant !== "dark") {
    throw new TypeError(`unknown terminal theme variant ${variant}`);
  }
  const appearance = options.appearance ?? {};
  const explicit = explicitTerminalAppearance(
    resolveAppearance({ ...appearance, darkness: variant === "light" ? 0 : 1 }),
  );
  return Object.keys(explicit).length === 0
    ? terminalThemes[variant]
    : deriveTerminalTheme(variant, explicit);
}

/** Resolve one authored semantic colour from a derived terminal theme. */
export function terminalThemeColor(
  theme: TerminalTheme,
  name: TerminalColorTokenName,
): TerminalColor {
  const color = theme.colors[name];
  if (color === undefined) {
    throw new TypeError(`Terminal theme has no colour ${name}`);
  }
  return color;
}

/** Resolve a foundation motif tone without copying its authored Token value. */
export function terminalToneColor(
  theme: TerminalTheme,
  tone: TerminalSemanticTone,
): TerminalColor {
  return terminalThemeColor(theme, TONE_TOKENS[tone]);
}
