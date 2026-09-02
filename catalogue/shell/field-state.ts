import type { CSSProperties } from "react";
import {
  defaultFieldPoint,
  evaluateFieldExpression,
  FIELD_POLARITY_CROSSOVER_DARKNESS,
  fieldAxes,
  type FieldAxisName,
  type FieldPoint,
  fieldPolarityExpression,
  normalizeAccentHue,
} from "../../src/tokens/field.ts";

/** Complete, portable Catalogue field point. */
export type CatalogueFieldSelection = FieldPoint;

export const defaultCatalogueFieldSelection: CatalogueFieldSelection = Object
  .freeze({ ...defaultFieldPoint });

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
  return (Object.keys(fieldAxes) as FieldAxisName[]).every((axis) =>
    boundedAxis(axis, candidate[axis] ?? Number.NaN)
  );
}

/** Canonical number rendering shared by links, labels, and consumer snippets. */
export function formatCatalogueFieldNumber(value: number): string {
  return String(Number(value.toFixed(4)));
}

/** Stable four-axis URL/storage representation used by every Catalogue surface. */
export function serializeCatalogueFieldSelection(
  selection: CatalogueFieldSelection,
): string {
  return (Object.keys(fieldAxes) as FieldAxisName[]).map((axis) =>
    formatCatalogueFieldNumber(selection[axis])
  ).join(",");
}

export interface ParsedCatalogueFieldSelection {
  readonly field: CatalogueFieldSelection;
  readonly legacyPreset?: "mono" | "blue";
}

/** Parse canonical points and the former mono/blue suffix for migration. */
export function parseCatalogueFieldSelectionValue(
  value: string | null,
): ParsedCatalogueFieldSelection | undefined {
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
  if (!isCatalogueFieldSelection(field)) return undefined;
  return {
    field,
    ...(preset === undefined ? {} : { legacyPreset: preset }),
  };
}

/** Parse a complete bounded field point; partial values fail closed. */
export function parseCatalogueFieldSelection(
  value: string | null,
): CatalogueFieldSelection | undefined {
  return parseCatalogueFieldSelectionValue(value)?.field;
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

/** Axis and hue declarations for a root; public Appearance scopes own roles. */
export function catalogueFieldStyle(
  selection: CatalogueFieldSelection,
  scheme = catalogueFieldPolarity(selection),
  accentHue = 255,
): CSSProperties {
  return {
    "--discern-darkness": selection.darkness,
    "--discern-structure": selection.structure,
    "--discern-emphasis": selection.emphasis,
    "--discern-density": selection.density,
    "--discern-accent-hue": normalizeAccentHue(accentHue),
    colorScheme: scheme,
  } as CSSProperties;
}

/** Compact human label used by summaries and review evidence. */
export function catalogueFieldLabel(
  selection: CatalogueFieldSelection,
): string {
  return `D ${formatCatalogueFieldNumber(selection.darkness)} · S ${
    formatCatalogueFieldNumber(selection.structure)
  } · E ${formatCatalogueFieldNumber(selection.emphasis)} · ρ ${
    formatCatalogueFieldNumber(selection.density)
  }`;
}
