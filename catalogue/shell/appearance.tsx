import { useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeToggle } from "../../src/components/core/theme-toggle/theme-toggle.tsx";
import { useCatalogueTerminalTheme } from "../terminal-theme.ts";
import {
  catalogueAppearanceOption,
  catalogueAppearanceOptions,
  defaultCatalogueAppearanceOption,
} from "./appearance-options.ts";
import { catalogueAccent, catalogueTheme } from "./appearance-state.ts";

const themeStorageKey = "discern-catalogue-theme";
const accentStorageKey = "discern-catalogue-accent-hue";
const defaultAccentHue = defaultCatalogueAppearanceOption.hue;

function updateCatalogueAppearanceUrl(
  theme: ThemeSwitcherMode,
  accentHue: number,
): void {
  const current = new URL(globalThis.location.href);
  if (theme === "system") current.searchParams.delete("theme");
  else current.searchParams.set("theme", theme);
  if (accentHue === defaultAccentHue) current.searchParams.delete("accent");
  else current.searchParams.set("accent", String(accentHue));
  globalThis.history.replaceState(globalThis.history.state, "", current);
}

/** Reusable Catalogue appearance state for shell and later preview tools. */
export function useCatalogueAppearance(url: URL) {
  const [theme, setTheme] = useState<ThemeSwitcherMode>(() =>
    catalogueTheme(url.searchParams.get("theme")) ??
      catalogueTheme(localStorage.getItem(themeStorageKey)) ?? "system"
  );
  const [accentHue, setAccentHue] = useState<number>(() =>
    catalogueAccent(url.searchParams.get("accent")) ??
      catalogueAccent(localStorage.getItem(accentStorageKey)) ??
      defaultAccentHue
  );
  const terminalTheme = useCatalogueTerminalTheme(theme);

  useEffect(() => {
    const restoreFromLocation = (): void => {
      const current = new URL(globalThis.location.href);
      setTheme(
        catalogueTheme(current.searchParams.get("theme")) ??
          catalogueTheme(localStorage.getItem(themeStorageKey)) ?? "system",
      );
      setAccentHue(
        catalogueAccent(current.searchParams.get("accent")) ??
          catalogueAccent(localStorage.getItem(accentStorageKey)) ??
          defaultAccentHue,
      );
    };
    globalThis.addEventListener("popstate", restoreFromLocation);
    return () =>
      globalThis.removeEventListener("popstate", restoreFromLocation);
  }, []);

  const changeTheme = (next: ThemeSwitcherMode): void => {
    setTheme(next);
    if (next === "system") localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, next);
    updateCatalogueAppearanceUrl(next, accentHue);
  };
  const changeAccentHue = (next: number): void => {
    const accent = catalogueAppearanceOption(next)?.hue ?? defaultAccentHue;
    setAccentHue(accent);
    if (accent === defaultAccentHue) localStorage.removeItem(accentStorageKey);
    else localStorage.setItem(accentStorageKey, String(accent));
    updateCatalogueAppearanceUrl(theme, accent);
  };

  return {
    theme,
    terminalTheme,
    accentHue,
    changeTheme,
    changeAccentHue,
    style: { "--discern-accent-hue": accentHue } as CSSProperties,
  } as const;
}

export interface AppearanceControlProps {
  readonly scopeLabel?: string;
  readonly theme: ThemeSwitcherMode;
  readonly resolvedTheme: "light" | "dark";
  readonly accentHue: number;
  readonly onThemeChange: (theme: ThemeSwitcherMode) => void;
  readonly onAccentHueChange: (hue: number) => void;
}

/** Compact control boundary for the shared Theme and accent model. */
export function AppearanceControl(
  {
    scopeLabel,
    theme,
    resolvedTheme,
    accentHue,
    onThemeChange,
    onAccentHueChange,
  }: AppearanceControlProps,
) {
  const appearanceLabel = scopeLabel === undefined
    ? "appearance"
    : `${scopeLabel} appearance`;
  return (
    <details className="discern-catalogue-appearance">
      <summary aria-label={`Change ${appearanceLabel}`}>Appearance</summary>
      <div
        className="discern-catalogue-appearance__panel"
        role="group"
        aria-label={`${appearanceLabel} settings`}
      >
        <div className="discern-catalogue-appearance__theme">
          <span>Theme</span>
          <ThemeToggle
            theme={resolvedTheme}
            data-discern-mode={theme}
            onThemeChange={onThemeChange}
            toLightLabel={scopeLabel === undefined
              ? "Switch to the light theme"
              : `Switch to the light ${scopeLabel} theme`}
            toDarkLabel={scopeLabel === undefined
              ? "Switch to the dark theme"
              : `Switch to the dark ${scopeLabel} theme`}
          />
        </div>
        <label className="discern-catalogue-accent">
          <span
            className="discern-catalogue-accent__swatch"
            aria-hidden="true"
          />
          <span>Accent</span>
          <select
            value={accentHue}
            onChange={(event) =>
              onAccentHueChange(Number(event.currentTarget.value))}
            aria-label={scopeLabel === undefined
              ? "Accent preset"
              : `${scopeLabel} accent preset`}
          >
            {catalogueAppearanceOptions.map((option) => (
              <option key={option.id} value={option.hue}>{option.label}</option>
            ))}
          </select>
          <output>
            {catalogueAppearanceOption(accentHue)?.label ?? "Blue"}
          </output>
        </label>
      </div>
    </details>
  );
}
