import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import type {
  TerminalAppearance,
  TerminalThemeVariant,
} from "../src/cli/theme.ts";
import { normalizeAccentHue } from "../src/tokens/appearance.ts";

/** Resolve the Catalogue control to the concrete terminal palette it implies. */
export function resolveCatalogueTerminalTheme(
  mode: ThemeSwitcherMode,
  systemPrefersDark: boolean,
): TerminalThemeVariant {
  return mode === "system" ? systemPrefersDark ? "dark" : "light" : mode;
}

/** Fully resolved public terminal input transported through the Catalogue. */
export interface CatalogueTerminalPresentation {
  readonly theme: TerminalThemeVariant;
  readonly appearance: TerminalAppearance;
}

/** Catalogue fallback matching the public terminal's monochrome default. */
export const defaultCatalogueTerminalPresentation:
  CatalogueTerminalPresentation = Object.freeze({
    theme: "dark",
    appearance: {},
  });

/** Translate orthogonal Catalogue state into the public terminal contract. */
export function resolveCatalogueTerminalPresentation(
  theme: TerminalThemeVariant,
  accent: number | undefined,
): CatalogueTerminalPresentation {
  return Object.freeze({
    theme,
    appearance: accent === undefined
      ? {}
      : { accent: normalizeAccentHue(accent) },
  });
}
