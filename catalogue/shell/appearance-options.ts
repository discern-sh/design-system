import { oklabToLinearRgb } from "../../src/internal/oklch.ts";
import type { ThemeToken } from "../../src/tokens/tokens.ts";
import {
  baseTokens,
  discernThemeTokens,
  themeTokens,
} from "../../src/tokens/tokens.ts";

/** Facts shared by every project-facing Appearance choice. */
interface CatalogueAppearanceOptionBase {
  readonly id: string;
  readonly label: string;
  readonly default?: true;
}

/** Appearance choice backed by the public low-level accent hue primitive. */
export interface CatalogueHueAppearanceOption
  extends CatalogueAppearanceOptionBase {
  readonly kind: "hue";
  readonly hue: number;
}

/** Appearance choice backed by public role-token overrides. */
export interface CataloguePresetAppearanceOption
  extends CatalogueAppearanceOptionBase {
  readonly kind: "preset";
  readonly overrides: readonly ThemeToken[];
}

/** One project-facing Appearance choice: an accent hue or a role preset. */
export type CatalogueAppearanceOption =
  | CatalogueHueAppearanceOption
  | CataloguePresetAppearanceOption;

type ThemeMode = "light" | "dark";

interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

interface ProofColor extends Oklab {
  readonly alpha: number;
}

const semanticRoles = ["success", "warning", "danger"] as const;
const semanticDistanceFloor = 0.08;
const seriesSteps = [1, 2, 3, 4, 5, 6] as const;
const seriesDistanceFloor = 0.09;
const seriesCanvasContrastFloor = 1.25;
const inkContrastFloors = [
  ["--discern-color-ink", 7],
  ["--discern-color-ink-muted", 4.5],
  ["--discern-color-ink-faint", 3],
] as const;

const accentHuePrimitive = discernThemeTokens.find((token) =>
  token.name === "--discern-accent-hue"
);
if (accentHuePrimitive === undefined) {
  throw new TypeError("Missing the public accent hue primitive");
}
const authoredAccentHue = Number(accentHuePrimitive.value);
const neutralHuePrimitives: readonly (readonly [string, string])[] = baseTokens
  .filter((token) => token.name.endsWith("-hue"))
  .map((token) => [token.name, token.value]);

function parseOklch(value: string): ProofColor {
  const match = value.match(
    /^oklch\(([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*([\d.]+))?\)$/,
  );
  if (match === null) {
    throw new TypeError(`Expected concrete oklch(), got ${value}`);
  }
  const l = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const radians = Number(match[3]) * Math.PI / 180;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (!(alpha >= 0 && alpha <= 1)) {
    throw new TypeError(`Alpha outside [0, 1] in ${value}`);
  }
  return {
    l,
    a: chroma * Math.cos(radians),
    b: chroma * Math.sin(radians),
    alpha,
  };
}

function encodeChannel(linear: number): number {
  const clamped = Math.max(0, Math.min(1, linear));
  return clamped <= 0.0031308
    ? 12.92 * clamped
    : 1.055 * Math.pow(clamped, 1 / 2.4) - 0.055;
}

function decodeChannel(encoded: number): number {
  return encoded <= 0.04045
    ? encoded / 12.92
    : Math.pow((encoded + 0.055) / 1.055, 2.4);
}

function toGammaRgb(color: Oklab): readonly [number, number, number] {
  const [red, green, blue] = oklabToLinearRgb(color.l, color.a, color.b);
  return [encodeChannel(red), encodeChannel(green), encodeChannel(blue)];
}

function linearToOklab(red: number, green: number, blue: number): Oklab {
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
    l: 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s,
    a: 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s,
    b: 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s,
  };
}

/** Composite one possibly-translucent colour over an opaque backdrop as browsers do. */
function over(color: ProofColor, backdrop: Oklab): Oklab {
  if (color.alpha === 1) return { l: color.l, a: color.a, b: color.b };
  const [foreRed, foreGreen, foreBlue] = toGammaRgb(color);
  const [backRed, backGreen, backBlue] = toGammaRgb(backdrop);
  const blend = (fore: number, back: number): number =>
    fore * color.alpha + back * (1 - color.alpha);
  return linearToOklab(
    decodeChannel(blend(foreRed, backRed)),
    decodeChannel(blend(foreGreen, backGreen)),
    decodeChannel(blend(foreBlue, backBlue)),
  );
}

function luminance(color: Oklab): number {
  const [red, green, blue] = oklabToLinearRgb(color.l, color.a, color.b);
  const clamp = (channel: number): number => Math.max(0, Math.min(1, channel));
  return 0.2126 * clamp(red) + 0.7152 * clamp(green) + 0.0722 * clamp(blue);
}

