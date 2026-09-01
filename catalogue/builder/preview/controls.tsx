import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";
import {
  AppearanceControl,
  type AppearanceControlProps,
  useCatalogueAppearance,
} from "../../shell/appearance.tsx";
import {
  type CatalogueAppearanceOption,
  catalogueAppearanceOption,
  catalogueAppearanceStyle,
  defaultCatalogueAppearanceOption,
} from "../../shell/appearance-options.ts";
import { useCatalogueTerminalTheme } from "../../terminal-theme.ts";
import type { ThemeSwitcherMode } from "../../../src/components/core/theme-switcher/theme-switcher.tsx";
import { Select } from "../../../src/components/forms/select/select.tsx";
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

interface MutableAppearance {
  readonly theme: ThemeSwitcherMode;
  readonly accent: CatalogueAppearanceOption;
}

export interface BuilderPreviewPreferences {
  readonly viewport: BuilderPreviewViewportPreset;
  readonly zoomId: BuilderPreviewZoomId;
  readonly mode: BuilderPreviewMode;
  readonly previewAppearance: BuilderPreviewAppearance;
  readonly previewAccent: CatalogueAppearanceOption;
  readonly workspaceAppearance: MutableAppearance;
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
  readonly setPreviewAccent: AppearanceControlProps["onAccentChange"];
  readonly setWorkspaceTheme: AppearanceControlProps["onThemeChange"];
  readonly setWorkspaceAccent: AppearanceControlProps["onAccentChange"];
  readonly reportMeasurement: (next: BuilderPreviewMeasurement) => void;
  readonly resetView: () => void;
  readonly resetInteractions: () => void;
}

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

function theme(value: string | null, fallback: ThemeSwitcherMode) {
  return value === "system" || value === "light" || value === "dark"
    ? value
    : fallback;
}

export function builderPreviewAccent(
  value: string | null,
): CatalogueAppearanceOption {
  return catalogueAppearanceOption(value) ?? defaultCatalogueAppearanceOption;
}

function updateComfortUrl(
  input: Readonly<{
    viewport: BuilderPreviewViewportId;
    zoom: BuilderPreviewZoomId;
    mode: BuilderPreviewMode;
    preview: MutableAppearance;
    workspace: MutableAppearance;
    initialPreviewTheme: ThemeSwitcherMode;
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
  set("previewTheme", input.preview.theme, input.initialPreviewTheme);
  set(
    "previewAccent",
    input.preview.accent.id,
    defaultCatalogueAppearanceOption.id,
  );
  set("theme", input.workspace.theme, "system");
  set(
    "accent",
    input.workspace.accent.id,
    defaultCatalogueAppearanceOption.id,
  );
  globalThis.history.replaceState(globalThis.history.state, "", url);
}

/**
 * Builder adapter over the shared Appearance control/types. Comfort state is
 * URL-local and never enters the accepted document or its history.
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
  const [previewTheme, setPreviewTheme] = useState<ThemeSwitcherMode>(() =>
    theme(url.searchParams.get("previewTheme"), initialPreviewTheme)
  );
  const [previewAccent, setPreviewAccent] = useState<
    CatalogueAppearanceOption
  >(() => builderPreviewAccent(url.searchParams.get("previewAccent")));
  const [measurement, setMeasurement] = useState<BuilderPreviewMeasurement>({
    logicalWidth: 0,
    zoomPercent: 100,
    devicePixelRatio: 1,
  });
  const [resetViewRevision, setResetViewRevision] = useState(0);
  const [interactionRevision, setInteractionRevision] = useState(0);
  const workspace = useCatalogueAppearance(url);
  const previewResolvedTheme = useCatalogueTerminalTheme(previewTheme);

  useEffect(() => {
    updateComfortUrl({
      viewport: viewportId,
      zoom: zoomId,
      mode,
      preview: { theme: previewTheme, accent: previewAccent },
      workspace: { theme: workspace.theme, accent: workspace.accent },
      initialPreviewTheme,
    });
  }, [
    viewportId,
    zoomId,
    mode,
    previewTheme,
    previewAccent,
    workspace.theme,
    workspace.accent,
    initialPreviewTheme,
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

  return {
    viewport: builderPreviewViewports[viewportId],
    zoomId,
    mode,
    previewAppearance: {
      theme: previewTheme,
      resolvedTheme: previewResolvedTheme,
      accent: previewAccent.id,
    },
    previewAccent,
    workspaceAppearance: {
      theme: workspace.theme,
      accent: workspace.accent,
    },
    previewResolvedTheme,
    workspaceResolvedTheme: workspace.terminalTheme,
    workspaceStyle: workspace.style,
    measurement,
    resetViewRevision,
    interactionRevision,
    setViewport,
    setZoom,
    setMode,
    setPreviewTheme,
    setPreviewAccent: (next) => setPreviewAccent(builderPreviewAccent(next)),
    setWorkspaceTheme: workspace.changeTheme,
    setWorkspaceAccent: workspace.changeAccent,
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
  { label, appearance, resolvedTheme, onThemeChange, onAccentChange }: Readonly<
    {
      label: string;
      appearance: MutableAppearance;
      resolvedTheme: "light" | "dark";
      onThemeChange: AppearanceControlProps["onThemeChange"];
      onAccentChange: AppearanceControlProps["onAccentChange"];
    }
  >,
) {
  return (
    <div
      className="discern-builder-appearance"
      role="group"
      aria-label={`${label} appearance`}
      style={catalogueAppearanceStyle(
        appearance.accent,
        resolvedTheme,
      ) as CSSProperties}
    >
      <span>{label}</span>
      <AppearanceControl
        scopeLabel={label}
        theme={appearance.theme}
        resolvedTheme={resolvedTheme}
        accent={appearance.accent}
        onThemeChange={onThemeChange}
        onAccentChange={onAccentChange}
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
        onAccentChange={preferences.setWorkspaceAccent}
      />
      <AppearanceBoundary
        label="Preview"
        appearance={{
          theme: preferences.previewAppearance.theme,
          accent: preferences.previewAccent,
        }}
        resolvedTheme={preferences.previewResolvedTheme}
        onThemeChange={preferences.setPreviewTheme}
        onAccentChange={preferences.setPreviewAccent}
      />
    </>
  );
}
