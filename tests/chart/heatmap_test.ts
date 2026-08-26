import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { conformChartScene } from "../../src/chart/conformance.ts";
import {
  ChartBudgetError,
  ChartValidationError,
} from "../../src/chart/errors.ts";
import { CHART_RELEASE_POSTURES } from "../../src/chart/kind-meta.ts";
import type { ChartMark, ChartTickLabel } from "../../src/chart/scene.ts";
import projectHeatmapChartCli from "../../src/chart/kinds/heatmap/heatmap.cli.ts";
import describeHeatmapChart, {
  heatmapDataTableFacts,
} from "../../src/chart/kinds/heatmap/heatmap.description.ts";
import { releaseCorpus } from "../../src/chart/kinds/heatmap/heatmap.fixtures.ts";
import layoutHeatmapChart from "../../src/chart/kinds/heatmap/heatmap.layout.ts";
import heatmapKindMeta from "../../src/chart/kinds/heatmap/heatmap.meta.ts";
import type { ValidatedHeatmapChart } from "../../src/chart/kinds/heatmap/heatmap.spec.ts";
import validateHeatmapChart from "../../src/chart/kinds/heatmap/heatmap.validation.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  chartKindCliDecline,
  type ChartKindCliProjection,
} from "../../src/cli/chart-kinds.ts";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";

function corpusSpec(name: string): unknown {
  const found = releaseCorpus.cases.find((entry) => entry.name === name);
  assert(found !== undefined, `corpus case ${name} exists`);
  return found.spec;
}

function prepare(spec: unknown): {
  readonly validated: ValidatedHeatmapChart;
  readonly sceneJson: string;
  readonly description: string;
} {
  const validated = validateHeatmapChart(spec);
  const scene = conformChartScene(layoutHeatmapChart(validated));
  return {
    validated,
    sceneJson: JSON.stringify(scene),
    description: describeHeatmapChart(validated),
  };
}

function project(
  spec: unknown,
  columns: number,
  overrides: Partial<TerminalCapabilities> = {},
): ChartKindCliProjection {
  const validated = validateHeatmapChart(spec);
  const capabilities = testTerminalCapabilities({ columns, ...overrides });
  return projectHeatmapChartCli(validated, {
    capabilities,
    maxWidth: columns,
    theme: "light",
    description: describeHeatmapChart(validated),
  });
}

function plainFrame(projection: ChartKindCliProjection): string {
  assert(projection.kind === "frame", "expected an enhanced frame");
  return stripAnsi(projection.frame);
}

Deno.test("every corpus case validates, lays out, conforms, and describes deterministically", () => {
  for (const entry of releaseCorpus.cases) {
    const first = prepare(entry.spec);
    const second = prepare(entry.spec);
    assertEquals(
      first.sceneJson,
      second.sceneJson,
      `${entry.name} must lay out byte-identically`,
    );
    assertEquals(
      first.description,
      second.description,
      `${entry.name} must describe byte-identically`,
    );
    assertStringIncludes(
      first.description,
      `Title: ${first.validated.title}`,
    );
  }
  const postures = new Set(
    releaseCorpus.cases.flatMap((entry) => entry.postures),
  );
  for (const posture of CHART_RELEASE_POSTURES) {
    assert(postures.has(posture), `corpus covers ${posture}`);
  }
});

Deno.test("every invalid corpus case refuses with its declared code", () => {
  for (const entry of releaseCorpus.invalid) {
    const error = assertThrows(
      () => validateHeatmapChart(entry.spec),
      ChartValidationError,
      undefined,
      entry.name,
    );
    assertEquals(error.code, entry.code, `${entry.name} refusal code`);
  }
});

Deno.test("more than four bins is refused, never silently re-binned", () => {
  const error = assertThrows(
    () => validateHeatmapChart(releaseCorpus.overBudget.spec),
    ChartBudgetError,
  );
  assertEquals(error.dimension, releaseCorpus.overBudget.dimension);
  assertEquals(error.authorAction, releaseCorpus.overBudget.authorAction);
  assertEquals(error.limit, heatmapKindMeta.budgets["bins"]?.limit);
  assertEquals(error.actual, 5);
});

Deno.test("the metadata pins order, budgets, and the faithful enhanced stance", () => {
  assertEquals(heatmapKindMeta.slug, "heatmap");
  assertEquals(heatmapKindMeta.order, 40);
  assertEquals(heatmapKindMeta.cli, {
    stance: "enhanced",
    honesty: "faithful",
  });
  assertEquals(heatmapKindMeta.budgets["rows"]?.limit, 20);
  assertEquals(heatmapKindMeta.budgets["columns"]?.limit, 14);
});

