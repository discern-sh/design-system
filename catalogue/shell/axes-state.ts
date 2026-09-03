import type { CSSProperties } from "react";
import {
  activePigmentTints,
  APPEARANCE_POLARITY_CROSSOVER_DARKNESS,
  type AppearanceAxes,
  appearanceAxes,
  type AppearanceAxisName,
  appearanceAxisNames,
  appearancePolarityExpression,
  defaultAppearance,
  evaluateAppearanceExpression,
  normalizeAccentHue,
  primaryAppearanceAxisNames,
} from "../../src/tokens/appearance.ts";
import { appearanceAxisCustomPropertyName } from "../../src/tokens/appearance-live-css.ts";

/** Complete, portable Catalogue axis coordinates. */
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
  return appearanceAxisNames.every((axis) =>
    boundedAxis(axis, candidate[axis] ?? Number.NaN)
  );
}

/** Canonical number rendering shared by links, labels, and consumer snippets. */
export function formatCatalogueAxisNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Whether either pigment currently carries a tint. */
export function catalogueAxesAreTinted(
  selection: CatalogueAxesSelection,
): boolean {
  return Object.keys(activePigmentTints(selection)).length > 0;
}

/**
 * Stable URL/storage representation used by every Catalogue surface: the four
 * primary axes, followed by the four tint axes only when a tint is in use.
 */
export function serializeCatalogueAxes(
  selection: CatalogueAxesSelection,
): string {
  const axes = catalogueAxesAreTinted(selection)
    ? appearanceAxisNames
    : primaryAppearanceAxisNames;
  return axes.map((axis) => formatCatalogueAxisNumber(selection[axis])).join(
    ",",
  );
}

export interface ParsedCatalogueAxes {
  readonly field: CatalogueAxesSelection;
  readonly legacyPreset?: "mono" | "blue";
}

/** Parse canonical primary or tinted points and the former mono/blue suffix. */
export function parseCatalogueAxesValue(
  value: string | null,
): ParsedCatalogueAxes | undefined {
  if (value === null) return undefined;
  const parts = value.split(",");
  const last = parts[parts.length - 1];
  const legacyPreset = parts.length === primaryAppearanceAxisNames.length + 1 &&
      (last === "mono" || last === "blue")
    ? last
    : undefined;
  const numbers = legacyPreset === undefined ? parts : parts.slice(0, -1);
  const axes = numbers.length === primaryAppearanceAxisNames.length
    ? primaryAppearanceAxisNames
    : numbers.length === appearanceAxisNames.length
    ? appearanceAxisNames
    : undefined;
  if (axes === undefined) return undefined;
  const field = {
    ...defaultAppearance,
    ...Object.fromEntries(
      axes.map((axis, index) => [axis, Number(numbers[index])]),
    ),
  };
  if (!isCatalogueAxesSelection(field)) return undefined;
  return {
    field,
    ...(legacyPreset === undefined ? {} : { legacyPreset }),
  };
}

/** Parse a complete bounded point; partial values fail closed. */
export function parseCatalogueAxes(
  value: string | null,
): CatalogueAxesSelection | undefined {
  return parseCatalogueAxesValue(value)?.field;
}

/** Exact polarity owned by the appearance graph; this authority has no hysteresis. */
export function catalogueAxesPolarity(
  point: AppearanceAxes,
): "light" | "dark" {
  return evaluateAppearanceExpression(appearancePolarityExpression, point) ===
      1
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
    ...Object.fromEntries(
      appearanceAxisNames.map((axis) => [
        appearanceAxisCustomPropertyName(axis),
        selection[axis],
      ]),
    ),
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
  const primary = `D ${formatCatalogueAxisNumber(selection.darkness)} · S ${
    formatCatalogueAxisNumber(selection.structure)
  } · E ${formatCatalogueAxisNumber(selection.emphasis)} · ρ ${
    formatCatalogueAxisNumber(selection.density)
  }`;
  return catalogueAxesAreTinted(selection) ? `${primary} · tinted` : primary;
}

const nonDarknessAxes = appearanceAxisNames.filter((axis) =>
  axis !== "darkness"
);

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
