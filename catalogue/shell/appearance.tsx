import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "../../src/components/core/button/button.tsx";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeSwitcher } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { Input } from "../../src/components/forms/input/input.tsx";
import { Select } from "../../src/components/forms/select/select.tsx";
import {
  type AppearanceName,
  defaultFieldPoint,
  fieldAxes,
  type FieldAxisName,
} from "../../src/tokens/field.ts";
import { useCatalogueTerminalTheme } from "../terminal-theme.ts";
import {
  catalogueAccentHue,
  catalogueAccentHueLabel,
  catalogueAppearanceOptions,
} from "./appearance-options.ts";
import {
  type CatalogueAppearanceState,
  catalogueAppearanceStorageKey,
  defaultCatalogueAppearanceState,
  legacyCatalogueAppearanceStorageKeys,
  parseCatalogueAppearanceParameters,
  serializeCatalogueAppearanceState,
  setCatalogueAccentHue,
  setCatalogueAppearanceIdentity,
  setCatalogueFieldPoint,
  writeCatalogueAppearanceParameters,
} from "./appearance-state.ts";
import { FieldAxisControl } from "./field-axis-control.tsx";
import type { CatalogueFieldSelection } from "./field-state.ts";
import {
  catalogueFieldControlScheme,
  catalogueFieldLabel,
  catalogueFieldStyle,
  defaultCatalogueFieldSelection,
} from "./field-state.ts";
import { announceCatalogueLocationChange } from "./location.ts";

let appearanceStorageUsable = true;

function storedCatalogueAppearance(): CatalogueAppearanceState | undefined {
  if (!appearanceStorageUsable) return undefined;
  try {
    const stored = localStorage.getItem(catalogueAppearanceStorageKey);
    if (stored !== null) {
      return parseCatalogueAppearanceParameters(new URLSearchParams(stored));
    }
    const legacy = new URLSearchParams();
    const theme = localStorage.getItem(
      legacyCatalogueAppearanceStorageKeys.theme,
    );
    const accent = localStorage.getItem(
      legacyCatalogueAppearanceStorageKeys.accent,
    );
    const field = localStorage.getItem(
      legacyCatalogueAppearanceStorageKeys.field,
    );
    if (theme !== null) legacy.set("theme", theme);
    if (accent !== null) legacy.set("accent", accent);
    if (field !== null) legacy.set("field", field);
    return parseCatalogueAppearanceParameters(legacy);
  } catch {
    appearanceStorageUsable = false;
    return undefined;
  }
}

function persistCatalogueAppearance(state: CatalogueAppearanceState): void {
  if (appearanceStorageUsable) {
    try {
      localStorage.setItem(
        catalogueAppearanceStorageKey,
        serializeCatalogueAppearanceState(state),
      );
      for (const key of Object.values(legacyCatalogueAppearanceStorageKeys)) {
        localStorage.removeItem(key);
      }
    } catch {
      appearanceStorageUsable = false;
    }
  }
  const current = new URL(globalThis.location.href);
  writeCatalogueAppearanceParameters(current.searchParams, state);
  globalThis.history.replaceState(globalThis.history.state, "", current);
  announceCatalogueLocationChange();
}

function initialCatalogueAppearance(url: URL): CatalogueAppearanceState {
  return parseCatalogueAppearanceParameters(url.searchParams) ??
    storedCatalogueAppearance() ?? defaultCatalogueAppearanceState;
}