Deno.test("a 1 × 1 grid is refused as no grid at all", () => {
  const error = assertThrows(
    () =>
      validateHeatmapChart({
        kind: "heatmap",
        title: "Single cell",
        summary: "One value has no grid to read across.",
        rows: [{ id: "only", label: "Only" }],
        columns: [{ id: "one", label: "One" }],
        values: [[3]],
        bins: { edges: [1] },
      }),
    ChartValidationError,
  );
  assertEquals(error.code, "chart/invalid-spec");
});

Deno.test("bin assignment is exact decimal comparison with thresholds in the upper bin", () => {
  const validated = validateHeatmapChart({
    kind: "heatmap",
    title: "Threshold probe",
    summary: "Values around each threshold pin the exact bin rule.",
    rows: [{ id: "probe", label: "Probe" }],
    columns: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
      { id: "c", label: "C" },
      { id: "d", label: "D" },
    ],
    values: [[9.999, 10, 20, 25]],
    bins: { edges: [10, 20] },
  });
  assertEquals(validated.cells.map((cell) => cell.bin), [1, 2, 3, 3]);

  const float = validateHeatmapChart({
    kind: "heatmap",
    title: "Float artifact probe",
    summary: "An accumulation artifact above the edge stays in the upper bin.",
    rows: [{ id: "probe", label: "Probe" }],
    columns: [
      { id: "exact", label: "Exact" },
      { id: "artifact", label: "Artifact" },
    ],
    values: [[0.3, 0.30000000000000004]],
    bins: { edges: [0.3] },
  });
  assertEquals(float.cells.map((cell) => cell.bin), [2, 2]);
});

Deno.test("the description follows the pinned skeleton and states every bin edge", () => {
  const { validated, description } = prepare(corpusSpec("weekly-activity"));
  const lines = description.trimEnd().split("\n");
  assertEquals(lines.length, 7 + validated.rows.length);
  assertEquals(lines[2], "Grid: 5 rows × 4 columns.");
  assertEquals(
    lines[3],
    "Bins (4, Events): below 5 events; 5 events to below 15 events; 15 events to below 30 events; 30 events and above.",
  );
  assertEquals(lines[4], "Data (5 rows):");
  assertEquals(
    lines[5],
    "Mon (mon): Morning 3 events, Midday 12 events, Afternoon 27 events, Evening 41 events",
  );
  assertEquals(lines[10], "Largest value: 41 events (Mon, Evening).");
  assertEquals(lines[11], "Smallest stated value: 0 events (Tue, Morning).");
  for (const label of validated.binRangeLabels) {
    assertStringIncludes(description, label);
  }

  const strip = prepare(corpusSpec("single-row-strip"));
  assertStringIncludes(strip.description, "Grid: 1 row × 7 columns.");
});

Deno.test("gaps stay distinct from zero in the description", () => {
  const { description } = prepare(corpusSpec("weekly-activity"));
  assertStringIncludes(description, "Morning 0 events");
  assertStringIncludes(description, "Midday no stated value");
});

Deno.test("the data-table facts mirror the description's data lines 1:1", () => {
  const { validated, description } = prepare(corpusSpec("weekly-activity"));
  const facts = heatmapDataTableFacts(validated);
  assertEquals(facts.columns[0], { header: "Row", numeric: false });
  assertEquals(facts.columns.length, 1 + validated.columns.length);
  for (const column of facts.columns.slice(1)) {
    assertEquals(column.numeric, true);
  }
  assertEquals(facts.rows.length, validated.rows.length);
  assertEquals(facts.rows[2], [
    "Wed (wed)",
    "4 events",
    "no stated value",
    "22 events",
    "36 events",
  ]);
  const dataLines = description.trimEnd().split("\n").slice(
    5,
    5 + validated.rows.length,
  );
  facts.rows.forEach((row, index) => {
    const line = dataLines[index];
    assert(line !== undefined);
    for (const cell of row) {
      assertStringIncludes(line, cell);
    }
  });
});

