import type { CSSProperties } from "react";
import {
  APPEARANCE_POLARITY_CROSSOVER_DARKNESS,
  type AppearanceAxes,
  appearanceAxes,
  type AppearanceAxisName,
  appearancePolarityExpression,
  defaultAppearance,
  evaluateAppearanceExpression,
  normalizeAccentHue,
} from "../../src/tokens/appearance.ts";

/** Complete, portable Catalogue field point. */
export type CatalogueAxesSelection = AppearanceAxes;

export const defaultCatalogueAxesSelection: CatalogueAxesSelection = Object
  .freeze({ ...defaultAppearance });

/** Width of the live control's scheme hold around the exact token crossover. */
export const CATALOGUE_AXES_HYSTERESIS = 0.02;

function boundedAxis(axis: AppearanceAxisName, value: number): boolean {
  const definition = appearanceAxes[axis];
  return Number.isFinite(value) && value >= definition.minimum &&
    value <= definition.maximum;
}

/** Runtime guard for frame messages and other untyped Catalogue boundaries. */
export function isCatalogueAxesSelection(
  value: unknown,
): value is CatalogueAxesSelection {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CatalogueAxesSelection>;
  return (Object.keys(appearanceAxes) as AppearanceAxisName[]).every((axis) =>
    boundedAxis(axis, candidate[axis] ?? Number.NaN)
  );
}

/** Canonical number rendering shared by links, labels, and consumer snippets. */
export function formatCatalogueAxisNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Stable four-axis URL/storage representation used by every Catalogue surface. */
export function serializeCatalogueAxes(
  selection: CatalogueAxesSelection,
): string {
  return (Object.keys(appearanceAxes) as AppearanceAxisName[]).map((axis) =>
    formatCatalogueAxisNumber(selection[axis])
  ).join(",");
}

export interface ParsedCatalogueAxes {
  readonly field: CatalogueAxesSelection;
  readonly legacyPreset?: "mono" | "blue";
}

/** Parse canonical points and the former mono/blue suffix for migration. */
export function parseCatalogueAxesValue(
  value: string | null,
): ParsedCatalogueAxes | undefined {
  if (value === null) return undefined;
  const [darkness, structure, emphasis, density, preset, ...extra] = value
    .split(",");
  if (
    darkness === undefined || structure === undefined ||
    emphasis === undefined || density === undefined || extra.length > 0 ||
    !(preset === undefined || preset === "mono" || preset === "blue")
  ) return undefined;
  const field = {
    darkness: Number(darkness),
    structure: Number(structure),
    emphasis: Number(emphasis),
    density: Number(density),
  };
  if (!isCatalogueAxesSelection(field)) return undefined;
  return {
    field,
    ...(preset === undefined ? {} : { legacyPreset: preset }),
  };
}

/** Parse a complete bounded field point; partial values fail closed. */
export function parseCatalogueAxes(
  value: string | null,
): CatalogueAxesSelection | undefined {
  return parseCatalogueAxesValue(value)?.field;
}

/** Exact polarity owned by the token field; this authority has no hysteresis. */
export function catalogueAxesPolarity(
  point: AppearanceAxes,
): "light" | "dark" {
  return evaluateAppearanceExpression(appearancePolarityExpression, point) === 1
    ? "dark"
    : "light";
}

/**
 * Hold the browser scheme while a live drag remains within the crossover band.
 * A newly loaded point always uses the token model's exact polarity.
 */
export function catalogueAxesControlScheme(
  point: AppearanceAxes,
  previous?: "light" | "dark",
): "light" | "dark" {
  if (previous === undefined) return catalogueAxesPolarity(point);
  if (
    point.darkness <
      APPEARANCE_POLARITY_CROSSOVER_DARKNESS - CATALOGUE_AXES_HYSTERESIS
  ) return "light";
  if (
    point.darkness >
      APPEARANCE_POLARITY_CROSSOVER_DARKNESS + CATALOGUE_AXES_HYSTERESIS
  ) return "dark";
  return previous;
}

/** Axis and hue declarations for a root; public Appearance scopes own roles. */
export function catalogueAppearanceRootStyle(
  selection: CatalogueAxesSelection,
  scheme = catalogueAxesPolarity(selection),
  accent?: number,
): CSSProperties {
  return {
    "--discern-darkness": selection.darkness,
    "--discern-structure": selection.structure,
    "--discern-emphasis": selection.emphasis,
    "--discern-density": selection.density,
    ...(accent === undefined
      ? {}
      : { "--discern-accent-hue": normalizeAccentHue(accent) }),
    colorScheme: scheme,
  } as CSSProperties;
}

/** Compact human label used by summaries and review evidence. */
export function catalogueAxesLabel(
  selection: CatalogueAxesSelection,
): string {
  return `D ${formatCatalogueAxisNumber(selection.darkness)} · S ${
    formatCatalogueAxisNumber(selection.structure)
  } · E ${formatCatalogueAxisNumber(selection.emphasis)} · ρ ${
    formatCatalogueAxisNumber(selection.density)
  }`;
}

const nonDarknessAxes = (Object.keys(appearanceAxes) as AppearanceAxisName[])
  .filter((axis) => axis !== "darkness");

/** Whether every axis other than darkness sits at its package default. */
export function catalogueAxesAreDefault(
  selection: CatalogueAxesSelection,
): boolean {
  return nonDarknessAxes.every((axis) =>
    selection[axis] === defaultAppearance[axis]
  );
}

/** Return every axis other than darkness to its default; the pole stays. */
export function resetCatalogueAxes(
  selection: CatalogueAxesSelection,
): CatalogueAxesSelection {
  return {
    ...selection,
    ...Object.fromEntries(
      nonDarknessAxes.map((axis) => [axis, defaultAppearance[axis]]),
    ),
  };
}
