/**
 * Pure terminal renderer and deterministic example states for Diagram.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import { prepareDiagramSemantics } from "../../../generated/diagram-dispatch.ts";
import {
  projectDiagramKindCli,
} from "../../../generated/diagram-cli-registry.ts";
import type { DiagramSpec } from "../../../generated/diagram-spec.ts";
import fixtures from "../../../diagram/kinds/flow/flow.fixtures.ts";

/** Stable projection posture for the terminal Diagram renderer. */
export type DiagramCliMode = "auto" | "description";

/** Inputs accepted by the terminal Diagram renderer. */
export interface DiagramCliProps {
  readonly spec: DiagramSpec;
  readonly mode?: DiagramCliMode;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const [decisionFlow, compactFlow] = fixtures;

/** Deterministic Diagram states rendered by the CLI Catalogue. */
export const cliExamples: readonly CliExample<DiagramCliProps>[] = [
  {
    name: "enhanced compact flow",
    props: { spec: compactFlow, mode: "auto", maxWidth: 76 },
  },
  {
    name: "enhanced decision and return",
    props: { spec: decisionFlow, mode: "auto", maxWidth: 78 },
  },
  {
    name: "universal description",
    props: { spec: compactFlow, mode: "description", maxWidth: 64 },
  },
  {
    name: "narrow ASCII fallback",
    props: { spec: decisionFlow, mode: "auto", maxWidth: 34 },
    capabilities: { columns: 34, colorDepth: "none", unicode: false },
  },
] as const;

function descriptionLineStyle(
  line: string,
  theme: TerminalTheme,
): Parameters<typeof styleText>[1] {
  if (line.startsWith("Title:")) {
    return {
      color: terminalToneColor(theme, "accent"),
      ...theme.typography.strong,
    };
  }
  if (line === "Nodes:" || line === "Relationships:") {
    return {
      color: terminalToneColor(theme, "accent"),
      ...theme.typography.strong,
    };
  }
  if (line.startsWith("Direction:")) {
    return {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      ...theme.typography.annotation,
    };
  }
  return {
    color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    ...theme.typography.body,
  };
}

function renderDiagramDescription(
  description: string,
  width: number,
  theme: TerminalTheme,
  capabilities: TerminalCapabilities,
): string {
  const blocks: string[][] = [[]];
  for (const semanticLine of description.trimEnd().split("\n")) {
    if (
      (semanticLine === "Nodes:" || semanticLine === "Relationships:") &&
      (blocks.at(-1)?.length ?? 0) > 0
    ) {
      blocks.push([]);
    }
    const style = descriptionLineStyle(semanticLine, theme);
    blocks.at(-1)?.push(
      ...wrapText(semanticLine, width).map((line) =>
        styleText(line, style, capabilities)
      ),
    );
  }
  return composeCliBlocks(
    blocks.map((block) => joinVertical(block)).filter((block) => block !== ""),
  );
}

/**
 * Render a semantic diagram for terminal use. Auto uses an enhanced kind
 * projector only while it can preserve every fact; all declines use the
 * universal lossless description.
 */
const renderDiagramCli: CliRenderer<DiagramCliProps> = (
  props,
  capabilities,
) => {
  const mode = props.mode ?? "auto";
  if (mode !== "auto" && mode !== "description") {
    throw new TypeError(
      `diagram CLI mode must be auto or description; received ${String(mode)}`,
    );
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 1) {
    throw new TypeError(
      `diagram CLI width must be a positive safe integer; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const themeName = props.theme ?? "dark";
  if (themeName !== "light" && themeName !== "dark") {
    throw new TypeError(
      `diagram CLI theme must be light or dark; received ${String(themeName)}`,
    );
  }
  const theme = terminalThemes[themeName];
  const { validated, description } = prepareDiagramSemantics(props.spec);
  const fallback = (): string =>
    renderDiagramDescription(description, width, theme, capabilities);
  if (mode === "description") return fallback();

  const projection = projectDiagramKindCli(validated, {
    capabilities,
    maxWidth: width,
    theme: themeName,
    description,
  });
  return projection?.kind === "frame" ? projection.frame : fallback();
};

export default renderDiagramCli;
