/**
 * Terminal colours, spacing, and type roles derived from package Token metadata.
 *
 * @module
 */

import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../tokens/tokens.ts";

/** A device-independent sRGB colour channel tuple. */
export interface TerminalRgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
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

const ANSI_16_RGB: readonly TerminalRgbColor[] = [
  { red: 0, green: 0, blue: 0 },
  { red: 128, green: 0, blue: 0 },
  { red: 0, green: 128, blue: 0 },
  { red: 128, green: 128, blue: 0 },
  { red: 0, green: 0, blue: 128 },
  { red: 128, green: 0, blue: 128 },
  { red: 0, green: 128, blue: 128 },
  { red: 192, green: 192, blue: 192 },
  { red: 128, green: 128, blue: 128 },
  { red: 255, green: 0, blue: 0 },
  { red: 0, green: 255, blue: 0 },
  { red: 255, green: 255, blue: 0 },
  { red: 0, green: 0, blue: 255 },
  { red: 255, green: 0, blue: 255 },
  { red: 0, green: 255, blue: 255 },
  { red: 255, green: 255, blue: 255 },
] as const;

const TONE_TOKENS = {
  accent: "--discern-color-accent-700",
  neutral: "--discern-color-ink-muted",
  success: "--discern-color-success-deep",
  warning: "--discern-color-warning-deep",
  danger: "--discern-color-danger",
} as const satisfies Readonly<
  Record<TerminalSemanticTone, TerminalColorTokenName>
>;

function clampChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

function srgbChannel(linear: number): number {
  const encoded = linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return clampChannel(encoded * 255);
}

function oklchToRgb(
  lightness: number,
  chroma: number,
  hue: number,
): TerminalRgbColor {
  const radians = hue * Math.PI / 180;
  const a = chroma * Math.cos(radians);
  const b = chroma * Math.sin(radians);
  const lRoot = lightness + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = lightness - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = lightness - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return {
    red: srgbChannel(4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s),
    green: srgbChannel(
      -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    ),
    blue: srgbChannel(
      -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
    ),
  };
}

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
  return clampChannel(foreground * amount + background * (1 - amount));
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
    return oklchToRgb(
      Number(oklch[1]) / 100,
      Number(oklch[2]),
      Number(oklch[3]),
    );
  }
  return parseColorMix(value, canvas);
}

function colorDistance(
  left: TerminalRgbColor,
  right: TerminalRgbColor,
): number {
  return (left.red - right.red) ** 2 + (left.green - right.green) ** 2 +
    (left.blue - right.blue) ** 2;
}

function ansi256Palette(): readonly TerminalRgbColor[] {
  const palette: TerminalRgbColor[] = [...ANSI_16_RGB];
  const levels = [0, 95, 135, 175, 215, 255] as const;
  for (const red of levels) {
    for (const green of levels) {
      for (const blue of levels) palette.push({ red, green, blue });
    }
  }
  for (let index = 0; index < 24; index += 1) {
    const value = 8 + index * 10;
    palette.push({ red: value, green: value, blue: value });
  }
  return palette;
}

const ANSI_256_RGB = ansi256Palette();

function nearestPaletteIndex(
  color: TerminalRgbColor,
  palette: readonly TerminalRgbColor[],
): number {
  let nearest = 0;
  let distance = Number.POSITIVE_INFINITY;
  for (const [index, candidate] of palette.entries()) {
    const candidateDistance = colorDistance(color, candidate);
    if (candidateDistance < distance) {
      nearest = index;
      distance = candidateDistance;
    }
  }
  return nearest;
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
export const terminalThemes = {
  light: deriveTerminalTheme("light"),
  dark: deriveTerminalTheme("dark"),
} as const satisfies Readonly<Record<TerminalThemeVariant, TerminalTheme>>;

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
