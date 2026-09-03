import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import type { ThemeSwitcherMode } from "../../../src/components/core/theme-switcher/theme-switcher.tsx";
import { Select } from "../../../src/components/forms/select/select.tsx";
import {
  type AppearanceName,
  DEFAULT_ACCENT_HUE,
  fieldAxes,
} from "../../../src/tokens/field.ts";
import {
  AppearanceControl,
  type AppearanceControlProps,
  useCatalogueAppearance,
} from "../../shell/appearance.tsx";
import { catalogueAccentHue } from "../../shell/appearance-options.ts";
import {
  type CatalogueAppearanceParameterNames,
  type CatalogueAppearanceState,
  defaultCatalogueAppearanceState,
  parseCatalogueAppearanceParameters,
  setCatalogueAccentHue,
  setCatalogueAppearanceIdentity,
  setCatalogueFieldPoint,
  writeCatalogueAppearanceParameters,
} from "../../shell/appearance-state.ts";
import {
  catalogueFieldControlScheme,
  catalogueFieldStyle,
} from "../../shell/field-state.ts";
import { useCatalogueTerminalTheme } from "../../terminal-theme.ts";
import type {
  BuilderPreviewAppearance,
  BuilderPreviewMode,
  BuilderPreviewViewportId,
  BuilderPreviewZoomId,
} from "./protocol.ts";

export interface BuilderPreviewViewportPreset {
  readonly id: BuilderPreviewViewportId;
  readonly label: string;
  readonly width?: number;
}

/** Presets name the frame's logical viewport, never a capped element width. */
export const builderPreviewViewports: Readonly<
  Record<BuilderPreviewViewportId, BuilderPreviewViewportPreset>
> = {
  fluid: { id: "fluid", label: "Fluid" },
  desktop: { id: "desktop", label: "1200px", width: 1200 },
  tablet: { id: "tablet", label: "768px", width: 768 },
  phone: { id: "phone", label: "390px", width: 390 },
};

export interface BuilderPreviewMeasurement {
  readonly logicalWidth: number;
  readonly zoomPercent: number;
  readonly devicePixelRatio: number;
}

export interface BuilderPreviewPreferences {
  readonly viewport: BuilderPreviewViewportPreset;
  readonly zoomId: BuilderPreviewZoomId;
  readonly mode: BuilderPreviewMode;
  readonly previewAppearance: BuilderPreviewAppearance;
  readonly workspaceAppearance: CatalogueAppearanceState;
  readonly previewResolvedTheme: "light" | "dark";
  readonly workspaceResolvedTheme: "light" | "dark";
  readonly workspaceStyle: CSSProperties;
  readonly measurement: BuilderPreviewMeasurement;
  readonly resetViewRevision: number;
  readonly interactionRevision: number;
  readonly setViewport: (id: BuilderPreviewViewportId) => void;
  readonly setZoom: (id: BuilderPreviewZoomId) => void;
  readonly setMode: (mode: BuilderPreviewMode) => void;
  readonly setPreviewTheme: AppearanceControlProps["onThemeChange"];
  readonly setPreviewAppearance: AppearanceControlProps["onAppearanceChange"];
  readonly setPreviewAccentHue: AppearanceControlProps["onAccentHueChange"];
  readonly setPreviewField: AppearanceControlProps["onFieldChange"];
  readonly resetPreviewField: AppearanceControlProps["onFieldReset"];
  readonly setWorkspaceTheme: AppearanceControlProps["onThemeChange"];
  readonly setWorkspaceAppearance: AppearanceControlProps["onAppearanceChange"];
  readonly setWorkspaceAccentHue: AppearanceControlProps["onAccentHueChange"];
  readonly setWorkspaceField: AppearanceControlProps["onFieldChange"];
  readonly resetWorkspaceField: AppearanceControlProps["onFieldReset"];
  readonly reportMeasurement: (next: BuilderPreviewMeasurement) => void;
  readonly resetView: () => void;
  readonly resetInteractions: () => void;
}

