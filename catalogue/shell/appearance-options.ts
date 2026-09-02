import {
  compositeOklab,
  type OklabColor,
  oklabContrast,
  oklabDistance,
} from "../../src/internal/oklch.ts";
import { resolveChartPaletteAtField } from "../../src/chart/palette.ts";
import { blueThemeRoleTokens, blueThemeTokens } from "../../src/theme/blue.ts";
import {
  evaluateField,
  FIELD_CONTRAST_SAMPLE_DARKNESSES,
  FIELD_INK_CONTRAST_FLOORS,
  type ThemeToken,
  themeTokens,
} from "../../src/tokens/tokens.ts";

interface CatalogueAppearanceOptionBase {
  readonly id: string;
  readonly label: string;
  readonly default?: true;
}

/** The package's achromatic field with no preset overrides. */
export interface CatalogueFieldAppearanceOption
  extends CatalogueAppearanceOptionBase {
  readonly kind: "field";
}

/** Appearance choice backed by the blue preset at one accent hue. */
export interface CatalogueHueAppearanceOption
  extends CatalogueAppearanceOptionBase {
  readonly kind: "hue";
  readonly hue: number;
}

/** Appearance choice backed by public role-token overrides over the field. */
export interface CataloguePresetAppearanceOption
  extends CatalogueAppearanceOptionBase {
  readonly kind: "preset";
  readonly overrides: readonly ThemeToken[];
}

/** One project-facing Appearance choice: field, blue-family hue, or role preset. */
export type CatalogueAppearanceOption =
  | CatalogueFieldAppearanceOption
  | CatalogueHueAppearanceOption
  | CataloguePresetAppearanceOption;

type ThemeMode = "light" | "dark";

interface ProofColor {
  readonly color: OklabColor;
  readonly alpha: number;
}

interface ProofSample {
  readonly label: string;
  readonly field: boolean;
  readonly color: (name: `--discern-${string}`) => ProofColor;
}

const semanticRoles = ["success", "warning", "danger"] as const;
const semanticDistanceFloor = 0.08;
const seriesSteps = [1, 2, 3, 4, 5, 6] as const;
const seriesDistanceFloor = 0.09;
const seriesCanvasContrastFloor = 1.25;

const accentHuePrimitive = blueThemeTokens.find((token) =>
  token.name === "--discern-accent-hue"
);
if (accentHuePrimitive === undefined) {
  throw new TypeError("Missing the blue preset accent hue primitive");
}
const authoredAccentHue = Number(accentHuePrimitive.value);

function parseOklch(value: string): ProofColor {
  const match = value.match(
    /^oklch\(([\d.]+)%\s+([\d.]+)\s+(-?[\d.]+)(?:\s*\/\s*([\d.]+))?\)$/,
  );
  if (match === null) {
    throw new TypeError(`Expected concrete oklch(), got ${value}`);
  }
  const lightness = Number(match[1]) / 100;
  const chroma = Number(match[2]);
  const radians = Number(match[3]) * Math.PI / 180;
  const alpha = match[4] === undefined ? 1 : Number(match[4]);
  if (!(alpha >= 0 && alpha <= 1)) {
    throw new TypeError(`Alpha outside [0, 1] in ${value}`);
  }
  return {
    color: {
      lightness,
      a: chroma * Math.cos(radians),
      b: chroma * Math.sin(radians),
    },
    alpha,
  };
}

function over(color: ProofColor, backdrop: OklabColor): OklabColor {
  return compositeOklab(color.color, color.alpha, backdrop);
}

function themeToken(name: `--discern-${string}`): ThemeToken {
  const token = themeTokens.find((candidate) => candidate.name === name);
  if (token === undefined) throw new TypeError(`Missing Theme Token ${name}`);
  return token;
}

function seriesMode(field: Readonly<Record<string, string>>): ThemeMode {
  return field["--discern-color-action"]?.startsWith("oklch(0%")
    ? "light"
    : "dark";
}

function fieldColor(
  darkness: number,
  name: `--discern-${string}`,
): ProofColor {
  const field = evaluateField({ darkness });
  const value = field[name as keyof typeof field];
  if (value !== undefined) return parseOklch(value);
  const series = name.match(/^--discern-color-series-([1-6])$/)?.[1];
  if (series !== undefined) {
    return parseOklch(
      resolveChartPaletteAtField(darkness)[
        `series-${series}` as keyof ReturnType<
          typeof resolveChartPaletteAtField
        >
      ],
    );
  }
  const token = themeToken(name);
  return parseOklch(token[seriesMode(field)]);
}

function poleColor(
  option: Exclude<CatalogueAppearanceOption, CatalogueFieldAppearanceOption>,
  name: `--discern-${string}`,
  mode: ThemeMode,
): ProofColor {
  const darkness = mode === "light" ? 0 : 1;
  const field = evaluateField({ darkness });
  const override = option.kind === "preset"
    ? option.overrides.find((candidate) => candidate.name === name)
    : blueThemeRoleTokens.find((candidate) => candidate.name === name);
  const tokenValue = override?.[mode] ??
    field[name as keyof typeof field] ?? themeToken(name)[mode];
  const hue = option.kind === "hue" ? option.hue : authoredAccentHue;
  return parseOklch(
    tokenValue.replaceAll("var(--discern-accent-hue)", String(hue)),
  );
}

function optionSamples(
  option: CatalogueAppearanceOption,
): readonly ProofSample[] {
  if (option.kind === "field") {
    return FIELD_CONTRAST_SAMPLE_DARKNESSES.map((darkness) => ({
      label: `field ${darkness}`,
      field: true,
      color: (name) => fieldColor(darkness, name),
    }));
  }
  return (["light", "dark"] as const).map((mode) => ({
    label: mode,
    field: false,
    color: (name) => poleColor(option, name, mode),
  }));
}

