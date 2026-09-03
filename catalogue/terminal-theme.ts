import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import type {
  TerminalAppearance,
  TerminalThemeVariant,
} from "../src/cli/theme.ts";
import {
  activePigmentTints,
  type AppearanceAxes,
  normalizeAccentHue,
  type PigmentTintAxisName,
} from "../src/tokens/appearance.ts";

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

/**
 * Translate orthogonal Catalogue state into the public terminal contract. The
 * ground is the resolved pole; the accent and any non-default tints travel as
 * the explicit appearance so a monochrome, untinted state stays `{}`.
 */
export function resolveCatalogueTerminalPresentation(
  theme: TerminalThemeVariant,
  accent: number | undefined,
  axes?: Partial<Pick<AppearanceAxes, PigmentTintAxisName>>,
): CatalogueTerminalPresentation {
  return Object.freeze({
    theme,
    appearance: {
      ...(accent === undefined ? {} : { accent: normalizeAccentHue(accent) }),
      ...activePigmentTints(axes ?? {}),
    },
  });
}
