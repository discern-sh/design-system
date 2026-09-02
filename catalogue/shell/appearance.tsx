import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeToggle } from "../../src/components/core/theme-toggle/theme-toggle.tsx";
import { Select } from "../../src/components/forms/select/select.tsx";
import { useCatalogueTerminalTheme } from "../terminal-theme.ts";
import type { CatalogueAppearanceOption } from "./appearance-options.ts";
import {
  catalogueAppearanceOption,
  catalogueAppearanceOptions,
  catalogueAppearanceStyle,
  defaultCatalogueAppearanceOption,
} from "./appearance-options.ts";
import { catalogueTheme } from "./appearance-state.ts";
import type { CatalogueFieldSelection } from "./field-state.ts";
import {
  catalogueFieldControlScheme,
  catalogueFieldLabel,
  catalogueFieldStyle,
  parseCatalogueFieldSelection,
  serializeCatalogueFieldSelection,
} from "./field-state.ts";

const themeStorageKey = "discern-catalogue-theme";
const accentStorageKey = "discern-catalogue-accent-hue";
const fieldStorageKey = "discern-catalogue-field";
const fieldAppearanceValue = "__field-point__";

function accentChoice(value: string | null): string | undefined {
  return catalogueAppearanceOption(value)?.id;
}

function updateCatalogueAppearanceUrl(
  theme: ThemeSwitcherMode,
  accentId: string,
  field: CatalogueFieldSelection | undefined,
): void {
  const current = new URL(globalThis.location.href);
  if (theme === "system") current.searchParams.delete("theme");
  else current.searchParams.set("theme", theme);
  if (field !== undefined) {
    current.searchParams.set(
      "field",
      serializeCatalogueFieldSelection(field),
    );
    current.searchParams.delete("accent");
  } else {
    current.searchParams.delete("field");
  }
  if (field !== undefined || accentId === defaultCatalogueAppearanceOption.id) {
    current.searchParams.delete("accent");
  } else current.searchParams.set("accent", accentId);
  globalThis.history.replaceState(globalThis.history.state, "", current);
}

/** Reusable Catalogue appearance state for shell and later preview tools. */
export function useCatalogueAppearance(url: URL) {
  const [theme, setTheme] = useState<ThemeSwitcherMode>(() =>
    catalogueTheme(url.searchParams.get("theme")) ??
      catalogueTheme(localStorage.getItem(themeStorageKey)) ?? "system"
  );
  const [accentId, setAccentId] = useState<string>(() =>
    accentChoice(url.searchParams.get("accent")) ??
      accentChoice(localStorage.getItem(accentStorageKey)) ??
      defaultCatalogueAppearanceOption.id
  );
  const [field, setField] = useState<CatalogueFieldSelection | undefined>(() =>
    parseCatalogueFieldSelection(url.searchParams.get("field")) ??
      parseCatalogueFieldSelection(localStorage.getItem(fieldStorageKey))
  );
  const [fieldScheme, setFieldScheme] = useState<"light" | "dark" | undefined>(
    () => {
      const initial = parseCatalogueFieldSelection(
        url.searchParams.get("field"),
      ) ?? parseCatalogueFieldSelection(localStorage.getItem(fieldStorageKey));
      return initial === undefined
        ? undefined
        : catalogueFieldControlScheme(initial);
    },
  );
  const accent = catalogueAppearanceOption(accentId) ??
    defaultCatalogueAppearanceOption;
  const selectedTheme = useCatalogueTerminalTheme(theme);
  const terminalTheme = fieldScheme ?? selectedTheme;

  useEffect(() => {
    const restoreFromLocation = (): void => {
      const current = new URL(globalThis.location.href);
      setTheme(
        catalogueTheme(current.searchParams.get("theme")) ??
          catalogueTheme(localStorage.getItem(themeStorageKey)) ?? "system",
      );
      setAccentId(
        accentChoice(current.searchParams.get("accent")) ??
          accentChoice(localStorage.getItem(accentStorageKey)) ??
          defaultCatalogueAppearanceOption.id,
      );
      const restoredField = parseCatalogueFieldSelection(
        current.searchParams.get("field"),
      ) ?? parseCatalogueFieldSelection(localStorage.getItem(fieldStorageKey));
      setField(restoredField);
      setFieldScheme(
        restoredField === undefined
          ? undefined
          : catalogueFieldControlScheme(restoredField),
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
    updateCatalogueAppearanceUrl(next, accentId, field);
  };
  const changeAccent = (next: string): void => {
    const option = catalogueAppearanceOption(next) ??
      defaultCatalogueAppearanceOption;
    setField(undefined);
    setFieldScheme(undefined);
    localStorage.removeItem(fieldStorageKey);
    setAccentId(option.id);
    if (option.id === defaultCatalogueAppearanceOption.id) {
      localStorage.removeItem(accentStorageKey);
    } else localStorage.setItem(accentStorageKey, option.id);
    updateCatalogueAppearanceUrl(theme, option.id, undefined);
  };
  const changeField = (next: CatalogueFieldSelection): void => {
    setField(next);
    setFieldScheme((current) => catalogueFieldControlScheme(next, current));
    localStorage.setItem(
      fieldStorageKey,
      serializeCatalogueFieldSelection(next),
    );
    updateCatalogueAppearanceUrl(theme, accent.id, next);
  };

  return {
    theme,
    terminalTheme,
    accent,
    field,
    fieldScheme,
    changeTheme,
    changeAccent,
    changeField,
    style: field === undefined
      ? catalogueAppearanceStyle(accent, terminalTheme) as CSSProperties
      : catalogueFieldStyle(field, fieldScheme),
  } as const;
}

export interface AppearanceControlProps {
  readonly scopeLabel?: string;
  readonly theme: ThemeSwitcherMode;
  readonly resolvedTheme: "light" | "dark";
  readonly accent: CatalogueAppearanceOption;
  readonly field?: CatalogueFieldSelection | undefined;
  readonly onThemeChange: (theme: ThemeSwitcherMode) => void;
  readonly onAccentChange: (id: string) => void;
}

/** Compact control boundary for the shared Theme and accent model. */
export function AppearanceControl(
  {
    scopeLabel,
    theme,
    resolvedTheme,
    accent,
    field,
    onThemeChange,
    onAccentChange,
  }: AppearanceControlProps,
) {
  const appearanceLabel = scopeLabel === undefined
    ? "appearance"
    : `${scopeLabel} appearance`;
  const guidanceId = useId();
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
          <span>Accent review</span>
          <Select
            value={field === undefined ? accent.id : fieldAppearanceValue}
            onChange={(event) => onAccentChange(event.currentTarget.value)}
            aria-label={scopeLabel === undefined
              ? "Accent review preset"
              : `${scopeLabel} accent review preset`}
            aria-describedby={guidanceId}
            options={[
              ...(field === undefined ? [] : [{
                value: fieldAppearanceValue,
                label: catalogueFieldLabel(field),
              }]),
              ...catalogueAppearanceOptions.map((option) => ({
                value: option.id,
                label: option.label,
              })),
            ]}
          />
          <output>
            {field === undefined ? accent.label : catalogueFieldLabel(field)}
          </output>
          <small
            className="discern-catalogue-accent__guidance"
            id={guidanceId}
          >
            Safe Catalogue presets. Consumer themes can coordinate semantic
            roles across the full colour spectrum.{" "}
            <a href="/catalogue/foundations/field/">Tune a field point</a>.
          </small>
        </label>
      </div>
    </details>
  );
}