function optionFailures(option: CatalogueAppearanceOption): readonly string[] {
  const failures: string[] = [];
  for (const sample of optionSamples(option)) {
    const canvasColor = sample.color("--discern-color-canvas");
    if (canvasColor.alpha !== 1) {
      failures.push(`${sample.label} canvas must be opaque`);
    }
    const canvas = canvasColor.color;
    const resolve = (name: `--discern-${string}`): OklabColor =>
      over(sample.color(name), canvas);

    const maximumInkContrast = sample.field
      ? oklabContrast(resolve("--discern-color-action"), canvas)
      : Number.POSITIVE_INFINITY;
    for (const [name, authoredFloor] of FIELD_INK_CONTRAST_FLOORS) {
      const floor = Math.min(authoredFloor, maximumInkContrast);
      const ratio = oklabContrast(resolve(name), canvas);
      if (ratio < floor) {
        failures.push(
          `${sample.label} ${name} on canvas ${ratio.toFixed(2)}:1`,
        );
      }
    }

    for (
      const [name, label] of [
        ["--discern-color-surface", "raised"],
        ["--discern-color-inverse-surface", "inverse"],
      ] as const
    ) {
      if (sample.color(name).alpha !== 1) {
        failures.push(`${sample.label} ${label} surface must be opaque`);
      }
    }
    const inverseSurface = resolve("--discern-color-inverse-surface");
    const inverseInk = over(
      sample.color("--discern-color-inverse-ink"),
      inverseSurface,
    );
    const inverseRatio = oklabContrast(inverseInk, inverseSurface);
    if (inverseRatio < 4.5) {
      failures.push(
        `${sample.label} inverse ink ${inverseRatio.toFixed(2)}:1`,
      );
    }

    const action = resolve("--discern-color-action");
    const onAction = over(sample.color("--discern-color-on-action"), action);
    const actionRatio = oklabContrast(onAction, action);
    if (actionRatio < 4.5) {
      failures.push(
        `${sample.label} action pair ${actionRatio.toFixed(2)}:1`,
      );
    }

    const soft = resolve("--discern-color-accent-100");
    for (const ink of ["700", "800"] as const) {
      const ratio = oklabContrast(
        over(sample.color(`--discern-color-accent-${ink}`), soft),
        soft,
      );
      if (ratio < 4.5) {
        failures.push(
          `${sample.label} accent-${ink} text ${ratio.toFixed(2)}:1`,
        );
      }
    }

    for (const role of ["accent", ...semanticRoles] as const) {
      const roleSurface = role === "accent"
        ? soft
        : resolve(`--discern-color-${role}-soft`);
      const ratio = oklabContrast(
        over(sample.color("--discern-color-accent-500"), roleSurface),
        roleSurface,
      );
      if (ratio < 3) {
        failures.push(
          `${sample.label} focus on ${role} ${ratio.toFixed(2)}:1`,
        );
      }
    }

    const accent = resolve("--discern-color-accent-600");
    const semantic = semanticRoles.map((role) =>
      [role, resolve(`--discern-color-${role}`)] as const
    );
    for (const [role, value] of semantic) {
      const separation = oklabDistance(accent, value);
      if (separation < semanticDistanceFloor) {
        failures.push(
          `${sample.label} accent collides with ${role} (${
            separation.toFixed(3)
          } OKLab)`,
        );
      }
    }
    for (const [index, [firstRole, firstValue]] of semantic.entries()) {
      for (const [secondRole, secondValue] of semantic.slice(index + 1)) {
        const separation = oklabDistance(firstValue, secondValue);
        if (separation < semanticDistanceFloor) {
          failures.push(
            `${sample.label} ${firstRole} collides with ${secondRole} (${
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
      const ratio = oklabContrast(value, canvas);
      if (ratio < seriesCanvasContrastFloor) {
        failures.push(
          `${sample.label} series-${step} vanishes on canvas ${
            ratio.toFixed(2)
          }:1`,
        );
      }
    }
    for (const [index, [firstStep, firstValue]] of series.entries()) {
      for (const [secondStep, secondValue] of series.slice(index + 1)) {
        const separation = oklabDistance(firstValue, secondValue);
        if (separation < seriesDistanceFloor) {
          failures.push(
            `${sample.label} series-${firstStep} collides with series-${secondStep} (${
              separation.toFixed(3)
            } OKLab)`,
          );
        }
      }
    }
  }
  return failures;
}

/** Evaluate one blue-family hue against the complete project-facing promise. */
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

/** Evaluate the default field at every signed-off darkness sample. */
export function catalogueFieldFailures(): readonly string[] {
  return optionFailures({ kind: "field", id: "field", label: "Field" });
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
    } else if (option.kind === "preset") {
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
    { kind: "field", id: "field", label: "Field", default: true },
    { kind: "hue", id: "red", label: "Red", hue: 2 },
    { kind: "hue", id: "green", label: "Green", hue: 120 },
    { kind: "hue", id: "sky", label: "Sky", hue: 235 },
    { kind: "hue", id: "azure", label: "Azure", hue: 245 },
    { kind: "hue", id: "blue", label: "Blue", hue: 255 },
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

/** The default project Appearance: the achromatic field with no preset. */
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
  if (option.kind === "field") return {};
  if (option.kind === "hue") {
    return Object.fromEntries([
      ["--discern-accent-hue", String(option.hue)],
      ...blueThemeRoleTokens.map((token) => [token.name, token[mode]] as const),
    ]) as Record<`--discern-${string}`, string>;
  }
  return Object.fromEntries(
    option.overrides.map((token) => [token.name, token[mode]]),
  ) as Record<`--discern-${string}`, string>;
}
