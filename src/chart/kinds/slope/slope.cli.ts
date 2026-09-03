/**
 * Pure exact-tier terminal projection for validated slope charts.
 *
 * The frame is deliberately not a drawing: the kind's permanent terminal
 * form is a delta list built on the shared triangle authority — one row per
 * item stating the label, both authored values, a direction triangle, and
 * the exact signed delta — which prints every stated fact the slopegraph
 * encodes. Direction is never colour-only: the triangle glyph and the
 * delta's sign carry it in every repertoire, movement rows wear the accent
 * tone, and level rows stay muted ink, so no semantic state tone and no
 * categorical series colour is recruited.
 */

import { styleText } from "../../../cli/ansi.ts";
import { renderBox } from "../../../cli/box.ts";
import type {
  ChartKindCliDeclineCode,
  ChartKindCliProjection,
  ChartKindCliProjectorContext,
} from "../../../cli/chart-kinds.ts";
import { chartKindCliDecline } from "../../../cli/chart-kinds.ts";
import { chartFrameLabelMinimumWidth } from "../../../cli/chart-frame.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import { measureText, padText, wrapText } from "../../../cli/text.ts";
import {
  resolveTerminalTheme,
  type TerminalColor,
  type TerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import {
  type TerminalTriangle,
  triangleGlyph,
  TRIANGLES,
} from "../../../cli/triangles.ts";
import {
  slopeDeltaCell,
  slopeUnitSuffix,
  slopeValueText,
} from "./slope.description.ts";
import type {
  SlopeChartDirection,
  ValidatedSlopeChart,
  ValidatedSlopeChartItem,
} from "./slope.spec.ts";

const LABEL_GAP = 2;

/**
 * The pinned direction cues: solid up for an increase, solid down for a
 * decrease, and the solid right-pointing triangle as the level cue — the
 * value moved forward through the comparison without rising or falling.
 */
const DIRECTION_TRIANGLES: Readonly<
  Record<SlopeChartDirection, TerminalTriangle>
> = {
  up: TRIANGLES.filled.up,
  down: TRIANGLES.filled.down,
  level: TRIANGLES.filled.right,
};

function decline(
  code: ChartKindCliDeclineCode,
  fact: number,
  limit: number,
): ChartKindCliProjection {
  return chartKindCliDecline(code, fact, limit);
}

/** The fixed column plan one width either accommodates or declines. */
interface SlopeColumns {
  readonly unit: string;
  readonly separator: string;
  readonly labelColumn: number;
  readonly beforeColumn: number;
  readonly afterColumn: number;
  readonly deltaColumn: number;
}

interface SlopeViability {
  readonly refusal?: ChartKindCliProjection;
  readonly columns: SlopeColumns;
}

function widestWord(labels: readonly string[]): number {
  return Math.max(
    0,
    ...labels.flatMap((label) => label.split(/\s+/u)).map(measureText),
  );
}

function viability(
  spec: ValidatedSlopeChart,
  width: number,
  unicode: boolean,
): SlopeViability {
  const unit = slopeUnitSuffix(spec.value);
  const frameMinimum = chartFrameLabelMinimumWidth(
    `${spec.items.length} items`,
  );
  if (width < frameMinimum) {
    return {
      refusal: decline("width", width, frameMinimum),
      columns: {
        unit,
        separator: unicode ? "→" : "->",
        labelColumn: 0,
        beforeColumn: 0,
        afterColumn: 0,
        deltaColumn: 0,
      },
    };
  }
  const separator = unicode ? "→" : "->";
  const beforeColumn = Math.max(
    measureText(spec.endpoints.before),
    ...spec.items.map((item) =>
      measureText(slopeValueText(item.before, unit, spec.value.format))
    ),
  );
  const afterColumn = Math.max(
    measureText(spec.endpoints.after),
    ...spec.items.map((item) =>
      measureText(slopeValueText(item.after, unit, spec.value.format))
    ),
  );
  const deltaColumn = Math.max(
    ...spec.items.map((item) =>
      measureText(slopeDeltaCell(item, unit, spec.value.format))
    ),
  );
  // Row anatomy after the label column: the label gap, both value columns
  // around the spaced separator, then the direction triangle and delta.
  const fixed = LABEL_GAP + beforeColumn + 1 + measureText(separator) + 1 +
    afterColumn + 2 + 1 + 1 + deltaColumn;
  const inner = width - 4;
  const available = inner - fixed;
  const columns = (labelColumn: number): SlopeColumns => ({
    unit,
    separator,
    labelColumn,
    beforeColumn,
    afterColumn,
    deltaColumn,
  });
  if (available < 1) {
    return {
      refusal: decline("width", width, 4 + 1 + fixed),
      columns: columns(0),
    };
  }
  const labels = spec.items.map(({ label }) => label);
  const labelWord = widestWord(labels);
  if (labelWord > available) {
    return {
      refusal: decline("label-wrap", labelWord, available),
      columns: columns(0),
    };
  }
  return {
    columns: columns(
      Math.min(Math.max(...labels.map(measureText)), available),
    ),
  };
}

function directionColor(
  theme: TerminalTheme,
  item: ValidatedSlopeChartItem,
): TerminalColor {
  return item.direction === "level"
    ? terminalThemeColor(theme, "--discern-color-ink-muted")
    : terminalToneColor(theme, "accent");
}

function renderSlopeList(
  spec: ValidatedSlopeChart,
  context: ChartKindCliProjectorContext,
  width: number,
  columns: SlopeColumns,
): string {
  const { capabilities } = context;
  const theme = resolveTerminalTheme(context);
  const summary = styleText(
    `Summary: ${spec.summary}`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      ...theme.typography.body,
    },
    capabilities,
  );
  const header = styleText(
    `${" ".repeat(columns.labelColumn + LABEL_GAP)}${
      padText(spec.endpoints.before, columns.beforeColumn, "end")
    } ${columns.separator} ${
      padText(spec.endpoints.after, columns.afterColumn, "end")
    }`,
    {
      color: terminalThemeColor(theme, "--discern-color-ink-faint"),
      ...theme.typography.annotation,
    },
    capabilities,
  );
  const rows = spec.items.flatMap((item) => {
    const [first = "", ...continuations] = wrapText(
      item.label,
      columns.labelColumn,
    );
    const color = directionColor(theme, item);
    const triangle = styleText(
      triangleGlyph(DIRECTION_TRIANGLES[item.direction], capabilities.unicode),
      { color },
      capabilities,
    );
    const delta = styleText(
      padText(
        slopeDeltaCell(item, columns.unit, spec.value.format),
        columns.deltaColumn,
        "end",
      ),
      { color },
      capabilities,
    );
    return [
      `${padText(first, columns.labelColumn)}${" ".repeat(LABEL_GAP)}${
        padText(
          slopeValueText(item.before, columns.unit, spec.value.format),
          columns.beforeColumn,
          "end",
        )
      } ${columns.separator} ${
        padText(
          slopeValueText(item.after, columns.unit, spec.value.format),
          columns.afterColumn,
          "end",
        )
      }  ${triangle} ${delta}`,
      ...continuations,
    ];
  });
  return renderBox(
    {
      title: spec.title,
      body: composeCliBlocks([summary, joinVertical([header, ...rows])]),
      width,
      borderStyle: {
        color: terminalThemeColor(theme, "--discern-color-border-strong"),
      },
      bottomLabel: `${spec.items.length} items`,
      bottomLabelStyle: {
        color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        ...theme.typography.annotation,
      },
    },
    capabilities,
  );
}

/** Project one exact delta-list frame, or decline without losing any fact. */
const projectSlopeChartCli = (
  spec: ValidatedSlopeChart,
  context: ChartKindCliProjectorContext,
): ChartKindCliProjection => {
  const width = Math.min(context.maxWidth, context.capabilities.columns);
  const checked = viability(spec, width, context.capabilities.unicode);
  if (checked.refusal !== undefined) return checked.refusal;
  const titleWidth = measureText(spec.title);
  if (titleWidth > width - 6) {
    return decline("title-width", titleWidth, width - 6);
  }
  return {
    kind: "frame",
    frame: renderSlopeList(spec, context, width, checked.columns),
  };
};

export default projectSlopeChartCli;
