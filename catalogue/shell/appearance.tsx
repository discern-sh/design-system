import { useEffect, useId, useState } from "react";
import type { CSSProperties } from "react";
import { Button } from "../../src/components/core/button/button.tsx";
import type { ThemeSwitcherMode } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { ThemeSwitcher } from "../../src/components/core/theme-switcher/theme-switcher.tsx";
import { Input } from "../../src/components/forms/input/input.tsx";
import { Select } from "../../src/components/forms/select/select.tsx";
import {
  appearanceAxes,
  type AppearanceAxisName,
  DEFAULT_ACCENT_HUE,
} from "../../src/tokens/appearance.ts";
import { resolveCatalogueTerminalPresentation } from "../terminal-theme.ts";
import { useCatalogueTerminalTheme } from "../use-terminal-theme.ts";
import {
  CATALOGUE_ACCENT_CHOICE_CUSTOM,
  CATALOGUE_ACCENT_CHOICE_NONE,
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
  setCatalogueAccent,
  setCatalogueFieldPoint,
  writeCatalogueAppearanceParameters,
} from "./appearance-state.ts";
import { AxisControl } from "./axis-control.tsx";
import type { CatalogueAxesSelection } from "./axes-state.ts";
import {
  catalogueAppearanceRootStyle,
  catalogueAxesAreDefault,
  catalogueAxesControlScheme,
  catalogueAxesLabel,
  resetCatalogueAxes,
} from "./axes-state.ts";
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
    catalogueAxesControlScheme(initialCatalogueAppearance(url).field)
  );
  const systemTheme = useCatalogueTerminalTheme("system");

  const commit = (
    next: CatalogueAppearanceState,
    scheme = catalogueAxesControlScheme(next.field),
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
      setFieldScheme(catalogueAxesControlScheme(restored.field));
    };
    globalThis.addEventListener("popstate", restoreFromLocation);
    return () =>
      globalThis.removeEventListener("popstate", restoreFromLocation);
  }, []);

  useEffect(() => {
    if (state.theme !== "system") return;
    const darkness = systemTheme === "dark"
      ? appearanceAxes.darkness.maximum
      : appearanceAxes.darkness.minimum;
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
      ? appearanceAxes.darkness.maximum
      : appearanceAxes.darkness.minimum;
    commit(
      { ...state, theme, field: { ...state.field, darkness } },
      scheme,
    );
  };
  const changeAccent = (value: number | string | undefined): void => {
    if (value === undefined) {
      commit(setCatalogueAccent(state, undefined), fieldScheme);
      return;
    }
    const accent = catalogueAccentHue(value);
    if (accent === undefined) return;
    commit(setCatalogueAccent(state, accent), fieldScheme);
  };
  const changeField = (field: CatalogueAxesSelection): void => {
    const scheme = catalogueAxesControlScheme(field, fieldScheme);
    const darknessChanged = field.darkness !== state.field.darkness;
    commit({
      ...setCatalogueFieldPoint(state, field),
      ...(darknessChanged ? { theme: scheme } : {}),
    }, scheme);
  };
  const resetField = (): void => changeField(resetCatalogueAxes(state.field));
  const terminalPresentation = resolveCatalogueTerminalPresentation(
    fieldScheme,
    state.accent,
  );

  return {
    ...state,
    terminalPresentation,
    fieldScheme,
    changeTheme,
    changeAccent,
    changeField,
    resetField,
    style: catalogueAppearanceRootStyle(
      state.field,
      fieldScheme,
      state.accent,
    ) as CSSProperties,
  } as const;
}

export interface AppearanceControlProps {
  readonly scopeLabel?: string;
  readonly theme: ThemeSwitcherMode;
  readonly resolvedTheme: "light" | "dark";
  /** Accent hue, or `undefined` for monochrome. */
  readonly accent: number | undefined;
  readonly field: CatalogueAxesSelection;
  readonly onThemeChange: (theme: ThemeSwitcherMode) => void;
  /** A hue, a named convenience, or `undefined` to return to monochrome. */
  readonly onAccentChange: (accent: number | string | undefined) => void;
  readonly onFieldChange: (field: CatalogueAxesSelection) => void;
  readonly onFieldReset: () => void;
}

const axisOrder = Object.keys(appearanceAxes) as AppearanceAxisName[];

