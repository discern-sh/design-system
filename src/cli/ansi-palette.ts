/**
 * Reference ANSI 16- and 256-colour palettes shared by terminal theme
 * derivation and terminal output projection.
 *
 * @module
 */

import {
  decodeSrgbChannel,
  linearRgbToOklab,
  type OklabColor,
} from "../internal/oklch.ts";

/** A device-independent sRGB colour channel tuple. */
export interface TerminalRgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** Reference sRGB values for the 16 base ANSI colours, in palette order. */
export const ANSI_16_RGB: readonly TerminalRgbColor[] = [
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

/** Reference sRGB values for the extended 256-colour ANSI palette. */
export const ANSI_256_RGB: readonly TerminalRgbColor[] = ansi256Palette();

function colorDistance(
  left: TerminalRgbColor,
  right: TerminalRgbColor,
): number {
  return (left.red - right.red) ** 2 + (left.green - right.green) ** 2 +
    (left.blue - right.blue) ** 2;
}

/**
 * First 256-colour index whose value terminals do not let their own theme
 * redefine. Indexes below it are the 16 themeable base colours, so a fill
 * chosen from them could land anywhere on the user's palette.
 */
export const ANSI_256_FIXED_START = 16;

/** Largest chroma at which a fill is treated as a neutral grey. */
const NEUTRAL_FILL_CHROMA = 0.02;
/** Largest chroma at which a fixed palette entry counts as a grey. */
const GREY_ENTRY_CHROMA = 0.005;
/** Widest hue difference, in degrees, that still reads as the same family. */
const FILL_HUE_TOLERANCE = 30;
/** Widest OKLab lightness difference that keeps text contrast recognisable. */
const FILL_LIGHTNESS_TOLERANCE = 0.06;
/** A substitute may saturate a wash by at most this factor, never beyond. */
const FILL_CHROMA_CEILING = 2.5;

interface PaletteOklab extends OklabColor {
  readonly index: number;
  readonly chroma: number;
}

interface RankedIndex {
  readonly index: number;
  readonly cost: number;
}

function rgbToOklab(color: TerminalRgbColor): OklabColor {
  return linearRgbToOklab(
    decodeSrgbChannel(color.red / 255),
    decodeSrgbChannel(color.green / 255),
    decodeSrgbChannel(color.blue / 255),
  );
}

const FIXED_256_OKLAB: readonly PaletteOklab[] = ANSI_256_RGB.slice(
  ANSI_256_FIXED_START,
).map((color, offset) => {
  const lab = rgbToOklab(color);
  return {
    ...lab,
    index: ANSI_256_FIXED_START + offset,
    chroma: Math.hypot(lab.a, lab.b),
  };
});

function hueDistance(first: OklabColor, second: OklabColor): number {
  const distance = Math.abs(
    Math.atan2(first.b, first.a) - Math.atan2(second.b, second.a),
  ) * 180 / Math.PI;
  return Math.min(distance, 360 - distance);
}

function byCost(left: RankedIndex, right: RankedIndex): number {
  return left.cost - right.cost || left.index - right.index;
}

/**
 * Rank fixed 256-colour entries as substitutes for one background fill,
 * best first. Text sits on a fill, so lightness governs: a chromatic wash
 * keeps its hue only through an entry of the same family, near its
 * lightness, and at most modestly more saturated; otherwise — and for every
 * neutral fill — greys follow, ranked by lightness alone. The ranking never
 * offers a saturated stand-in or a themeable base colour, so a wash that
 * cannot keep its hue degrades to a known grey rather than to a bright
 * background.
 */
export function rankBackgroundPaletteIndexes(
  color: TerminalRgbColor,
): readonly number[] {
  const target = rgbToOklab(color);
  const chroma = Math.hypot(target.a, target.b);
  const greys = FIXED_256_OKLAB
    .filter((entry) => entry.chroma < GREY_ENTRY_CHROMA)
    .map((entry): RankedIndex => ({
      index: entry.index,
      cost: Math.abs(entry.lightness - target.lightness),
    }));
  const family = chroma < NEUTRAL_FILL_CHROMA ? [] : FIXED_256_OKLAB
    .filter((entry) =>
      entry.chroma >= GREY_ENTRY_CHROMA &&
      entry.chroma <= chroma * FILL_CHROMA_CEILING &&
      Math.abs(entry.lightness - target.lightness) <=
        FILL_LIGHTNESS_TOLERANCE &&
      hueDistance(entry, target) <= FILL_HUE_TOLERANCE
    )
    .map((entry): RankedIndex => ({
      index: entry.index,
      cost: Math.hypot(
        entry.lightness - target.lightness,
        entry.a - target.a,
        entry.b - target.b,
      ),
    }));
  return [...family.toSorted(byCost), ...greys.toSorted(byCost)].map((entry) =>
    entry.index
  );
}

function relativeLuminance(color: TerminalRgbColor): number {
  return 0.2126 * decodeSrgbChannel(color.red / 255) +
    0.7152 * decodeSrgbChannel(color.green / 255) +
    0.0722 * decodeSrgbChannel(color.blue / 255);
}

/** WCAG contrast ratio between two sRGB colours. */
export function terminalContrastRatio(
  first: TerminalRgbColor,
  second: TerminalRgbColor,
): number {
  const [lighter = 0, darker = 0] = [
    relativeLuminance(first),
    relativeLuminance(second),
  ].toSorted((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Choose the 256-colour index for text painted on a known background. The
 * text's own nearest index stands when it is legible there; otherwise the
 * nearest legible fixed entry of the same family takes its place — the
 * same hue for a chromatic tone, a grey for a neutral one — and failing
 * that, the legible grey nearest its lightness, so the tone's glyph or
 * label carries a meaning the hue can no longer hold.
 */
export function legibleForegroundPaletteIndex(
  color: TerminalRgbColor,
  preferred: number,
  background: TerminalRgbColor,
  floor: number,
): number {
  const legible = (index: number): boolean => {
    const entry = ANSI_256_RGB[index];
    return entry !== undefined &&
      terminalContrastRatio(entry, background) >= floor;
  };
  if (legible(preferred)) return preferred;
  const target = rgbToOklab(color);
  const chromatic = Math.hypot(target.a, target.b) >= NEUTRAL_FILL_CHROMA;
  const candidates = FIXED_256_OKLAB.filter((entry) => legible(entry.index));
  const family = candidates.filter((entry) =>
    chromatic
      ? entry.chroma >= GREY_ENTRY_CHROMA &&
        hueDistance(entry, target) <= FILL_HUE_TOLERANCE
      : entry.chroma < GREY_ENTRY_CHROMA
  ).map((entry): RankedIndex => ({
    index: entry.index,
    cost: Math.hypot(
      entry.lightness - target.lightness,
      entry.a - target.a,
      entry.b - target.b,
    ),
  }));
  const greys = candidates.filter((entry) => entry.chroma < GREY_ENTRY_CHROMA)
    .map((entry): RankedIndex => ({
      index: entry.index,
      cost: Math.abs(entry.lightness - target.lightness),
    }));
  return [...family.toSorted(byCost), ...greys.toSorted(byCost)][0]?.index ??
    preferred;
}

/** Index of the palette colour nearest to an sRGB colour. */
export function nearestPaletteIndex(
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
