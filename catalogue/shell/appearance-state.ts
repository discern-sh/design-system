import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";

export const catalogueAppearanceParameters = ["theme", "accent"] as const;

export function catalogueTheme(
  value: string | null,
): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

export function catalogueAccent(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const accent = Number(value);
  return Number.isFinite(accent) && accent >= 0 && accent <= 360
    ? Math.round(accent)
    : undefined;
}

/** Carry valid explicit Appearance state through one local URL transition. */
export function preserveCatalogueAppearanceHref(
  current: URL,
  href: string,
): string {
  const target = new URL(href, current);
  const theme = catalogueTheme(current.searchParams.get("theme"));
  const accent = catalogueAccent(current.searchParams.get("accent"));
  if (!target.searchParams.has("theme") && theme !== undefined) {
    target.searchParams.set("theme", theme);
  }
  if (!target.searchParams.has("accent") && accent !== undefined) {
    target.searchParams.set("accent", String(accent));
  }
  return target.origin === current.origin
    ? target.pathname + target.search + target.hash
    : target.href;
}