/** Compact control boundary shared by the shell and Builder state owners. */
export function AppearanceControl(
  {
    scopeLabel,
    theme,
    resolvedTheme,
    accent,
    field,
    onThemeChange,
    onAccentChange,
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
  const [rememberedHue, setRememberedHue] = useState(
    accent ?? DEFAULT_ACCENT_HUE,
  );
  useEffect(() => {
    if (accent !== undefined) setRememberedHue(accent);
  }, [accent]);
  const namedHue = accent === undefined
    ? undefined
    : catalogueAppearanceOptions.find(({ hue }) => hue === accent);
  const accentChoice = accent === undefined
    ? CATALOGUE_ACCENT_CHOICE_NONE
    : namedHue?.id ?? CATALOGUE_ACCENT_CHOICE_CUSTOM;
  const defaultAxes = catalogueAxesAreDefault(field);
  const atPole = resolvedTheme === "light"
    ? field.darkness === appearanceAxes.darkness.minimum
    : field.darkness === appearanceAxes.darkness.maximum;
  const paletteSummary = accent === undefined
    ? "Monochrome"
    : catalogueAccentHueLabel(accent);
  const pointSummary = defaultAxes ? "default" : "custom";
  const schemeSummary = theme === "system"
    ? `System · ${resolvedTheme}`
    : atPole
    ? resolvedTheme === "light" ? "Light" : "Dark"
    : `Custom · ${resolvedTheme}`;

  return (
    <details
      className="discern-catalogue-appearance"
      data-discern-accent={accent === undefined ? undefined : ""}
      style={catalogueAppearanceRootStyle(
        field,
        resolvedTheme,
        accent,
      ) as CSSProperties}
    >
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
          label="Theme"
          systemLabel="System"
          lightLabel="Light"
          darkLabel="Dark"
        />
        <output className="discern-catalogue-appearance__scheme">
          {schemeSummary}
        </output>

        <Select
          label="Accent"
          value={accentChoice}
          onChange={(event) => {
            const choice = event.currentTarget.value;
            if (choice === CATALOGUE_ACCENT_CHOICE_NONE) {
              onAccentChange(undefined);
            } else if (choice === CATALOGUE_ACCENT_CHOICE_CUSTOM) {
              onAccentChange(rememberedHue);
            } else {
              const option = catalogueAppearanceOptions.find(({ id }) =>
                id === choice
              );
              if (option !== undefined) onAccentChange(option.hue);
            }
          }}
          options={[
            { value: CATALOGUE_ACCENT_CHOICE_NONE, label: "Monochrome" },
            ...catalogueAppearanceOptions.map((option) => ({
              value: option.id,
              label: `${option.label} · ${option.hue}`,
            })),
            { value: CATALOGUE_ACCENT_CHOICE_CUSTOM, label: "Custom hue" },
          ]}
        />

        {accent === undefined
          ? null
          : (
            <div className="discern-catalogue-accent">
              <span
                className="discern-catalogue-accent__swatch"
                aria-hidden="true"
              />
              <strong>Accent hue</strong>
              <output>{catalogueAccentHueLabel(accent)}</output>
              <div className="discern-catalogue-accent__inputs">
                <Input
                  type="range"
                  min="0"
                  max="360"
                  step="0.1"
                  value={accent}
                  aria-label="Accent hue slider"
                  aria-describedby={hueGuidanceId}
                  onInput={(event) =>
                    onAccentChange(event.currentTarget.valueAsNumber)}
                />
                <Input
                  type="number"
                  min="0"
                  max="360"
                  step="any"
                  value={accent}
                  label="Hue"
                  aria-describedby={hueGuidanceId}
                  onChange={(event) =>
                    onAccentChange(event.currentTarget.valueAsNumber)}
                />
              </div>
              <small id={hueGuidanceId}>
                0–360. Updates the live Accent projection.
              </small>
            </div>
          )}

        <section className="discern-catalogue-appearance__axes">
          <button
            type="button"
            aria-expanded={axesOpen}
            aria-controls={axesId}
            onClick={() => setAxesOpen((open) => !open)}
          >
            <span>Axes</span>
            <span className="discern-catalogue-appearance__axes-summary">
              {pointSummary} · {catalogueAxesLabel(field)}
            </span>
          </button>
          {axesOpen
            ? (
              <div id={axesId}>
                {axisOrder.map((axis) => (
                  <AxisControl
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
                  disabled={defaultAxes}
                >
                  Reset axes
                </Button>
              </div>
            )
            : null}
        </section>

        <a
          className="discern-catalogue-appearance__page-link"
          href="/catalogue/foundations/appearance/"
        >
          Inspect the Appearance projection
        </a>
      </div>
    </details>
  );
}
