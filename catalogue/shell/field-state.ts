import type { CSSProperties } from "react";
import {
  defaultFieldPoint,
  evaluateFieldExpression,
  FIELD_POLARITY_CROSSOVER_DARKNESS,
  fieldAxes,
  type FieldAxisName,
  type FieldPoint,
  fieldPolarityExpression,
} from "../../src/tokens/field.ts";
import {
  catalogueAppearanceOption,
  catalogueAppearanceStyle,
} from "./appearance-options.ts";

/** Optional chromatic layer applied over one continuous field point. */
export type CatalogueFieldPreset = "mono" | "blue";

/** Complete, portable Catalogue field selection. */
export interface CatalogueFieldSelection extends FieldPoint {
  readonly preset: CatalogueFieldPreset;
}

export const defaultCatalogueFieldSelection: CatalogueFieldSelection = Object
  .freeze({ ...defaultFieldPoint, preset: "mono" });

/** Width of the live control's scheme hold around the exact token crossover. */
export const CATALOGUE_FIELD_HYSTERESIS = 0.02;

function boundedAxis(axis: FieldAxisName, value: number): boolean {
  const definition = fieldAxes[axis];
  return Number.isFinite(value) && value >= definition.minimum &&
    value <= definition.maximum;
}

/** Runtime guard for frame messages and other untyped Catalogue boundaries. */
export function isCatalogueFieldSelection(
  value: unknown,
): value is CatalogueFieldSelection {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Partial<CatalogueFieldSelection>;
  return (candidate.preset === "mono" || candidate.preset === "blue") &&
    (Object.keys(fieldAxes) as FieldAxisName[]).every((axis) =>
      boundedAxis(axis, candidate[axis] ?? Number.NaN)
    );
}

/** Canonical number rendering shared by links, labels, and consumer snippets. */
export function formatCatalogueFieldNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Stable URL/storage representation used by every Catalogue surface. */
export function serializeCatalogueFieldSelection(
  selection: CatalogueFieldSelection,
): string {
  return [
    formatCatalogueFieldNumber(selection.darkness),
    formatCatalogueFieldNumber(selection.structure),
    formatCatalogueFieldNumber(selection.emphasis),
    formatCatalogueFieldNumber(selection.density),
    selection.preset,
  ].join(",");
}

/** Parse a complete bounded field point; partial and invented values fail closed. */
export function parseCatalogueFieldSelection(
  value: string | null,
): CatalogueFieldSelection | undefined {
  if (value === null) return undefined;
  const [darkness, structure, emphasis, density, preset, ...extra] = value
    .split(",");
  if (
    darkness === undefined || structure === undefined ||
    emphasis === undefined || density === undefined ||
    (preset !== "mono" && preset !== "blue") || extra.length > 0
  ) return undefined;
  const point = {
    darkness: Number(darkness),
    structure: Number(structure),
    emphasis: Number(emphasis),
    density: Number(density),
  };
  return (Object.keys(fieldAxes) as FieldAxisName[]).every((axis) =>
      boundedAxis(axis, point[axis])
    )
    ? { ...point, preset }
    : undefined;
}

/** Exact polarity owned by the token field; this authority has no hysteresis. */
export function catalogueFieldPolarity(
  point: FieldPoint,
): "light" | "dark" {
  return evaluateFieldExpression(fieldPolarityExpression, point) === 1
    ? "dark"
    : "light";
}

/**
 * Hold the browser scheme while a live drag remains within the crossover band.
 * A newly loaded point always uses the token model's exact polarity.
 */
export function catalogueFieldControlScheme(
  point: FieldPoint,
  previous?: "light" | "dark",
): "light" | "dark" {
  if (previous === undefined) return catalogueFieldPolarity(point);
  if (
    point.darkness <
      FIELD_POLARITY_CROSSOVER_DARKNESS - CATALOGUE_FIELD_HYSTERESIS
  ) return "light";
  if (
    point.darkness >
      FIELD_POLARITY_CROSSOVER_DARKNESS + CATALOGUE_FIELD_HYSTERESIS
  ) return "dark";
  return previous;
}

/** Axis declarations, implied scheme, and optional preset for one real root. */
export function catalogueFieldStyle(
  selection: CatalogueFieldSelection,
  scheme = catalogueFieldPolarity(selection),
): CSSProperties {
  const blue = catalogueAppearanceOption("blue");
  return {
    "--discern-darkness": selection.darkness,
    "--discern-structure": selection.structure,
    "--discern-emphasis": selection.emphasis,
    "--discern-density": selection.density,
    colorScheme: scheme,
    ...(selection.preset === "blue" && blue !== undefined
      ? catalogueAppearanceStyle(blue, scheme)
      : {}),
  } as CSSProperties;
}

/** Compact human label used when the Appearance control carries a point. */
export function catalogueFieldLabel(
  selection: CatalogueFieldSelection,
): string {
  return `Field ${formatCatalogueFieldNumber(selection.darkness)} · ${
    formatCatalogueFieldNumber(selection.structure)
  } · ${formatCatalogueFieldNumber(selection.emphasis)} · ${
    formatCatalogueFieldNumber(selection.density)
  }${selection.preset === "blue" ? " · blue" : ""}`;
}
