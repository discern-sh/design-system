import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import type {
  TerminalThemeOptions,
  TerminalThemeVariant,
} from "../src/cli/theme.ts";
import {
  accentAppearance,
  type AppearanceName,
  fieldAppearance,
} from "../src/tokens/field.ts";

/** Resolve the Catalogue control to the concrete terminal palette it implies. */
export function resolveCatalogueTerminalTheme(
  mode: ThemeSwitcherMode,
  systemPrefersDark: boolean,
): TerminalThemeVariant {
  return mode === "system" ? systemPrefersDark ? "dark" : "light" : mode;
}

/** Fully resolved public terminal input transported through the Catalogue. */
export type CatalogueTerminalPresentation = Readonly<
  Required<TerminalThemeOptions>
>;

/** Catalogue fallback matching the public terminal's monochrome default. */
export const defaultCatalogueTerminalPresentation:
  CatalogueTerminalPresentation = Object.freeze({
    theme: "dark",
    appearance: fieldAppearance,
  });

/** Translate orthogonal Catalogue state into the public terminal contract. */
export function resolveCatalogueTerminalPresentation(
  theme: TerminalThemeVariant,
  appearance: AppearanceName,
  accentHue: number,
): CatalogueTerminalPresentation {
  return Object.freeze({
    theme,
    appearance: appearance === "field"
      ? fieldAppearance
      : accentAppearance(accentHue),
  });
}
