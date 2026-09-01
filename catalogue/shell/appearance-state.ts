import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { catalogueAppearanceOption } from "./appearance-options.ts";

export const catalogueAppearanceParameters = ["theme", "accent"] as const;

export function catalogueTheme(
  value: string | null,
): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

/** Carry valid explicit Appearance state through one local URL transition. */
export function preserveCatalogueAppearanceHref(
  current: URL,
  href: string,
): string {
  const target = new URL(href, current);
  const theme = catalogueTheme(current.searchParams.get("theme"));
  const accent = catalogueAppearanceOption(current.searchParams.get("accent"));
  if (!target.searchParams.has("theme") && theme !== undefined) {
    target.searchParams.set("theme", theme);
  }
  if (!target.searchParams.has("accent") && accent !== undefined) {
    target.searchParams.set("accent", accent.id);
  }
  return target.origin === current.origin
    ? target.pathname + target.search + target.hash
    : target.href;
}