/** Reusable orthogonal Catalogue Appearance state for shell and preview tools. */
export function useCatalogueAppearance(url: URL) {
  const [state, setState] = useState<CatalogueAppearanceState>(() =>
    initialCatalogueAppearance(url)
  );
  const [fieldScheme, setFieldScheme] = useState<"light" | "dark">(() =>
    catalogueFieldControlScheme(initialCatalogueAppearance(url).field)
  );
  const systemTheme = useCatalogueTerminalTheme("system");

  const commit = (
    next: CatalogueAppearanceState,
    scheme = catalogueFieldControlScheme(next.field),
  ): void => {
    setState(next);
    setFieldScheme(scheme);
    persistCatalogueAppearance(next);
  };

  useEffect(() => {
    persistCatalogueAppearance(state);
  }, []);

  useEffect(() => {
    const restoreFromLocation = (): void => {
      const restored = parseCatalogueAppearanceParameters(
        new URL(globalThis.location.href).searchParams,
      ) ?? storedCatalogueAppearance() ?? defaultCatalogueAppearanceState;
      setState(restored);
      setFieldScheme(catalogueFieldControlScheme(restored.field));
    };
    globalThis.addEventListener("popstate", restoreFromLocation);
    return () =>
      globalThis.removeEventListener("popstate", restoreFromLocation);
  }, []);

  useEffect(() => {
    if (state.theme !== "system") return;
    const darkness = systemTheme === "dark"
      ? fieldAxes.darkness.maximum
      : fieldAxes.darkness.minimum;
    if (state.field.darkness === darkness && fieldScheme === systemTheme) {
      return;
    }
    const next = setCatalogueFieldPoint(state, { ...state.field, darkness });
    setState(next);
    setFieldScheme(systemTheme);
    persistCatalogueAppearance(next);
  }, [fieldScheme, state, systemTheme]);

  const changeTheme = (theme: ThemeSwitcherMode): void => {
    const scheme = theme === "system" ? systemTheme : theme;
    const darkness = scheme === "dark"
      ? fieldAxes.darkness.maximum
      : fieldAxes.darkness.minimum;
    commit(
      { ...state, theme, field: { ...state.field, darkness } },
      scheme,
    );
  };
  const changeAppearance = (appearance: AppearanceName): void => {
    commit(setCatalogueAppearanceIdentity(state, appearance), fieldScheme);
  };
  const changeAccentHue = (value: number | string): void => {
    const accentHue = catalogueAccentHue(value);
    if (accentHue === undefined) return;
    commit(setCatalogueAccentHue(state, accentHue), fieldScheme);
  };
  const changeField = (field: CatalogueFieldSelection): void => {
    const scheme = catalogueFieldControlScheme(field, fieldScheme);
    const darknessChanged = field.darkness !== state.field.darkness;
    commit({
      ...setCatalogueFieldPoint(state, field),
      ...(darknessChanged ? { theme: scheme } : {}),
    }, scheme);
  };
  const resetField = (): void => changeField(defaultCatalogueFieldSelection);

  return {
    ...state,
    terminalTheme: fieldScheme,
    fieldScheme,
    changeTheme,
    changeAppearance,
    changeAccentHue,
    changeField,
    resetField,
    style: catalogueFieldStyle(
      state.field,
      fieldScheme,
      state.accentHue,
    ) as CSSProperties,
  } as const;
}

export interface AppearanceControlProps {
  readonly scopeLabel?: string;
  readonly theme: ThemeSwitcherMode;
  readonly resolvedTheme: "light" | "dark";
  readonly appearance: AppearanceName;
  readonly accentHue: number;
  readonly field: CatalogueFieldSelection;
  readonly onThemeChange: (theme: ThemeSwitcherMode) => void;
  readonly onAppearanceChange: (appearance: AppearanceName) => void;
  readonly onAccentHueChange: (hue: number | string) => void;
  readonly onFieldChange: (field: CatalogueFieldSelection) => void;
  readonly onFieldReset: () => void;
}

function fieldIsDefault(field: CatalogueFieldSelection): boolean {
  return (Object.keys(fieldAxes) as FieldAxisName[]).every((axis) =>
    field[axis] === defaultFieldPoint[axis]
  );
}

