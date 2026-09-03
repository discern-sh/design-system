import type { CSSProperties } from "react";
import {
  DEFAULT_ACCENT_HUE,
  normalizeAccentHue,
} from "../../src/tokens/field.ts";

/** One human shortcut into the package's complete numeric Accent hue domain. */
export interface CatalogueAppearanceOption {
  readonly id: string;
  readonly label: string;
  readonly hue: number;
}

const authoredCatalogueAppearanceOptions = [
  { id: "red", label: "Red", hue: 2 },
  { id: "green", label: "Green", hue: 120 },
  { id: "sky", label: "Sky", hue: 235 },
  { id: "azure", label: "Azure", hue: 245 },
  { id: "blue", label: "Blue", hue: DEFAULT_ACCENT_HUE },
  { id: "indigo", label: "Indigo", hue: 270 },
  { id: "purple", label: "Purple", hue: 285 },
  { id: "violet", label: "Violet", hue: 300 },
  { id: "magenta", label: "Magenta", hue: 315 },
  { id: "fuchsia", label: "Fuchsia", hue: 325 },
  { id: "rose", label: "Rose", hue: 335 },
  { id: "crimson", label: "Crimson", hue: 350 },
] as const satisfies readonly CatalogueAppearanceOption[];

/** Named conveniences; they never constrain free numeric hue entry. */
export const catalogueAppearanceOptions: readonly CatalogueAppearanceOption[] =
  Object.freeze(authoredCatalogueAppearanceOptions);

/** Blue is the remembered Accent convenience at the default Field point. */
export const defaultCatalogueAppearanceOption = catalogueAppearanceOptions.find(
  ({ hue }) => hue === DEFAULT_ACCENT_HUE,
)!;

/** Resolve a named convenience or any finite public hue from 0 through 360. */
export function catalogueAccentHue(
  value: string | number | null,
): number | undefined {
  if (value === null || String(value).trim() === "") return undefined;
  const normalised = String(value).trim().toLowerCase();
  const named = catalogueAppearanceOptions.find(({ id }) => id === normalised);
  if (named !== undefined) return named.hue;
  const numeric = Number(normalised);
  try {
    return normalizeAccentHue(numeric);
  } catch {
    return undefined;
  }
}

/** Resolve a named convenience by id or exact circular hue. */
export function catalogueAppearanceOption(
  value: string | number | null,
): CatalogueAppearanceOption | undefined {
  const hue = catalogueAccentHue(value);
  if (hue === undefined) return undefined;
  const input = String(value).trim().toLowerCase();
  return catalogueAppearanceOptions.find((option) =>
    option.id === input || option.hue === hue
  );
}

/** Concise numeric label, augmented by a name only when one is authored. */
export function catalogueAccentHueLabel(hue: number): string {
  const normalised = normalizeAccentHue(hue);
  const named = catalogueAppearanceOptions.find((option) =>
    option.hue === normalised
  );
  return named === undefined
    ? `Hue ${String(normalised)}`
    : `${named.label} ${String(normalised)}`;
}

/** The only Catalogue-owned Accent declaration; public scopes own every role. */
export function catalogueAppearanceStyle(
  option: CatalogueAppearanceOption | number,
): CSSProperties {
  const hue = typeof option === "number" ? option : option.hue;
  return { "--discern-accent-hue": normalizeAccentHue(hue) } as CSSProperties;
}
