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
import { barDataTableFacts } from "../../../chart/kinds/bar/bar.description.ts";
import { distributionDataTableFacts } from "../../../chart/kinds/distribution/distribution.description.ts";
import { heatmapDataTableFacts } from "../../../chart/kinds/heatmap/heatmap.description.ts";
import { lineDataTableFacts } from "../../../chart/kinds/line/line.description.ts";
import { scatterDataTableFacts } from "../../../chart/kinds/scatter/scatter.description.ts";
import { slopeDataTableFacts } from "../../../chart/kinds/slope/slope.description.ts";
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

/** One inventory or data heading of the shared description skeleton. */
function isDescriptionSectionHeader(line: string): boolean {
  return /^[^:]+ \(\d[^)]*\):$/u.test(line);
}

function descriptionLineStyle(
  line: string,
  theme: TerminalTheme,
): Parameters<typeof styleText>[1] {
  if (line.startsWith("Title:") || isDescriptionSectionHeader(line)) {
    return {
      color: terminalToneColor(theme, "accent"),
      ...theme.typography.strong,
    };
  }
  if (/^(?:Variant|Grid|Comparison):/u.test(line)) {
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

/** The kind-owned data-table facts behind the universal description. */
interface ChartDataTableFacts {
  readonly columns: readonly {
    readonly header: string;
    readonly numeric: boolean;
  }[];
  readonly rows: readonly (readonly string[])[];
}

/** One exhaustive seam per kind: the exact rows the description states. */
function chartDataTableFacts(validated: ValidatedChart): ChartDataTableFacts {
  switch (validated.kind) {
    case "bar":
      return barDataTableFacts(validated);
    case "line":
      return lineDataTableFacts(validated);
    case "distribution":
      return distributionDataTableFacts(validated);
    case "heatmap":
      return heatmapDataTableFacts(validated);
    case "scatter":
      return scatterDataTableFacts(validated);
    case "slope":
      return slopeDataTableFacts(validated);
  }
}

function dataTable(
  facts: ChartDataTableFacts,
  width: number,
  theme: TerminalThemeVariant,
  capabilities: TerminalCapabilities,
): string {
  return renderTableCli(
    {
      layout: "responsive",
      columns: facts.columns.map((column) =>
        column.numeric
          ? { header: column.header, align: "end" as const }
          : { header: column.header }
      ),
      rows: facts.rows,
      theme,
      width,
    },
    capabilities,
  );
}

/**
 * Format the universal description for terminal reading: the same facts the
 * one description authority states, split into its heading-led sections,
 * with the data section's rows projected as a real aligned table. The
 * splicer is kind-agnostic — every kind's description follows the shared
 * skeleton, and each kind supplies only its table facts.
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
  const facts = chartDataTableFacts(validated);
  const headerIndexes = lines.flatMap((line, index) =>
    index > 0 && isDescriptionSectionHeader(line) ? [index] : []
  );
  const sectionStarts = [0, ...headerIndexes, lines.length];
  const blocks: string[] = [];
  for (let section = 0; section + 1 < sectionStarts.length; section += 1) {
    const start = sectionStarts[section];
    const end = sectionStarts[section + 1];
    if (start === undefined || end === undefined || start >= end) continue;
    const heading = lines[start];
    if (heading !== undefined && heading.startsWith("Data (")) {
      const rowsEnd = start + 1 + facts.rows.length;
      blocks.push(joinVertical([
        styledLines(lines.slice(start, start + 1), width, theme, capabilities),
        dataTable(facts, width, themeName, capabilities),
      ]));
      if (rowsEnd < end) {
        blocks.push(
          styledLines(lines.slice(rowsEnd, end), width, theme, capabilities),
        );
      }
      continue;
    }
    blocks.push(
      styledLines(lines.slice(start, end), width, theme, capabilities),
    );
  }
  return composeCliBlocks(blocks);
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
