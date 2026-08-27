import { useState } from "react";
import type { CSSProperties } from "react";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeToggle } from "../../src/components/core/theme-toggle/theme-toggle.tsx";
import { discernThemeTokens } from "../../src/tokens/tokens.ts";
import { useCatalogueTerminalTheme } from "../terminal-theme.ts";

const themeStorageKey = "discern-catalogue-theme";
const accentStorageKey = "discern-catalogue-accent-hue";
const defaultAccentHue = Number(
  discernThemeTokens.find(({ name }) => name === "--discern-accent-hue")
    ?.value ?? "255",
);

function catalogueTheme(value: string | null): ThemeSwitcherMode | undefined {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : undefined;
}

function catalogueAccent(value: string | null): number | undefined {
  if (value === null || value.trim() === "") return undefined;
  const accent = Number(value);
  return Number.isFinite(accent) && accent >= 0 && accent <= 360
    ? Math.round(accent)
    : undefined;
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

  const changeTheme = (next: ThemeSwitcherMode): void => {
    setTheme(next);
    if (next === "system") localStorage.removeItem(themeStorageKey);
    else localStorage.setItem(themeStorageKey, next);
  };
  const changeAccentHue = (next: number): void => {
    const accent = Math.max(0, Math.min(360, Math.round(next)));
    setAccentHue(accent);
    localStorage.setItem(accentStorageKey, String(accent));
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
  readonly theme: ThemeSwitcherMode;
  readonly resolvedTheme: "light" | "dark";
  readonly accentHue: number;
  readonly onThemeChange: (theme: ThemeSwitcherMode) => void;
  readonly onAccentHueChange: (hue: number) => void;
}

/** Compact control boundary for the shared Theme and accent model. */
export function AppearanceControl(
  {
    theme,
    resolvedTheme,
    accentHue,
    onThemeChange,
    onAccentHueChange,
  }: AppearanceControlProps,
) {
  return (
    <details className="discern-catalogue-appearance">
      <summary aria-label="Change appearance">Appearance</summary>
      <div
        className="discern-catalogue-appearance__panel"
        role="group"
        aria-label="Appearance settings"
      >
        <div className="discern-catalogue-appearance__theme">
          <span>Theme</span>
          <ThemeToggle
            theme={resolvedTheme}
            data-discern-mode={theme}
            onThemeChange={onThemeChange}
          />
        </div>
        <label className="discern-catalogue-accent">
          <span
            className="discern-catalogue-accent__swatch"
            aria-hidden="true"
          />
          <span>Accent hue</span>
          <input
            type="range"
            min="0"
            max="360"
            step="1"
            value={accentHue}
            onInput={(event) =>
              onAccentHueChange(event.currentTarget.valueAsNumber)}
            aria-label="Accent hue"
          />
          <output>{accentHue}°</output>
        </label>
      </div>
    </details>
  );
}