const previewAppearanceParameterNames: CatalogueAppearanceParameterNames =
  Object.freeze({
    theme: "previewTheme",
    appearance: "previewAppearance",
    accent: "previewAccent",
    field: "previewField",
  });

function previewViewport(value: string | null): BuilderPreviewViewportId {
  return value === "desktop" || value === "tablet" || value === "phone"
    ? value
    : "fluid";
}

function previewZoom(value: string | null): BuilderPreviewZoomId {
  return value === "50" || value === "75" || value === "100" ? value : "fit";
}

function previewMode(value: string | null): BuilderPreviewMode {
  return value === "interact" ? "interact" : "edit";
}

/** Legacy/numeric preview hue migration with the package default fallback. */
export function builderPreviewAccent(value: string | null): number {
  return catalogueAccentHue(value) ?? DEFAULT_ACCENT_HUE;
}

function initialPreviewAppearance(
  parameters: URLSearchParams,
  initialTheme: ThemeSwitcherMode,
): CatalogueAppearanceState {
  return parseCatalogueAppearanceParameters(
    parameters,
    previewAppearanceParameterNames,
  ) ?? { ...defaultCatalogueAppearanceState, theme: initialTheme };
}

function updateComfortUrl(
  input: Readonly<{
    viewport: BuilderPreviewViewportId;
    zoom: BuilderPreviewZoomId;
    mode: BuilderPreviewMode;
    preview: CatalogueAppearanceState;
    workspace: CatalogueAppearanceState;
  }>,
): void {
  const url = new URL(globalThis.location.href);
  const set = (name: string, value: string, ordinary: string): void => {
    if (value === ordinary) url.searchParams.delete(name);
    else url.searchParams.set(name, value);
  };
  set("previewWidth", input.viewport, "fluid");
  set("previewZoom", input.zoom, "fit");
  set("previewMode", input.mode, "edit");
  writeCatalogueAppearanceParameters(
    url.searchParams,
    input.preview,
    previewAppearanceParameterNames,
  );
  writeCatalogueAppearanceParameters(url.searchParams, input.workspace);
  globalThis.history.replaceState(globalThis.history.state, "", url);
}

/**
 * Builder adapter over the shared orthogonal state. Workspace and Preview own
 * distinct points but consume the same transitions and serialisation.
 */
