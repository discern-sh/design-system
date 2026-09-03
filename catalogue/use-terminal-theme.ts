import { useEffect, useState } from "react";
import type { ThemeSwitcherMode } from "../src/components/core/theme-switcher/theme-switcher.tsx";
import { resolveCatalogueTerminalTheme } from "./terminal-theme.ts";

const darkThemeQuery = "(prefers-color-scheme: dark)";

/** Keep terminal specimens aligned with the Catalogue's resolved colour theme. */
export function useCatalogueTerminalTheme(
  mode: ThemeSwitcherMode,
): ReturnType<typeof resolveCatalogueTerminalTheme> {
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