function contrast(first: Oklab, second: Oklab): number {
  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)]
    .toSorted((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function distance(first: Oklab, second: Oklab): number {
  return Math.hypot(first.l - second.l, first.a - second.a, first.b - second.b);
}

function tokenColor(
  option: CatalogueAppearanceOption,
  name: `--discern-${string}`,
  mode: ThemeMode,
): ProofColor {
  if (option.kind === "preset") {
    const override = option.overrides.find((candidate) =>
      candidate.name === name
    );
    if (override !== undefined) return parseOklch(override[mode]);
  }
  const token = themeTokens.find((candidate) => candidate.name === name);
  if (token === undefined) throw new TypeError(`Missing Theme Token ${name}`);
  const hue = option.kind === "hue" ? option.hue : authoredAccentHue;
  let value = token[mode].replaceAll(
    "var(--discern-accent-hue)",
    String(hue),
  );
  for (const [primitive, authored] of neutralHuePrimitives) {
    value = value.replaceAll(`var(${primitive})`, authored);
  }
  return parseOklch(value);
}

function optionFailures(option: CatalogueAppearanceOption): readonly string[] {
  const failures: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const canvasColor = tokenColor(option, "--discern-color-canvas", mode);
    if (canvasColor.alpha !== 1) {
      failures.push(`${mode} canvas must be opaque`);
    }
    const canvas: Oklab = {
      l: canvasColor.l,
      a: canvasColor.a,
      b: canvasColor.b,
    };
    const resolve = (name: `--discern-${string}`): Oklab =>
      over(tokenColor(option, name, mode), canvas);

    for (const [name, floor] of inkContrastFloors) {
      const ratio = contrast(resolve(name), canvas);
      if (ratio < floor) {
        failures.push(`${mode} ${name} on canvas ${ratio.toFixed(2)}:1`);
      }
    }

    const inverseSurface = resolve("--discern-color-inverse-surface");
    const inverseInk = over(
      tokenColor(option, "--discern-color-inverse-ink", mode),
      inverseSurface,
    );
    const inverseRatio = contrast(inverseInk, inverseSurface);
    if (inverseRatio < 4.5) {
      failures.push(`${mode} inverse ink ${inverseRatio.toFixed(2)}:1`);
    }

    const soft = resolve("--discern-color-accent-100");
    for (const ink of ["700", "800"] as const) {
      const ratio = contrast(
        over(tokenColor(option, `--discern-color-accent-${ink}`, mode), soft),
        soft,
      );
      if (ratio < 4.5) {
        failures.push(`${mode} accent-${ink} text ${ratio.toFixed(2)}:1`);
      }
    }

    for (const role of ["accent", ...semanticRoles] as const) {
      const surface = role === "accent"
        ? soft
        : resolve(`--discern-color-${role}-soft`);
      const ratio = contrast(
        over(tokenColor(option, "--discern-color-accent-500", mode), surface),
        surface,
      );
      if (ratio < 3) {
        failures.push(`${mode} focus on ${role} ${ratio.toFixed(2)}:1`);
      }
    }

    const accent = resolve("--discern-color-accent-600");
    const semantic = semanticRoles.map((role) =>
      [role, resolve(`--discern-color-${role}`)] as const
    );
    for (const [role, value] of semantic) {
      const separation = distance(accent, value);
      if (separation < semanticDistanceFloor) {
        failures.push(
          `${mode} accent collides with ${role} (${
            separation.toFixed(3)
          } OKLab)`,
        );
      }
    }
    for (const [index, [firstRole, firstValue]] of semantic.entries()) {
      for (const [secondRole, secondValue] of semantic.slice(index + 1)) {
        const separation = distance(firstValue, secondValue);
        if (separation < semanticDistanceFloor) {
          failures.push(
            `${mode} ${firstRole} collides with ${secondRole} (${
              separation.toFixed(3)
            } OKLab)`,
          );
        }
      }
    }

    const series = seriesSteps.map((step) =>
      [step, resolve(`--discern-color-series-${step}`)] as const
    );
    for (const [step, value] of series) {
      const ratio = contrast(value, canvas);
      if (ratio < seriesCanvasContrastFloor) {
        failures.push(
          `${mode} series-${step} vanishes on canvas ${ratio.toFixed(2)}:1`,
        );
      }
    }
    for (const [index, [firstStep, firstValue]] of series.entries()) {
      for (const [secondStep, secondValue] of series.slice(index + 1)) {
        const separation = distance(firstValue, secondValue);
        if (separation < seriesDistanceFloor) {
          failures.push(
            `${mode} series-${firstStep} collides with series-${secondStep} (${
              separation.toFixed(3)
            } OKLab)`,
          );
        }
      }
    }
  }
  return failures;
}

/** Evaluate one low-level hue against the complete project-facing promise. */
export function catalogueAppearanceHueFailures(hue: number): readonly string[] {
  if (!Number.isInteger(hue) || hue < 0 || hue > 360) {
    throw new TypeError(`Appearance has invalid hue ${hue}`);
  }
  return optionFailures({
    kind: "hue",
    id: `hue-${hue}`,
    label: `Hue ${hue}`,
    hue,
  });
}

/** Evaluate one Appearance option, hue- or preset-backed, against the same promise. */
export function catalogueAppearanceOptionFailures(
  option: CatalogueAppearanceOption,
): readonly string[] {
  return optionFailures(option);
}

/** Fail closed unless a complete project-facing option set is semantically safe. */
export function assertCatalogueAppearanceOptions(
  options: readonly CatalogueAppearanceOption[],
): void {
  const ids = new Set<string>();
  const hues = new Set<number>();
  let defaults = 0;
  for (const option of options) {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(option.id)) {
      throw new TypeError(
        `Appearance option has invalid id ${JSON.stringify(option.id)}`,
      );
    }
    if (ids.has(option.id)) {
      throw new TypeError(`Appearance repeats id ${option.id}`);
    }
    ids.add(option.id);
    if (option.kind === "hue") {
      if (!Number.isInteger(option.hue) || option.hue < 0 || option.hue > 360) {
        throw new TypeError(`${option.id} has invalid hue ${option.hue}`);
      }
      if (hues.has(option.hue)) {
        throw new TypeError(`Appearance repeats hue ${option.hue}`);
      }
      hues.add(option.hue);
    } else {
      if (option.overrides.length === 0) {
        throw new TypeError(`${option.id} overrides no Theme Tokens`);
      }
      for (const override of option.overrides) {
        if (
          themeTokens.every((candidate) => candidate.name !== override.name)
        ) {
          throw new TypeError(
            `${option.id} overrides unknown Theme Token ${override.name}`,
          );
        }
      }
    }
    if (option.default === true) defaults += 1;
    const failures = optionFailures(option);
    if (failures.length > 0) {
      throw new TypeError(
        `${option.id} is not semantically safe: ${failures.join("; ")}`,
      );
    }
  }
  if (options.length === 0) {
    throw new TypeError("Appearance needs at least one option");
  }
  if (defaults !== 1) {
    throw new TypeError(
      `Appearance needs exactly one default option, received ${defaults}`,
    );
  }
}