export function useBuilderPreviewPreferences(
  initialPreviewTheme: ThemeSwitcherMode,
): BuilderPreviewPreferences {
  const url = new URL(globalThis.location.href);
  const [viewportId, setViewport] = useState<BuilderPreviewViewportId>(() =>
    previewViewport(url.searchParams.get("previewWidth"))
  );
  const [zoomId, setZoom] = useState<BuilderPreviewZoomId>(() =>
    previewZoom(url.searchParams.get("previewZoom"))
  );
  const [mode, setMode] = useState<BuilderPreviewMode>(() =>
    previewMode(url.searchParams.get("previewMode"))
  );
  const [preview, setPreview] = useState<CatalogueAppearanceState>(() =>
    initialPreviewAppearance(url.searchParams, initialPreviewTheme)
  );
  const [previewScheme, setPreviewScheme] = useState<"light" | "dark">(() =>
    catalogueFieldControlScheme(
      initialPreviewAppearance(url.searchParams, initialPreviewTheme).field,
    )
  );
  const [measurement, setMeasurement] = useState<BuilderPreviewMeasurement>({
    logicalWidth: 0,
    zoomPercent: 100,
    devicePixelRatio: 1,
  });
  const [resetViewRevision, setResetViewRevision] = useState(0);
  const [interactionRevision, setInteractionRevision] = useState(0);
  const workspace = useCatalogueAppearance(url);
  const systemTheme = useCatalogueTerminalTheme("system");

  useEffect(() => {
    if (preview.theme !== "system") return;
    const darkness = systemTheme === "dark"
      ? fieldAxes.darkness.maximum
      : fieldAxes.darkness.minimum;
    if (
      preview.field.darkness === darkness && previewScheme === systemTheme
    ) return;
    setPreview((current) =>
      setCatalogueFieldPoint(current, { ...current.field, darkness })
    );
    setPreviewScheme(systemTheme);
  }, [preview, previewScheme, systemTheme]);

  useEffect(() => {
    updateComfortUrl({
      viewport: viewportId,
      zoom: zoomId,
      mode,
      preview,
      workspace: {
        theme: workspace.theme,
        appearance: workspace.appearance,
        accentHue: workspace.accentHue,
        field: workspace.field,
      },
    });
  }, [
    viewportId,
    zoomId,
    mode,
    preview,
    workspace.theme,
    workspace.appearance,
    workspace.accentHue,
    workspace.field,
  ]);

  const reportMeasurement = useCallback((next: BuilderPreviewMeasurement) => {
    setMeasurement((current) =>
      current.logicalWidth === next.logicalWidth &&
        current.zoomPercent === next.zoomPercent &&
        current.devicePixelRatio === next.devicePixelRatio
        ? current
        : next
    );
  }, []);

  const changePreviewTheme = (theme: ThemeSwitcherMode): void => {
    const scheme = theme === "system" ? systemTheme : theme;
    const darkness = scheme === "dark"
      ? fieldAxes.darkness.maximum
      : fieldAxes.darkness.minimum;
    setPreview((current) => ({
      ...current,
      theme,
      field: { ...current.field, darkness },
    }));
    setPreviewScheme(scheme);
  };
  const changePreviewField = (
    field: CatalogueAppearanceState["field"],
  ): void => {
    const scheme = catalogueFieldControlScheme(field, previewScheme);
    setPreview((current) => ({
      ...setCatalogueFieldPoint(current, field),
      ...(field.darkness === current.field.darkness ? {} : { theme: scheme }),
    }));
    setPreviewScheme(scheme);
  };

  return {
    viewport: builderPreviewViewports[viewportId],
    zoomId,
    mode,
    previewAppearance: {
      ...preview,
      resolvedTheme: previewScheme,
    },
    workspaceAppearance: {
      theme: workspace.theme,
      appearance: workspace.appearance,
      accentHue: workspace.accentHue,
      field: workspace.field,
    },
    previewResolvedTheme: previewScheme,
    workspaceResolvedTheme: workspace.terminalTheme,
    workspaceStyle: workspace.style,
    measurement,
    resetViewRevision,
    interactionRevision,
    setViewport,
    setZoom,
    setMode,
    setPreviewTheme: changePreviewTheme,
    setPreviewAppearance: (appearance: AppearanceName) =>
      setPreview((current) =>
        setCatalogueAppearanceIdentity(current, appearance)
      ),
    setPreviewAccentHue: (value) => {
      const hue = catalogueAccentHue(value);
      if (hue !== undefined) {
        setPreview((current) => setCatalogueAccentHue(current, hue));
      }
    },
    setPreviewField: changePreviewField,
    resetPreviewField: () =>
      changePreviewField(defaultCatalogueAppearanceState.field),
    setWorkspaceTheme: workspace.changeTheme,
    setWorkspaceAppearance: workspace.changeAppearance,
    setWorkspaceAccentHue: workspace.changeAccentHue,
    setWorkspaceField: workspace.changeField,
    resetWorkspaceField: workspace.resetField,
    reportMeasurement,
    resetView() {
      setViewport("fluid");
      setZoom("fit");
      setResetViewRevision((current) => current + 1);
    },
    resetInteractions() {
      setInteractionRevision((current) => current + 1);
    },
  };
}

