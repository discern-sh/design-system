/**
 * Pure terminal renderer and deterministic example states for Chart.
 *
 * Auto mode asks the generated kind registry for an enhanced frame inside
 * its declared honesty tier; description mode and every typed decline render
 * `describeChart`'s facts with the data table as a real aligned table, so
 * the universal fallback is a first-class reading experience rather than a
 * punishment.
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
import {
  barUnitSuffix,
  barValueText,
} from "../../../chart/kinds/bar/bar.description.ts";
import type { ValidatedBarChart } from "../../../chart/kinds/bar/bar.spec.ts";
import { projectChartKindCli } from "../../../generated/chart-cli-registry.ts";
import { prepareChartSemantics } from "../../../generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../../generated/chart-registry.ts";
import type {
  ChartSpec,
  ValidatedChart,
} from "../../../generated/chart-spec.ts";
import renderTableCli from "../../display/table/table.cli.ts";

/** Stable projection posture for the terminal Chart renderer. */
export type ChartCliMode = "auto" | "description";

/** Inputs accepted by the terminal Chart renderer. */
export interface ChartCliProps {
  readonly spec: ChartSpec;
  readonly mode?: ChartCliMode;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Chart states rendered by the CLI Catalogue. */
export const cliExamples: readonly CliExample<ChartCliProps>[] = Object
  .freeze(chartKindRegistry.flatMap((entry) => {
    const representative = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "representative")
    )?.spec as ChartSpec | undefined;
    const structural = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "structural")
    )?.spec as ChartSpec | undefined;
    const maximum = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "maximum-density")
    )?.spec as ChartSpec | undefined;
    if (
      representative === undefined || structural === undefined ||
      maximum === undefined
    ) {
      throw new TypeError(
        `${entry.meta.slug} has incomplete CLI release cases`,
      );
    }
    const examples: CliExample<ChartCliProps>[] = [
      {
        name: `${entry.meta.slug}-${entry.meta.cli.stance}`,
        props: { spec: representative, mode: "auto", maxWidth: 76 },
      },
      {
        name: `${entry.meta.slug}-structural`,
        props: { spec: structural, mode: "auto", maxWidth: 76 },
      },
      {
        name: `${entry.meta.slug}-universal-description`,
        props: { spec: representative, mode: "description", maxWidth: 72 },
      },
      {
        name: `${entry.meta.slug}-maximum-density`,
        props: { spec: maximum, mode: "auto", maxWidth: 76 },
      },
    ];
    if (entry.meta.cli.stance === "enhanced") {
      examples.push({
        name: `${entry.meta.slug}-narrow-ascii-fallback`,
        props: { spec: representative, mode: "auto", maxWidth: 30 },
        capabilities: { columns: 30, colorDepth: "none", unicode: false },
      });
    }
    return examples;
  }));

function descriptionLineStyle(
  line: string,
  theme: TerminalTheme,
): Parameters<typeof styleText>[1] {
  if (
    line.startsWith("Title:") || /^Series \(\d+\):$/u.test(line) ||
    /^Data \(\d+ categor(?:y|ies)\):$/u.test(line)
  ) {
    return {
      color: terminalToneColor(theme, "accent"),
      ...theme.typography.strong,
    };
  }
  if (line.startsWith("Variant:")) {
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

function styledLines(
  lines: readonly string[],
  width: number,
  theme: TerminalTheme,
  capabilities: TerminalCapabilities,
): string {
  return joinVertical(
    lines.flatMap((semanticLine) =>
      wrapText(semanticLine, width).map((line) =>
        styleText(line, descriptionLineStyle(semanticLine, theme), capabilities)
      )
    ),
  );
}

function barDataTable(
  validated: ValidatedBarChart,
  width: number,
  theme: TerminalThemeVariant,
  capabilities: TerminalCapabilities,
): string {
  const unit = barUnitSuffix(validated.value);
  return renderTableCli(
    {
      layout: "responsive",
      columns: [
        { header: "Category" },
        ...validated.series.map((series) => ({
          header: series.label,
          align: "end" as const,
        })),
      ],
      rows: validated.categories.map((category, index) => [
        `${category.label} (${category.id})`,
        ...validated.series.map((series) =>
          barValueText(series.values[index] ?? null, unit)
        ),
      ]),
      theme,
      width,
    },
    capabilities,
  );
}

/**
 * Format the universal description for terminal reading: the same facts the
 * one description authority states, with the data section projected as a
 * real aligned table.
 */
function renderChartDescription(
  validated: ValidatedChart,
  description: string,
  width: number,
  themeName: TerminalThemeVariant,
  capabilities: TerminalCapabilities,
): string {
  const theme = terminalThemes[themeName];
  const lines = description.trimEnd().split("\n");
  switch (validated.kind) {
    case "bar": {
      const seriesEnd = 5 + validated.series.length;
      const dataEnd = seriesEnd + 1 + validated.categories.length;
      return composeCliBlocks([
        styledLines(lines.slice(0, 4), width, theme, capabilities),
        styledLines(lines.slice(4, seriesEnd), width, theme, capabilities),
        joinVertical([
          styledLines(
            lines.slice(seriesEnd, seriesEnd + 1),
            width,
            theme,
            capabilities,
          ),
          barDataTable(validated, width, themeName, capabilities),
        ]),
        styledLines(lines.slice(dataEnd), width, theme, capabilities),
      ]);
    }
  }
}

/**
 * Render a semantic chart for terminal use. Auto uses an enhanced kind
 * projector only while it stays inside its declared honesty tier; all
 * declines use the universal lossless description with its aligned table.
 */
const renderChartCli: CliRenderer<ChartCliProps> = (
  props,
  capabilities,
) => {
  const mode = props.mode ?? "auto";
  if (mode !== "auto" && mode !== "description") {
    throw new TypeError(
      `chart CLI mode must be auto or description; received ${String(mode)}`,
    );
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 4) {
    throw new TypeError(
      `chart CLI width must be a safe integer of at least 4; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const themeName = props.theme ?? "dark";
  if (themeName !== "light" && themeName !== "dark") {
    throw new TypeError(
      `chart CLI theme must be light or dark; received ${String(themeName)}`,
    );
  }
  const { validated, description } = prepareChartSemantics(props.spec);
  const fallback = (): string =>
    renderChartDescription(
      validated,
      description,
      width,
      themeName,
      capabilities,
    );
  if (mode === "description") return fallback();

  const projection = projectChartKindCli(validated, {
    capabilities,
    maxWidth: width,
    theme: themeName,
    description,
  });
  return projection?.kind === "frame" ? projection.frame : fallback();
};

export default renderChartCli;