const authoredCatalogueAppearanceOptions: readonly CatalogueAppearanceOption[] =
  [
    { kind: "hue", id: "red", label: "Red", hue: 2 },
    { kind: "hue", id: "green", label: "Green", hue: 120 },
    { kind: "hue", id: "sky", label: "Sky", hue: 235 },
    { kind: "hue", id: "azure", label: "Azure", hue: 245 },
    { kind: "hue", id: "blue", label: "Blue", hue: 255, default: true },
    { kind: "hue", id: "indigo", label: "Indigo", hue: 270 },
    { kind: "hue", id: "purple", label: "Purple", hue: 285 },
    { kind: "hue", id: "violet", label: "Violet", hue: 300 },
    { kind: "hue", id: "magenta", label: "Magenta", hue: 315 },
    { kind: "hue", id: "fuchsia", label: "Fuchsia", hue: 325 },
    { kind: "hue", id: "rose", label: "Rose", hue: 335 },
    { kind: "hue", id: "crimson", label: "Crimson", hue: 350 },
  ];

assertCatalogueAppearanceOptions(authoredCatalogueAppearanceOptions);

/** The exhaustive, semantically proven Appearance choices used by Catalogue tools. */
export const catalogueAppearanceOptions = Object.freeze(
  authoredCatalogueAppearanceOptions,
);

/** The default project Appearance, matching the authored public Token value. */
export const defaultCatalogueAppearanceOption = catalogueAppearanceOptions.find(
  (option) => option.default === true,
)!;

/** Resolve a stable option id or an exact legacy hue; arbitrary values are not choices. */
export function catalogueAppearanceOption(
  value: string | number | null,
): CatalogueAppearanceOption | undefined {
  if (value === null || String(value).trim() === "") return undefined;
  const normalised = String(value).trim();
  return catalogueAppearanceOptions.find((option) =>
    option.id === normalised ||
    (option.kind === "hue" && String(option.hue) === normalised)
  );
}

/** Public custom-property assignments that apply one Appearance option. */
export function catalogueAppearanceStyle(
  option: CatalogueAppearanceOption,
  mode: ThemeMode,
): Readonly<Record<`--discern-${string}`, string>> {
  if (option.kind === "hue") {
    return { "--discern-accent-hue": String(option.hue) };
  }
  return Object.fromEntries(
    option.overrides.map((token) => [token.name, token[mode]]),
  ) as Record<`--discern-${string}`, string>;
}