function AppearanceBoundary(
  {
    label,
    appearance,
    resolvedTheme,
    onThemeChange,
    onAppearanceChange,
    onAccentHueChange,
    onFieldChange,
    onFieldReset,
  }: Readonly<{
    label: string;
    appearance: CatalogueAppearanceState;
    resolvedTheme: "light" | "dark";
    onThemeChange: AppearanceControlProps["onThemeChange"];
    onAppearanceChange: AppearanceControlProps["onAppearanceChange"];
    onAccentHueChange: AppearanceControlProps["onAccentHueChange"];
    onFieldChange: AppearanceControlProps["onFieldChange"];
    onFieldReset: AppearanceControlProps["onFieldReset"];
  }>,
) {
  return (
    <div
      className="discern-builder-appearance"
      role="group"
      aria-label={`${label} appearance`}
      data-discern-appearance={appearance.appearance}
      style={catalogueFieldStyle(
        appearance.field,
        resolvedTheme,
        appearance.accentHue,
      ) as CSSProperties}
    >
      <span>{label}</span>
      <AppearanceControl
        scopeLabel={label}
        theme={appearance.theme}
        resolvedTheme={resolvedTheme}
        appearance={appearance.appearance}
        accentHue={appearance.accentHue}
        field={appearance.field}
        onThemeChange={onThemeChange}
        onAppearanceChange={onAppearanceChange}
        onAccentHueChange={onAccentHueChange}
        onFieldChange={onFieldChange}
        onFieldReset={onFieldReset}
      />
    </div>
  );
}

/** Exact viewport, scale, mode, and separated Appearance controls. */
export function PreviewToolbarControls(
  { preferences }: Readonly<{ preferences: BuilderPreviewPreferences }>,
) {
  const readout = preferences.measurement.logicalWidth === 0
    ? "Measuring preview"
    : `${preferences.measurement.logicalWidth}px · ${
      preferences.zoomId === "fit" ? "Fit " : ""
    }${preferences.measurement.zoomPercent}%`;
  return (
    <>
      <div
        className="discern-builder-mode"
        role="group"
        aria-label="Preview mode"
      >
        {(["edit", "interact"] as const).map((mode) => (
          <button
            key={mode}
            type="button"
            aria-pressed={preferences.mode === mode}
            onClick={() => preferences.setMode(mode)}
          >
            {mode === "edit" ? "Edit" : "Interact"}
          </button>
        ))}
      </div>
      <span className="discern-builder-mode__consequence" role="status">
        {preferences.mode === "edit"
          ? "Edit selects; preview controls stay inert."
          : "Interact runs local behaviour; external effects stay blocked."}
      </span>
      <label className="discern-builder-width">
        <span>Viewport</span>
        <Select
          aria-label="Preview width"
          value={preferences.viewport.id}
          onChange={(event) =>
            preferences.setViewport(
              event.currentTarget.value as BuilderPreviewViewportId,
            )}
          options={Object.values(builderPreviewViewports).map((
            { id, label },
          ) => ({
            value: id,
            label,
          }))}
        />
      </label>
      <div
        className="discern-builder-zoom"
        role="group"
        aria-label="Preview zoom"
      >
        {(["fit", "50", "75", "100"] as const).map((zoom) => (
          <button
            key={zoom}
            type="button"
            aria-label={zoom === "fit" ? "Fit preview" : `${zoom}% preview`}
            aria-pressed={preferences.zoomId === zoom}
            onClick={() => preferences.setZoom(zoom)}
          >
            {zoom === "fit" ? "Fit" : `${zoom}%`}
          </button>
        ))}
        <button
          type="button"
          aria-label="Reset preview view"
          onClick={preferences.resetView}
        >
          Reset
        </button>
      </div>
      <output
        className="discern-builder-preview-readout"
        data-discern-builder-preview-readout=""
        aria-live="polite"
      >
        {readout}
      </output>
      <AppearanceBoundary
        label="Workspace"
        appearance={preferences.workspaceAppearance}
        resolvedTheme={preferences.workspaceResolvedTheme}
        onThemeChange={preferences.setWorkspaceTheme}
        onAppearanceChange={preferences.setWorkspaceAppearance}
        onAccentHueChange={preferences.setWorkspaceAccentHue}
        onFieldChange={preferences.setWorkspaceField}
        onFieldReset={preferences.resetWorkspaceField}
      />
      <AppearanceBoundary
        label="Preview"
        appearance={preferences.previewAppearance}
        resolvedTheme={preferences.previewResolvedTheme}
        onThemeChange={preferences.setPreviewTheme}
        onAppearanceChange={preferences.setPreviewAppearance}
        onAccentHueChange={preferences.setPreviewAccentHue}
        onFieldChange={preferences.setPreviewField}
        onFieldReset={preferences.resetPreviewField}
      />
    </>
  );
}
