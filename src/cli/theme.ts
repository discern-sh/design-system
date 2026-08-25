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
import { clampRgbChannel, oklchToSrgb } from "../internal/oklch.ts";
import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../tokens/tokens.ts";

export type { TerminalRgbColor };

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

function splitTopLevel(source: string): readonly string[] {
  const parts: string[] = [];
  let depth = 0;
  let start = 0;
  for (let index = 0; index < source.length; index += 1) {
    const character = source[index];
    if (character === "(") depth += 1;
    else if (character === ")") depth -= 1;
    else if (character === "," && depth === 0) {
      parts.push(source.slice(start, index).trim());
      start = index + 1;
    }
  }
  parts.push(source.slice(start).trim());
  return parts;
}

interface WeightedColor {
  readonly color: TerminalRgbColor | undefined;
  readonly weight: number;
}

function parseWeightedColor(
  source: string,
  canvas: TerminalRgbColor,
): WeightedColor | undefined {
  const match = source.match(/^(.*?)(?:\s+([0-9]+(?:\.[0-9]+)?)%)?$/u);
  if (match === null) return undefined;
  const value = match[1]?.trim() ?? "";
  const weight = Number(match[2] ?? "50") / 100;
  if (!Number.isFinite(weight) || weight < 0 || weight > 1) return undefined;
  if (value === "transparent") return { color: undefined, weight };
  const color = parseCssColor(value, canvas);
  return color === undefined ? undefined : { color, weight };
}

function mixChannel(
  foreground: number,
  background: number,
  amount: number,
): number {
  return clampRgbChannel(foreground * amount + background * (1 - amount));
}

function parseColorMix(
  source: string,
  canvas: TerminalRgbColor,
): TerminalRgbColor | undefined {
  if (!source.startsWith("color-mix(") || !source.endsWith(")")) {
    return undefined;
  }
  const parts = splitTopLevel(source.slice("color-mix(".length, -1));
  if (parts.length !== 3 || !parts[0]?.startsWith("in ")) return undefined;
  const first = parseWeightedColor(parts[1] ?? "", canvas);
  const second = parseWeightedColor(parts[2] ?? "", canvas);
  if (first === undefined || second === undefined) return undefined;

  if (first.color === undefined && second.color === undefined) return canvas;
  if (first.color === undefined) {
    const color = second.color ?? canvas;
    return {
      red: mixChannel(color.red, canvas.red, second.weight),
      green: mixChannel(color.green, canvas.green, second.weight),
      blue: mixChannel(color.blue, canvas.blue, second.weight),
    };
  }
  if (second.color === undefined) {
    return {
      red: mixChannel(first.color.red, canvas.red, first.weight),
      green: mixChannel(first.color.green, canvas.green, first.weight),
      blue: mixChannel(first.color.blue, canvas.blue, first.weight),
    };
  }
  const total = first.weight + second.weight;
  const firstAmount = total === 0 ? 0.5 : first.weight / total;
  return {
    red: mixChannel(first.color.red, second.color.red, firstAmount),
    green: mixChannel(first.color.green, second.color.green, firstAmount),
    blue: mixChannel(first.color.blue, second.color.blue, firstAmount),
  };
}

function parseCssColor(
  source: string,
  canvas: TerminalRgbColor,
): TerminalRgbColor | undefined {
  const value = source.trim();
  const shortHex = value.match(/^#([0-9a-f])([0-9a-f])([0-9a-f])$/iu);
  if (shortHex !== null) {
    return {
      red: Number.parseInt(`${shortHex[1]}${shortHex[1]}`, 16),
      green: Number.parseInt(`${shortHex[2]}${shortHex[2]}`, 16),
      blue: Number.parseInt(`${shortHex[3]}${shortHex[3]}`, 16),
    };
  }
  const longHex = value.match(/^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/iu);
  if (longHex !== null) {
    return {
      red: Number.parseInt(longHex[1] ?? "0", 16),
      green: Number.parseInt(longHex[2] ?? "0", 16),
      blue: Number.parseInt(longHex[3] ?? "0", 16),
    };
  }
  const oklch = value.match(
    /^oklch\(\s*([0-9]+(?:\.[0-9]+)?)%\s+([0-9]+(?:\.[0-9]+)?)\s+(-?[0-9]+(?:\.[0-9]+)?)\s*\)$/u,
  );
  if (oklch !== null) {
    return oklchToSrgb(
      Number(oklch[1]) / 100,
      Number(oklch[2]),
      Number(oklch[3]),
    );
  }
  return parseColorMix(value, canvas);
}

function terminalColor(color: TerminalRgbColor): TerminalColor {
  return {
    ...color,
    ansi256: nearestPaletteIndex(color, ANSI_256_RGB),
    ansi16: nearestPaletteIndex(color, ANSI_16_RGB),
  };
}

function rawTokenValues(
  variant: TerminalThemeVariant,
): ReadonlyMap<string, string> {
  return new Map([
    ...baseTokens.map((token) => [token.name, token.value] as const),
    ...discernThemeTokens.map((token) => [token.name, token.value] as const),
    ...themeTokens.map((token) => [token.name, token[variant]] as const),
  ]);
}

function resolveTokenValue(
  name: string,
  values: ReadonlyMap<string, string>,
  stack: ReadonlySet<string> = new Set(),
): string {
  if (stack.has(name)) {
    throw new TypeError(`Circular Token reference at ${name}`);
  }
  const source = values.get(name);
  if (source === undefined) {
    throw new TypeError(`Unknown Token reference ${name}`);
  }
  const nextStack = new Set(stack).add(name);
  return source.replace(
    /var\(\s*(--discern-[a-z0-9-]+)\s*\)/giu,
    (_match, dependency: string) =>
      resolveTokenValue(dependency, values, nextStack),
  );
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
): TerminalTheme {
  const values = rawTokenValues(variant);
  const canvasSource = resolveTokenValue("--discern-color-canvas", values);
  const canvas = parseCssColor(canvasSource, { red: 0, green: 0, blue: 0 });
  if (canvas === undefined) {
    throw new TypeError(`Cannot resolve terminal canvas from ${canvasSource}`);
  }
  const colors: Partial<Record<TerminalColorTokenName, TerminalColor>> = {};
  for (
    const token of themeTokens.filter((candidate) =>
      candidate.category === "Color"
    )
  ) {
    const source = resolveTokenValue(token.name, values);
    const color = parseCssColor(source, canvas);
    if (color === undefined) {
      throw new TypeError(
        `Cannot derive terminal colour ${token.name} from ${source}`,
      );
    }
    colors[token.name] = terminalColor(color);
  }
  return {
    variant,
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
