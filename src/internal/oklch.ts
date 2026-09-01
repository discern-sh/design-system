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

/** Convert one OKLab colour to unclamped linear-light sRGB channels. */
export function oklabToLinearRgb(
  lightness: number,
  aAxis: number,
  bAxis: number,
): readonly [number, number, number] {
  const lRoot = lightness + 0.3963377774 * aAxis + 0.2158037573 * bAxis;
  const mRoot = lightness - 0.1055613458 * aAxis - 0.0638541728 * bAxis;
  const sRoot = lightness - 0.0894841775 * aAxis - 1.291485548 * bAxis;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

/** Convert one authored OKLCH colour to gamut-clamped sRGB channels. */
export function oklchToSrgb(
  lightness: number,
  chroma: number,
  hue: number,
): SrgbColor {
  const radians = hue * Math.PI / 180;
  const [red, green, blue] = oklabToLinearRgb(
    lightness,
    chroma * Math.cos(radians),
    chroma * Math.sin(radians),
  );
  return {
    red: srgbChannel(red),
    green: srgbChannel(green),
    blue: srgbChannel(blue),
  };
}