Deno.test("the scene paints stated cells on the ramp and omits gap marks", () => {
  const validated = validateHeatmapChart(corpusSpec("weekly-activity"));
  const scene = conformChartScene(layoutHeatmapChart(validated));
  const marks = scene.elements.filter(
    (element): element is ChartMark => element.kind === "mark",
  );
  const statedCells = validated.cells.filter((cell) => cell.bin !== null);
  assertEquals(marks.length, statedCells.length);
  for (const mark of marks) {
    assertMatch(mark.paint, /^ramp-[1-4]$/u);
  }
  assert(
    marks.every((mark) => mark.id !== "mark-wed-midday"),
    "a declared gap emits no mark",
  );
  const threshold = marks.find((mark) => mark.id === "mark-fri-evening");
  assert(threshold !== undefined);
  assertEquals(threshold.paint, "ramp-4");

  const labels = scene.elements.filter(
    (element): element is ChartTickLabel => element.kind === "tick-label",
  );
  assertEquals(labels.length, validated.rows.length + validated.columns.length);
  for (const label of labels) {
    assertEquals(
      label.anchor,
      label.id.startsWith("row-label-") ? "end" : "middle",
    );
  }
});

Deno.test("the frame states every bin edge, both extremes, and the grid census", () => {
  const validated = validateHeatmapChart(corpusSpec("weekly-activity"));
  const plain = plainFrame(project(corpusSpec("weekly-activity"), 80));
  for (const label of validated.binRangeLabels) {
    assertStringIncludes(plain, label);
  }
  assertStringIncludes(plain, "Largest value: 41 events (Mon, Evening).");
  assertStringIncludes(
    plain,
    "Smallest stated value: 0 events (Tue, Morning).",
  );
  assertStringIncludes(plain, "5 rows · 4 columns");
});

Deno.test("unicode cells shade the ramp while ASCII cells print exact bin digits", () => {
  const unicode = plainFrame(project(corpusSpec("weekly-activity"), 80));
  assertMatch(unicode, /Mon\s+░░\s+▒▒\s+▓▓\s+██/u);
  assertMatch(unicode, /Wed\s+░░\s+·\s+▓▓\s+██/u);

  const ascii = plainFrame(
    project(corpusSpec("weekly-activity"), 80, { unicode: false }),
  );
  assertMatch(ascii, /Mon\s+11\s+22\s+33\s+44/u);
  assertMatch(ascii, /Wed\s+11\s+\.\s+33\s+44/u);
  assertStringIncludes(ascii, "5 rows | 4 columns");
});

Deno.test("a zero-valued cell renders the first bin, never the gap glyph", () => {
  const unicode = plainFrame(project(corpusSpec("weekly-activity"), 80));
  assertMatch(unicode, /Tue\s+░░\s+▒▒\s+▓▓\s+██/u);
  const ascii = plainFrame(
    project(corpusSpec("weekly-activity"), 80, { unicode: false }),
  );
  assertMatch(ascii, /Tue\s+11\s+22\s+33\s+44/u);
});

Deno.test("declines carry the exceeded fact and its limit", () => {
  assertEquals(
    project(corpusSpec("weekly-activity"), 15),
    chartKindCliDecline("width", 15, 23),
  );
  assertEquals(
    project(corpusSpec("weekly-activity"), 24),
    chartKindCliDecline("label-wrap", 32, 15),
  );
  assertEquals(
    project(
      {
        kind: "heatmap",
        title: "Long row label",
        summary: "One over-wide row label cannot fit its column.",
        rows: [{ id: "long", label: "Cross-functional review" }],
        columns: [
          { id: "am", label: "AM" },
          { id: "pm", label: "PM" },
        ],
        values: [[1, 2]],
        bins: { edges: [2] },
      },
      24,
    ),
    chartKindCliDecline("label-wrap", 23, 13),
  );
  assertEquals(
    project(
      {
        kind: "heatmap",
        title: "A deliberately overlong probe title",
        summary: "The title cannot embed in the frame border.",
        rows: [{ id: "total", label: "Total" }],
        columns: [
          { id: "am", label: "AM" },
          { id: "pm", label: "PM" },
        ],
        values: [[3, 14]],
        bins: { edges: [10] },
      },
      40,
    ),
    chartKindCliDecline("title-width", 35, 34),
  );
});

Deno.test("projection is byte-stable and bounded across widths and repertoires", () => {
  for (const columns of [24, 44, 80, 120]) {
    for (const unicode of [true, false]) {
      const first = project(corpusSpec("weekly-activity"), columns, {
        unicode,
      });
      const second = project(corpusSpec("weekly-activity"), columns, {
        unicode,
      });
      assertEquals(second, first);
      if (first.kind !== "frame") continue;
      for (const line of first.frame.split("\n")) {
        assert(
          measureText(line) <= columns,
          `line stays within ${columns} columns`,
        );
        if (!unicode) {
          assertMatch(
            stripAnsi(line),
            /^[\x20-\x7E]*$/u,
            "ASCII frames stay pure printable ASCII",
          );
        }
      }
    }
  }
});
