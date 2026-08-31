import { themeTokens } from "../../src/tokens/tokens.ts";

/** One project-facing Appearance choice backed by the public hue primitive. */
export interface CatalogueAppearanceOption {
  readonly id: string;
  readonly label: string;
  readonly hue: number;
  readonly default?: true;
}

type ThemeMode = "light" | "dark";

interface Oklab {
  readonly l: number;
  readonly a: number;
  readonly b: number;
}

const semanticRoles = ["success", "warning", "danger"] as const;
const semanticDistanceFloor = 0.08;

function tokenValue(
  name: `--discern-${string}`,
  mode: ThemeMode,
  hue: number,
): string {
  const token = themeTokens.find((candidate) => candidate.name === name);
  if (token === undefined) throw new TypeError(`Missing Theme Token ${name}`);
  return token[mode].replaceAll("var(--discern-accent-hue)", String(hue));
}

function parseOklch(value: string): Oklab {
  const match = value.match(
    /^oklch\(([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)\)$/,
  );
  if (match === null) {
    throw new TypeError(`Expected concrete oklch(), got ${value}`);
  }
  const l = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const radians = Number(match[3]) * Math.PI / 180;
  return { l, a: chroma * Math.cos(radians), b: chroma * Math.sin(radians) };
}

function linearRgb(color: Oklab): readonly [number, number, number] {
  const lRoot = color.l + 0.3963377774 * color.a + 0.2158037573 * color.b;
  const mRoot = color.l - 0.1055613458 * color.a - 0.0638541728 * color.b;
  const sRoot = color.l - 0.0894841775 * color.a - 1.291485548 * color.b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
}

function luminance(value: string): number {
  const [red, green, blue] = linearRgb(parseOklch(value)).map((channel) =>
    Math.max(0, Math.min(1, channel))
  ) as [number, number, number];
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrast(first: string, second: string): number {
  const [lighter = 0, darker = 0] = [luminance(first), luminance(second)]
    .toSorted((left, right) => right - left);
  return (lighter + 0.05) / (darker + 0.05);
}

function distance(first: string, second: string): number {
  const left = parseOklch(first);
  const right = parseOklch(second);
  return Math.hypot(left.l - right.l, left.a - right.a, left.b - right.b);
}

function optionFailures(option: CatalogueAppearanceOption): readonly string[] {
  const failures: string[] = [];
  for (const mode of ["light", "dark"] as const) {
    const soft = tokenValue("--discern-color-accent-100", mode, option.hue);
    for (const ink of ["700", "800"] as const) {
      const ratio = contrast(
        tokenValue(`--discern-color-accent-${ink}`, mode, option.hue),
        soft,
      );
      if (ratio < 4.5) {
        failures.push(`${mode} accent-${ink} text ${ratio.toFixed(2)}:1`);
      }
    }

    const focus = tokenValue("--discern-color-accent-500", mode, option.hue);
    for (const role of ["accent", ...semanticRoles] as const) {
      const surface = tokenValue(
        role === "accent"
          ? "--discern-color-accent-100"
          : `--discern-color-${role}-soft`,
        mode,
        option.hue,
      );
      const ratio = contrast(focus, surface);
      if (ratio < 3) {
        failures.push(`${mode} focus on ${role} ${ratio.toFixed(2)}:1`);
      }
    }

    const accent = tokenValue("--discern-color-accent-600", mode, option.hue);
    for (const role of semanticRoles) {
      const separation = distance(
        accent,
        tokenValue(`--discern-color-${role}`, mode, option.hue),
      );
      if (separation < semanticDistanceFloor) {
        failures.push(
          `${mode} accent collides with ${role} (${
            separation.toFixed(3)
          } OKLab)`,
        );
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
  return optionFailures({ id: `hue-${hue}`, label: `Hue ${hue}`, hue });
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
    if (!Number.isInteger(option.hue) || option.hue < 0 || option.hue > 360) {
      throw new TypeError(`${option.id} has invalid hue ${option.hue}`);
    }
    if (hues.has(option.hue)) {
      throw new TypeError(`Appearance repeats hue ${option.hue}`);
    }
    ids.add(option.id);
    hues.add(option.hue);
    if (option.default === true) defaults += 1;
    const failures = catalogueAppearanceHueFailures(option.hue);
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
    { id: "red", label: "Red", hue: 2 },
    { id: "green", label: "Green", hue: 120 },
    { id: "sky", label: "Sky", hue: 235 },
    { id: "azure", label: "Azure", hue: 245 },
    { id: "blue", label: "Blue", hue: 255, default: true },
    { id: "indigo", label: "Indigo", hue: 270 },
    { id: "purple", label: "Purple", hue: 285 },
    { id: "violet", label: "Violet", hue: 300 },
    { id: "magenta", label: "Magenta", hue: 315 },
    { id: "fuchsia", label: "Fuchsia", hue: 325 },
    { id: "rose", label: "Rose", hue: 335 },
    { id: "crimson", label: "Crimson", hue: 350 },
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

/** Resolve a stable option id or its exact hue; arbitrary hues are not choices. */
export function catalogueAppearanceOption(
  value: string | number | null,
): CatalogueAppearanceOption | undefined {
  if (value === null || String(value).trim() === "") return undefined;
  const normalised = String(value).trim();
  return catalogueAppearanceOptions.find((option) =>
    option.id === normalised || String(option.hue) === normalised
  );
}
