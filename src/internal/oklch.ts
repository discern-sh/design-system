/**
 * OKLCH to sRGB conversion shared by terminal theme derivation and the kind
 * families' authored palette guards, so one matrix set owns the mapping from
 * authored oklch() Token values to device colour.
 *
 * @module
 */

/** Device-independent sRGB channel triple in 0–255 integer space. */
export interface SrgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** Clamp one channel into the displayable 0–255 integer range. */
export function clampRgbChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

function srgbChannel(linear: number): number {
  const encoded = linear <= 0.0031308
    ? 12.92 * linear
    : 1.055 * Math.pow(linear, 1 / 2.4) - 0.055;
  return clampRgbChannel(encoded * 255);
}

/** Convert one authored OKLCH colour to gamut-clamped sRGB channels. */
export function oklchToSrgb(
  lightness: number,
  chroma: number,
  hue: number,
): SrgbColor {
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
