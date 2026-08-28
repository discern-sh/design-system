import { useState } from "react";
import type { CSSProperties } from "react";
import type { AppearanceControlProps } from "../../shell/appearance.tsx";
import { ThemeSwitcher } from "../../../src/components/core/theme-switcher/theme-switcher.tsx";
import type { ThemeSwitcherMode } from "../../../src/components/core/theme-switcher/theme-switcher.tsx";
import { Select } from "../../../src/components/forms/select/select.tsx";
import {
  type GuardedBuilderStorage,
  persistBuilderTheme,
} from "../persistence.ts";
import type {
  BuilderPreviewAppearance,
  BuilderPreviewViewport,
} from "./protocol.ts";

/** The current visual width choices, projected into the preview protocol. */
export const builderPreviewViewports: Readonly<
  Record<BuilderPreviewViewport["id"], BuilderPreviewViewport>
> = {
  fluid: { id: "fluid", label: "Fluid" },
  desktop: { id: "desktop", label: "1200px", cssWidth: "1200px" },
  tablet: { id: "tablet", label: "768px", cssWidth: "768px" },
  phone: { id: "phone", label: "390px", cssWidth: "390px" },
};

export interface BuilderPreviewPreferences {
  readonly viewport: BuilderPreviewViewport;
  readonly appearance: BuilderPreviewAppearance;
  readonly style: CSSProperties;
  readonly setViewport: (id: BuilderPreviewViewport["id"]) => void;
  readonly setTheme: AppearanceControlProps["onThemeChange"];
  readonly setAccentHue: AppearanceControlProps["onAccentHueChange"];
}

/** Builder adapter over the shared Appearance types, retaining legacy chrome. */
export function useBuilderPreviewPreferences(
  initialTheme: ThemeSwitcherMode,
  storage: GuardedBuilderStorage,
  onStorageFailure: (message: string) => void,
): BuilderPreviewPreferences {
  const [viewportId, setViewport] = useState<BuilderPreviewViewport["id"]>(
    "fluid",
  );
  const [theme, setThemeState] = useState<ThemeSwitcherMode>(initialTheme);
  const [accentHue, setAccentHue] = useState(255);
  const changeTheme = (next: ThemeSwitcherMode): void => {
    setThemeState(next);
    const result = persistBuilderTheme(storage, next);
    if (!result.ok) onStorageFailure(result.message);
  };
  return {
    viewport: builderPreviewViewports[viewportId],
    appearance: { theme, accentHue },
    style: { "--discern-accent-hue": accentHue } as CSSProperties,
    setViewport,
    setTheme: changeTheme,
    setAccentHue,
  };
}

/** Existing width, Theme, and accent controls owned by preview. */
export function PreviewToolbarControls(
  { preferences }: Readonly<{ preferences: BuilderPreviewPreferences }>,
) {
  return (
    <>
      <label className="discern-builder-width">
        <span>Width</span>
        <Select
          value={preferences.viewport.id}
          onChange={(event) =>
            preferences.setViewport(
              event.currentTarget.value as BuilderPreviewViewport["id"],
            )}
          options={Object.values(builderPreviewViewports).map((
            { id, label },
          ) => ({
            value: id,
            label,
          }))}
        />
      </label>
      <ThemeSwitcher
        className="discern-builder-theme"
        mode={preferences.appearance.theme}
        onModeChange={preferences.setTheme}
        label="Builder colour theme"
      />
      <label className="discern-builder-accent">
        <span>Accent</span>
        <input
          type="range"
          min="0"
          max="360"
          step="1"
          value={preferences.appearance.accentHue}
          onInput={(event) =>
            preferences.setAccentHue(event.currentTarget.valueAsNumber)}
          aria-label="Accent hue"
        />
      </label>
    </>
  );
}