/** Compact control boundary shared by the shell and Builder state owners. */
export function AppearanceControl(
  {
    scopeLabel,
    theme,
    resolvedTheme,
    appearance,
    accentHue,
    field,
    onThemeChange,
    onAppearanceChange,
    onAccentHueChange,
    onFieldChange,
    onFieldReset,
  }: AppearanceControlProps,
) {
  const appearanceLabel = scopeLabel === undefined
    ? "appearance"
    : `${scopeLabel} appearance`;
  const hueGuidanceId = useId();
  const axesId = useId();
  const [axesOpen, setAxesOpen] = useState(false);
  const namedHue = catalogueAppearanceOptions.find(({ hue }) =>
    hue === accentHue
  );
  const defaultField = fieldIsDefault(field);
  const defaultNonDarkness = field.structure === defaultFieldPoint.structure &&
    field.emphasis === defaultFieldPoint.emphasis &&
    field.density === defaultFieldPoint.density;
  const paletteSummary = appearance === "field"
    ? "Field"
    : catalogueAccentHueLabel(accentHue);
  const pointSummary = theme === "system" && defaultNonDarkness
    ? `${resolvedTheme} pole`
    : defaultField
    ? "default"
    : "custom";
  const schemeSummary = theme === "system"
    ? `System · ${resolvedTheme} pole`
    : field.darkness === fieldAxes.darkness.minimum && resolvedTheme === "light"
    ? "Light pole"
    : field.darkness === fieldAxes.darkness.maximum && resolvedTheme === "dark"
    ? "Dark pole"
    : `Custom ${resolvedTheme} field`;

  return (
    <details className="discern-catalogue-appearance">
      <summary aria-label={`Change ${appearanceLabel}`}>
        <span>Appearance</span>
        <small>{paletteSummary} · {pointSummary}</small>
      </summary>
      <div
        className="discern-catalogue-appearance__panel"
        role="group"
        aria-label={`${appearanceLabel} settings`}
      >
        <ThemeSwitcher
          className="discern-catalogue-appearance__theme"
          mode={theme}
          onModeChange={onThemeChange}
          label="Theme policy"
          systemLabel="System"
          lightLabel="Light pole"
          darkLabel="Dark pole"
        />
        <output className="discern-catalogue-appearance__scheme">
          {schemeSummary}
        </output>

        <Select
          label="Palette"
          value={appearance}
          onChange={(event) =>
            onAppearanceChange(event.currentTarget.value as AppearanceName)}
          options={[
            { value: "field", label: "Field" },
            { value: "accent", label: "Accent" },
          ]}
        />

        <div className="discern-catalogue-accent">
          <span
            className="discern-catalogue-accent__swatch"
            aria-hidden="true"
          />
          <strong>Accent hue</strong>
          <output>{catalogueAccentHueLabel(accentHue)}</output>
          <Select
            aria-label={scopeLabel === undefined
              ? "Named Accent hue"
              : `${scopeLabel} named Accent hue`}
            value={namedHue?.id ?? ""}
            onChange={(event) => {
              const option = catalogueAppearanceOptions.find(({ id }) =>
                id === event.currentTarget.value
              );
              if (option !== undefined) onAccentHueChange(option.hue);
            }}
            options={[
              { value: "", label: "Custom hue" },
              ...catalogueAppearanceOptions.map((option) => ({
                value: option.id,
                label: `${option.label} · ${option.hue}`,
              })),
            ]}
          />
          <div className="discern-catalogue-accent__inputs">
            <Input
              type="range"
              min="0"
              max="360"
              step="0.1"
              value={accentHue}
              aria-label="Accent hue slider"
              aria-describedby={hueGuidanceId}
              onInput={(event) =>
                onAccentHueChange(event.currentTarget.valueAsNumber)}
            />
            <Input
              type="number"
              min="0"
              max="360"
              step="any"
              value={accentHue}
              label="Hue"
              aria-describedby={hueGuidanceId}
              onChange={(event) =>
                onAccentHueChange(event.currentTarget.valueAsNumber)}
            />
          </div>
          <small id={hueGuidanceId}>
            0–360. {appearance === "field"
              ? "Remembered until Accent is selected."
              : "Updates the live Accent projection."}
          </small>
        </div>

        <section className="discern-catalogue-appearance__axes">
          <button
            type="button"
            aria-expanded={axesOpen}
            aria-controls={axesId}
            onClick={() => setAxesOpen((open) => !open)}
          >
            <span>Field axes</span>
            <span className="discern-catalogue-appearance__axes-summary">
              {pointSummary} · {catalogueFieldLabel(field)}
            </span>
          </button>
          {axesOpen
            ? (
              <div id={axesId}>
                {(
                  ["darkness", "structure", "emphasis", "density"] as const
                ).map((axis) => (
                  <FieldAxisControl
                    key={axis}
                    axis={axis}
                    value={field[axis]}
                    onChange={(value) =>
                      onFieldChange({ ...field, [axis]: value })}
                  />
                ))}
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={onFieldReset}
                  disabled={defaultField}
                >
                  Reset field point
                </Button>
              </div>
            )
            : null}
        </section>

        <a
          className="discern-catalogue-appearance__field-link"
          href="/catalogue/foundations/field/"
        >
          Inspect the Field projection
        </a>
      </div>
    </details>
  );
}
