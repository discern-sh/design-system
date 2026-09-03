import { styleText } from "../../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../../src/cli/capabilities.ts";
import { projectTerminalInspectorHtml } from "../../../src/cli/projection.ts";
import {
  resolveTerminalTheme,
  terminalThemeColor,
} from "../../../src/cli/theme.ts";
import {
  type Appearance,
  fieldAppearance,
} from "../../../src/tokens/appearance.ts";

const capabilities: TerminalCapabilities = {
  ansiControl: true,
  colorDepth: "truecolor",
  columns: 64,
  hyperlinks: false,
  unicode: true,
};

const paletteRoles = [
  "--discern-color-canvas",
  "--discern-color-ink",
  "--discern-color-ink-muted",
  "--discern-color-ink-faint",
  "--discern-color-accent-700",
  "--discern-color-success-deep",
  "--discern-color-warning-deep",
  "--discern-color-danger",
] as const;

export interface AppearancePoleTerminalProjection {
  readonly theme: "light" | "dark";
  readonly output: string;
  readonly inspectorHtml: string;
}

/** Project the selected appearance through both honest terminal ground poles. */
export function appearancePoleTerminalProjections(
  appearance: Appearance = fieldAppearance,
): readonly AppearancePoleTerminalProjection[] {
  return (["light", "dark"] as const).map((variant) => {
    const theme = resolveTerminalTheme({ theme: variant, appearance });
    const output = paletteRoles.map((name) => {
      const swatch = styleText(
        "    ",
        { background: terminalThemeColor(theme, name) },
        capabilities,
      );
      return `${swatch}  ${name}`;
    }).join("\n");
    return {
      theme: variant,
      output,
      inspectorHtml: projectTerminalInspectorHtml(output, {
        columns: capabilities.columns,
        rows: paletteRoles.length,
        title: `${variant === "light" ? "Light" : "Dark"} field pole`,
        theme: variant,
        appearance,
      }),
    };
  });
}
