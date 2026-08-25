/**
 * The authored six-slot categorical series palette, package-private until
 * the Chart surface ships it as documented public tokens.
 *
 * Slot order alternates blue-leaning and yellow-leaning hues because the
 * blue–yellow axis is what colour-vision deficiency preserves; hue positions
 * stay clear of the reserved state hues, the ink hue, and the default accent
 * hue so no series impersonates a semantic role. Safety is machine-checked
 * in `tests/chart/palette_test.ts`: deficiency-simulated adjacent-pair
 * separation at a pinned floor, ANSI 256 distinctness, and the exact ANSI 16
 * collapse record. Every slot pairs its colour with a marker and fill glyph;
 * colour never carries a series alone.
 *
 * @module
 */

/** One authored OKLCH value in the same terms the Token layer authors. */
export interface ChartSeriesOklch {
  /** Perceptual lightness as the authored percentage, 0–100. */
  readonly lightnessPercent: number;
  readonly chroma: number;
  /** Hue angle in degrees. */
  readonly hue: number;
}

/** Authored light and dark values for one of the six series slots. */
export interface ChartSeriesSlot {
  readonly slot: 1 | 2 | 3 | 4 | 5 | 6;
  readonly light: ChartSeriesOklch;
  readonly dark: ChartSeriesOklch;
}

function oklch(
  lightnessPercent: number,
  chroma: number,
  hue: number,
): ChartSeriesOklch {
  return Object.freeze({ lightnessPercent, chroma, hue });
}

/**
 * The six categorical slots in fixed order: teal, rust, sky, olive, purple,
 * pink. These values move into `tokens.ts` as
 * `--discern-color-series-1..6` when the Chart surface ships; the palette
 * guards travel with them unchanged.
 */
export const CHART_SERIES_SLOTS: readonly ChartSeriesSlot[] = Object.freeze(
  [
    Object.freeze(
      { slot: 1, light: oklch(58, 0.11, 195), dark: oklch(72, 0.13, 195) },
    ),
    Object.freeze(
      { slot: 2, light: oklch(46, 0.12, 50), dark: oklch(62, 0.13, 50) },
    ),
    Object.freeze(
      { slot: 3, light: oklch(60, 0.11, 225), dark: oklch(74, 0.12, 225) },
    ),
    Object.freeze(
      { slot: 4, light: oklch(68, 0.12, 115), dark: oklch(82, 0.14, 115) },
    ),
    Object.freeze(
      { slot: 5, light: oklch(44, 0.13, 315), dark: oklch(60, 0.15, 315) },
    ),
    Object.freeze(
      { slot: 6, light: oklch(64, 0.13, 345), dark: oklch(78, 0.14, 345) },
    ),
  ] as const,
);

/** Serialize one authored value in the Token layer's `oklch()` form. */
export function chartSeriesOklchLiteral(value: ChartSeriesOklch): string {
  return `oklch(${value.lightnessPercent}% ${value.chroma} ${value.hue})`;
}
