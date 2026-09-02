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

/** Device-independent OKLab coordinates. */
export interface OklabColor {
  readonly lightness: number;
  readonly a: number;
  readonly b: number;
}

/** Gamma-encoded sRGB channels in the unit interval. */
export interface GammaSrgbColor {
  readonly red: number;
  readonly green: number;
  readonly blue: number;
}

/** Clamp one channel into the displayable 0–255 integer range. */
export function clampRgbChannel(value: number): number {
  return Math.round(Math.min(255, Math.max(0, value)));
}

function srgbChannel(linear: number): number {
  const encoded = encodeSrgbChannel(linear);
  return clampRgbChannel(encoded * 255);
}

/** Encode one linear-light sRGB channel into gamma sRGB. */
export function encodeSrgbChannel(linear: number): number {
  const clamped = Math.max(0, Math.min(1, linear));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

/** Decode one gamma sRGB channel into linear light. */
export function decodeSrgbChannel(encoded: number): number {
  const clamped = Math.max(0, Math.min(1, encoded));
  return clamped <= 0.04045
    ? clamped / 12.92
    : Math.pow((clamped + 0.055) / 1.055, 2.4);
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

/** Convert linear-light sRGB channels to OKLab. */
export function linearRgbToOklab(
  red: number,
  green: number,
  blue: number,
): OklabColor {
  const l = Math.cbrt(
    0.4122214708 * red + 0.5363325363 * green + 0.0514459929 * blue,
  );
  const m = Math.cbrt(
    0.2119034982 * red + 0.6806995451 * green + 0.1073969566 * blue,
  );
  const s = Math.cbrt(
    0.0883024619 * red + 0.2817188376 * green + 0.6299787005 * blue,
  );
  return {
    lightness: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Convert OKLab coordinates to gamma-encoded sRGB channels. */
export function oklabToGammaSrgb(color: OklabColor): GammaSrgbColor {
  const [red, green, blue] = oklabToLinearRgb(
    color.lightness,
    color.a,
    color.b,
  );
  return {
    red: encodeSrgbChannel(red),
    green: encodeSrgbChannel(green),
    blue: encodeSrgbChannel(blue),
  };
}

/** Composite one OKLab foreground over an opaque OKLab backdrop as browsers paint. */
export function compositeOklab(
  foreground: OklabColor,
  alpha: number,
  backdrop: OklabColor,
): OklabColor {
  if (!(alpha >= 0 && alpha <= 1)) {
    throw new TypeError(`Alpha ${alpha} is outside [0, 1]`);
  }
  if (alpha === 1) return foreground;
  if (alpha === 0) return backdrop;
  const front = oklabToGammaSrgb(foreground);
  const back = oklabToGammaSrgb(backdrop);
  const blend = (frontChannel: number, backChannel: number): number =>
    decodeSrgbChannel(
      frontChannel * alpha + backChannel * (1 - alpha),
    );
  return linearRgbToOklab(
    blend(front.red, back.red),
    blend(front.green, back.green),
    blend(front.blue, back.blue),
  );
}

/** WCAG relative luminance of one OKLab colour. */
export function oklabRelativeLuminance(color: OklabColor): number {
  const [red, green, blue] = oklabToLinearRgb(
    color.lightness,
    color.a,
    color.b,
  );
  const clamp = (channel: number): number => Math.max(0, Math.min(1, channel));
  return 0.2126 * clamp(red) + 0.7152 * clamp(green) +
    0.0722 * clamp(blue);
}

/** WCAG contrast ratio between two opaque OKLab colours. */
export function oklabContrast(first: OklabColor, second: OklabColor): number {
  const [lighter = 0, darker = 0] = [
    oklabRelativeLuminance(first),
    oklabRelativeLuminance(second),
  ].toSorted((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Euclidean distance between two OKLab colours. */
export function oklabDistance(first: OklabColor, second: OklabColor): number {
  return Math.hypot(
    first.lightness - second.lightness,
    first.a - second.a,
    first.b - second.b,
  );
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
