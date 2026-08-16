import { useEffect, useState } from "react";
import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import type { TerminalThemeVariant } from "../src/cli/theme.ts";

const darkThemeQuery = "(prefers-color-scheme: dark)";

/** Resolve the Catalogue control to the concrete terminal palette it implies. */
export function resolveCatalogueTerminalTheme(
  mode: ThemeSwitcherMode,
  systemPrefersDark: boolean,
): TerminalThemeVariant {
  return mode === "system" ? systemPrefersDark ? "dark" : "light" : mode;
}

/** Keep terminal specimens aligned with the Catalogue's resolved colour theme. */
export function useCatalogueTerminalTheme(
  mode: ThemeSwitcherMode,
): TerminalThemeVariant {
  const [systemPrefersDark, setSystemPrefersDark] = useState(() =>
    globalThis.matchMedia(darkThemeQuery).matches
  );

  useEffect(() => {
    const query = globalThis.matchMedia(darkThemeQuery);
    const synchronise = (): void => setSystemPrefersDark(query.matches);
    synchronise();
    query.addEventListener("change", synchronise);
    return () => query.removeEventListener("change", synchronise);
  }, []);

  return resolveCatalogueTerminalTheme(mode, systemPrefersDark);
}
