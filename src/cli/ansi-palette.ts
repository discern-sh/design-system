/**
 * Reference ANSI 16- and 256-colour palettes shared by terminal theme
 * derivation and terminal output projection.
 *
 * @module
 */

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
