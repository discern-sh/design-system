/**
 * Terminal colours, spacing, and type roles derived from package Token metadata.
 *
 * @module
 */

import {
  ANSI_16_RGB,
  ANSI_256_RGB,
  legibleForegroundPaletteIndex,
  nearestPaletteIndex,
  rankBackgroundPaletteIndexes,
  terminalContrastRatio,
  type TerminalRgbColor,
} from "./ansi-palette.ts";
import { oklchToSrgb } from "../internal/oklch.ts";
import {
  activePigmentTints,
  type Appearance,
  APPEARANCE_POLE_INK_CONTRAST_FLOORS,
  type AppearanceAxes,
  type AppearanceColorRoleName,
  appearanceFillLaws,
  type AppearanceFillRoleName,
  baseTokens,
  evaluateOpaqueAppearance,
  evaluateOpaqueAppearanceFills,
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

/**
 * Background region a terminal paints: a reading surface, a raised overlay,
 * a selection and its receded form, a resting control, a focused control,
 * and a focused destructive control.
 */
export type TerminalSurfaceRole = AppearanceFillRoleName;

/** Every surface role, in the appearance authority's order. */
export const TERMINAL_SURFACE_ROLES: readonly TerminalSurfaceRole[] = Object
  .freeze(appearanceFillLaws.map((law) => law.name));

/**
 * One opaque background fill. Truecolor paints the evaluated colour and
 * ANSI 256 paints a background-aware substitute; the 16-colour palette has
 * no faithful washes, so a fill carries no 16-colour index and renderers
 * draw structure — a pointer, brackets, or a box — in its place.
 */
export interface TerminalFill extends TerminalRgbColor {
  readonly ansi256: number;
  readonly ansi16?: undefined;
}

/** The fill behind every surface role in one terminal theme. */
export type TerminalThemeRoles = Readonly<
  Record<TerminalSurfaceRole, TerminalFill>
>;

/** Minimum contrast between a resting control and the raised surface it sits on. */
export const TERMINAL_CONTROL_SEPARATION_FLOOR = 1.25;

/**
 * Two regions a reader must tell apart because one is drawn on or beside
 * the other. `canvas` stands for the terminal's own ground. A pair with a
 * `contrast` floor must also keep that luminance contrast; every other pair
 * must merely stay distinct.
 */
export interface TerminalSurfaceSeparation {
  readonly first: TerminalSurfaceRole | "canvas";
  readonly second: TerminalSurfaceRole;
  readonly contrast?: number;
}

/** Every pair of regions that must stay apart wherever fills are painted. */
export const TERMINAL_SURFACE_SEPARATIONS:
  readonly TerminalSurfaceSeparation[] = Object.freeze([
    { first: "canvas", second: "surface" },
    { first: "canvas", second: "raised" },
    { first: "canvas", second: "selection" },
    { first: "canvas", second: "selectionMuted" },
    { first: "surface", second: "raised" },
    { first: "surface", second: "selection" },
    { first: "raised", second: "selection" },
    { first: "selectionMuted", second: "selection" },
    {
      first: "raised",
      second: "control",
      contrast: TERMINAL_CONTROL_SEPARATION_FLOOR,
    },
    { first: "raised", second: "focusFill" },
    { first: "raised", second: "dangerFill" },
    { first: "control", second: "focusFill" },
    { first: "control", second: "dangerFill" },
  ]);

/** Text colour roles a terminal renderer paints. */
export type TerminalTextTone =
  | "ink"
  | "muted"
  | "faint"
  | "accent"
  | "success"
  | "warning"
  | "danger";

/** Every text tone, strongest neutral first. */
export const TERMINAL_TEXT_TONES: readonly TerminalTextTone[] = Object.freeze([
  "ink",
  "muted",
  "faint",
  "accent",
  "success",
  "warning",
  "danger",
]);

const TEXT_TONE_TOKENS = {
  ink: "--discern-color-ink",
  muted: "--discern-color-ink-muted",
  faint: "--discern-color-ink-faint",
  accent: "--discern-color-accent-700",
  success: "--discern-color-success-deep",
  warning: "--discern-color-warning-deep",
  danger: "--discern-color-danger",
} as const satisfies Readonly<Record<TerminalTextTone, TerminalColorTokenName>>;

/**
 * Tones each surface carries. A surface that does not carry faint text
 * raises it to muted: faint is a label colour, and on a selection or a
 * control it would fall below the text-contrast floor. Any other tone a
 * surface does not carry falls back to ink.
 */
export const TERMINAL_SURFACE_TEXT_TONES: Readonly<
  Record<TerminalSurfaceRole, readonly TerminalTextTone[]>
> = Object.freeze({
  surface: TERMINAL_TEXT_TONES,
  raised: TERMINAL_TEXT_TONES,
  selectionMuted: TERMINAL_TEXT_TONES,
  selection: TERMINAL_TEXT_TONES.filter((tone) => tone !== "faint"),
  control: ["ink", "muted", "danger"],
  focusFill: ["ink", "muted", "accent"],
  dangerFill: ["ink", "muted", "danger"],
});

/**
 * Contrast every text tone keeps on every surface that carries it: the
 * browser's floor for muted ink, which faint ink also holds on neutral text
 * surfaces at the poles.
 */
export const TERMINAL_TEXT_CONTRAST_FLOOR: number = Math.min(
  ...APPEARANCE_POLE_INK_CONTRAST_FLOORS.map(([, floor]) => floor),
);

/** Text colour for every tone as painted on one surface. */
export type TerminalSurfaceText = Readonly<
  Record<TerminalTextTone, TerminalColor>
>;

/** One fully derived light or dark terminal theme. */
export interface TerminalTheme {
  readonly variant: TerminalThemeVariant;
  readonly appearance: TerminalAppearance;
  readonly colors: Readonly<Record<TerminalColorTokenName, TerminalColor>>;
  readonly surfaces: TerminalThemeRoles;
  /**
   * Text on each surface: the carried tone's authored colour, with an ANSI
   * 256 index chosen against that surface's 256-colour fill.
   */
  readonly surfaceText: Readonly<
    Record<TerminalSurfaceRole, TerminalSurfaceText>
  >;
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
  const canvas = colors["--discern-color-canvas"];
  if (canvas === undefined) {
    throw new TypeError("Appearance did not evaluate the terminal canvas");
  }
  const surfaces = deriveSurfaces(resolved, canvas);
  return {
    variant,
    appearance: resolvedAppearance,
    colors: colors as Readonly<Record<TerminalColorTokenName, TerminalColor>>,
    surfaces,
    surfaceText: deriveSurfaceText(colors, surfaces),
    spacing: deriveSpacing(),
    typography: deriveTypography(),
  };
}

function carriedTone(
  tone: TerminalTextTone,
  surface: TerminalSurfaceRole,
): TerminalTextTone {
  const carried = TERMINAL_SURFACE_TEXT_TONES[surface];
  if (carried.includes(tone)) return tone;
  return tone === "faint" && carried.includes("muted") ? "muted" : "ink";
}

/**
 * Resolve every tone on every surface: the carried tone keeps its authored
 * truecolor and 16-colour values, while its 256-colour index is chosen
 * against the surface's own 256-colour fill so the pair stays legible.
 */
function deriveSurfaceText(
  colors: Partial<Record<TerminalColorTokenName, TerminalColor>>,
  surfaces: TerminalThemeRoles,
): Readonly<Record<TerminalSurfaceRole, TerminalSurfaceText>> {
  return Object.fromEntries(TERMINAL_SURFACE_ROLES.map((surface) => {
    const fill = ANSI_256_RGB[surfaces[surface].ansi256];
    if (fill === undefined) {
      throw new TypeError(`Surface ${surface} has no 256-colour fill`);
    }
    return [
      surface,
      Object.fromEntries(TERMINAL_TEXT_TONES.map((tone) => {
        const name = TEXT_TONE_TOKENS[carriedTone(tone, surface)];
        const color = colors[name];
        if (color === undefined) {
          throw new TypeError(`Terminal theme has no colour ${name}`);
        }
        const ansi256 = legibleForegroundPaletteIndex(
          color,
          color.ansi256,
          fill,
          TERMINAL_TEXT_CONTRAST_FLOOR,
        );
        return [
          tone,
          ansi256 === color.ansi256 ? color : { ...color, ansi256 },
        ];
      })) as TerminalSurfaceText,
    ];
  })) as Readonly<Record<TerminalSurfaceRole, TerminalSurfaceText>>;
}

/**
 * Quieter fills claim their nearest substitute first, so where the fixed
 * palette cannot tell two fills apart it is the attention-carrying fill —
 * the selection, then focus and danger — that moves to the next candidate.
 */
const SURFACE_QUANTISATION_ORDER: readonly TerminalSurfaceRole[] = [
  "surface",
  "selectionMuted",
  "raised",
  "control",
  "selection",
  "focusFill",
  "dangerFill",
];

/**
 * Evaluate every fill and quantise the set jointly for ANSI 256: each fill
 * takes its best-ranked background substitute that no fill it must stay
 * apart from has already taken, so a coarse palette can drop a wash's hue
 * but never merge two regions a reader has to tell apart.
 */
function deriveSurfaces(
  resolved: Appearance,
  canvas: TerminalRgbColor,
): TerminalThemeRoles {
  const evaluated = evaluateOpaqueAppearanceFills(resolved);
  const canvasIndex = rankBackgroundPaletteIndexes(canvas)[0];
  const assigned = new Map<TerminalSurfaceRole | "canvas", number>(
    canvasIndex === undefined ? [] : [["canvas", canvasIndex]],
  );
  const surfaces: Partial<Record<TerminalSurfaceRole, TerminalFill>> = {};
  for (const role of SURFACE_QUANTISATION_ORDER) {
    const parsed = parseCssColor(evaluated[role]);
    if (parsed === undefined) {
      throw new TypeError(
        `Cannot derive terminal surface ${role} from ${evaluated[role]}`,
      );
    }
    const rivals = TERMINAL_SURFACE_SEPARATIONS.flatMap((separation) => {
      const rival = separation.first === role
        ? separation.second
        : separation.second === role
        ? separation.first
        : undefined;
      const index = rival === undefined ? undefined : assigned.get(rival);
      const color = index === undefined ? undefined : ANSI_256_RGB[index];
      return index === undefined || color === undefined
        ? []
        : [{ index, color, contrast: separation.contrast ?? 1 }];
    });
    const ranked = rankBackgroundPaletteIndexes(parsed.color);
    const ansi256 = ranked.find((index) => {
      const color = ANSI_256_RGB[index];
      return color !== undefined &&
        rivals.every((rival) =>
          rival.index !== index &&
          terminalContrastRatio(color, rival.color) >= rival.contrast
        );
    }) ?? ranked[0];
    if (ansi256 === undefined) {
      throw new TypeError(`No 256-colour substitute for surface ${role}`);
    }
    assigned.set(role, ansi256);
    surfaces[role] = { ...parsed.color, ansi256 };
  }
  return surfaces as TerminalThemeRoles;
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

/** Resolve the fill behind one surface role. */
export function terminalSurfaceFill(
  theme: TerminalTheme,
  role: TerminalSurfaceRole,
): TerminalFill {
  const fill = theme.surfaces[role];
  if (fill === undefined) {
    throw new TypeError(`Terminal theme has no surface ${role}`);
  }
  return fill;
}

/**
 * Resolve the text colour for one tone, optionally as painted on one
 * surface. A surface that does not carry the tone substitutes muted for
 * faint and ink for anything else, and the 256-colour index is chosen
 * against that surface's fill, so every painted pair is one the surface
 * admission proof covers.
 */
export function terminalTextToneColor(
  theme: TerminalTheme,
  tone: TerminalTextTone,
  surface?: TerminalSurfaceRole,
): TerminalColor {
  if (surface === undefined) {
    return terminalThemeColor(theme, TEXT_TONE_TOKENS[tone]);
  }
  const color = theme.surfaceText[surface]?.[tone];
  if (color === undefined) {
    throw new TypeError(`Terminal theme has no ${tone} text on ${surface}`);
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
