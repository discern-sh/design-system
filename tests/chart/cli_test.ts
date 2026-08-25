import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertThrows,
} from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import type { ChartKindCliProjection } from "../../src/cli/chart-kinds.ts";
import { resolveCliExampleCapabilities } from "../../src/cli/contracts.ts";
import { renderChartCli } from "../../src/cli/mod.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import { measureText } from "../../src/cli/text.ts";
import { cliExamples } from "../../src/components/editorial/chart/chart.cli.ts";
import projectBarChartCli from "../../src/chart/kinds/bar/bar.cli.ts";
import {
  barDataTableFacts,
  barUnitSuffix,
  barValueText,
} from "../../src/chart/kinds/bar/bar.description.ts";
import {
  distributionDataTableFacts,
  distributionRecordedValueRows,
} from "../../src/chart/kinds/distribution/distribution.description.ts";
import { heatmapDataTableFacts } from "../../src/chart/kinds/heatmap/heatmap.description.ts";
import { lineDataTableFacts } from "../../src/chart/kinds/line/line.description.ts";
import { scatterDataTableFacts } from "../../src/chart/kinds/scatter/scatter.description.ts";
import {
  slopeDataTableFacts,
  slopeDeltaCell,
  slopeUnitSuffix,
  slopeValueText,
} from "../../src/chart/kinds/slope/slope.description.ts";
import fixtures from "../../src/chart/kinds/bar/bar.fixtures.ts";
import type { ValidatedBarChart } from "../../src/chart/kinds/bar/bar.spec.ts";
import {
  type BarChartSpec,
  ChartValidationError,
  describeChart,
} from "../../src/chart/mod.ts";
import { projectChartKindCli } from "../../src/generated/chart-cli-registry.ts";
import { prepareChartSemantics } from "../../src/generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type {
  ChartSpec,
  ValidatedChart,
} from "../../src/generated/chart-spec.ts";

const representative = fixtures[1];
if (representative === undefined) {
  throw new TypeError("Missing representative bar fixture");
}

/** Match complete SGR sequences without a control character in a literal. */
const SGR_SEQUENCE = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "gu");

function assertClosedAndBounded(
  frame: string,
  capabilities: TerminalCapabilities,
): void {
  assert(
    !frame.includes("]"),
    "Chart CLI output must not open an OSC envelope.",
  );
  const plain = stripAnsi(frame);
  if (capabilities.colorDepth === "none") {
    assertExactFrame(frame, plain, capabilities);
  } else {
    assertStyledFrame(frame, plain, capabilities);
    for (const line of frame.split("\n")) {
      const sequences = line.match(SGR_SEQUENCE);
      if (sequences !== null) {
        assert(
          sequences.at(-1) === "\u001b[0m",
          `styled line did not close: ${JSON.stringify(line)}`,
        );
      }
    }
  }
  for (const line of plain.split("\n")) {
    assert(measureText(line) <= capabilities.columns);
  }
}

function render(
  spec: ChartSpec,
  capabilities: TerminalCapabilities,
  mode: "auto" | "description" = "auto",
): string {
  return renderChartCli(
    { spec, mode, maxWidth: capabilities.columns },
    capabilities,
  );
}

function project(
  spec: ChartSpec,
  columns: number,
  profile: Partial<TerminalCapabilities> = {},
): ChartKindCliProjection {
  const capabilities = testTerminalCapabilities({ columns, ...profile });
  const { validated, description } = prepareChartSemantics(spec);
  return projectChartKindCli(validated, {
    capabilities,
    maxWidth: columns,
    theme: "dark",
    description,
  }) as ChartKindCliProjection;
}

Deno.test("bar CLI selects the exact frame or universal description by viability", () => {
  const narrow = testTerminalCapabilities({ columns: 24 });
  assertEquals(
    render(representative, narrow, "auto"),
    render(representative, narrow, "description"),
  );
  const standard = testTerminalCapabilities({ columns: 80 });
  const enhanced = render(representative, standard, "auto");
  assert(enhanced.startsWith("┌ Quarterly reviews by region"));
  assert(enhanced !== render(representative, standard, "description"));
});

Deno.test("bar CLI is byte-stable and bounded across widths and capabilities", () => {
  for (const columns of [24, 44, 80, 96]) {
    for (const unicode of [true, false]) {
      for (
        const colorDepth of [
          "truecolor",
          "ansi256",
          "ansi16",
          "none",
        ] as const
      ) {
        const capabilities = testTerminalCapabilities({
          columns,
          unicode,
          colorDepth,
        });
        const first = render(representative, capabilities);
        for (let run = 0; run < 5; run += 1) {
          assertEquals(render(representative, capabilities), first);
        }
        assertClosedAndBounded(first, capabilities);
        if (!unicode && columns >= 80) {
          assert(
            Array.from(stripAnsi(first)).every((character) =>
              (character.codePointAt(0) ?? 0) <= 0x7f
            ),
          );
        }
      }
    }
  }
});

/** Strip frame borders and whitespace so wrapped facts compare whole. */
function compactTerminalSemantics(value: string): string {
  return stripAnsi(value)
    .split("\n")
    .map((line) => line.replace(/^[│|+]\s?/u, "").replace(/\s?[│|+]$/u, ""))
    .join("")
    .replaceAll(/\s+/gu, "");
}

/** The one facts seam per kind behind the universal description table. */
function tableFacts(validated: ValidatedChart): {
  readonly rows: readonly (readonly string[])[];
} {
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

/** Every printed fact the lossless description owes for one spec. */
function semanticFacts(spec: ChartSpec): readonly string[] {
  const { validated } = prepareChartSemantics(spec);
  return [
    validated.title,
    validated.summary,
    ...tableFacts(validated).rows.flat(),
  ];
}

/**
 * The facts every enhanced frame owes at this registry-wide level: the
 * authored context, plus bar's complete value inventory as the founding
 * exact-tier proof. Each other kind's own suite pins its tier — every
 * value for the exact kinds, extremes and stated resolution for the
 * faithful ones — in the kind's own printed wording, which lawfully
 * differs from the description table's structural cells.
 */
function frameFacts(spec: ChartSpec, _unicode: boolean): readonly string[] {
  const { validated } = prepareChartSemantics(spec);
  switch (validated.kind) {
    case "bar": {
      const unit = barUnitSuffix(validated.value);
      return [
        validated.title,
        validated.summary,
        ...validated.categories.map(({ label }) => label),
        ...validated.series.map(({ label }) => label),
        ...validated.series.flatMap(({ values }) =>
          values.map((value) =>
            barValueText(value, unit, validated.value.format)
          )
        ),
      ];
    }
    case "distribution":
      return [
        validated.title,
        validated.summary,
        ...distributionRecordedValueRows(validated).map(([index, value]) =>
          `#${index} ${value}`
        ),
      ];
    case "slope": {
      const unit = slopeUnitSuffix(validated.value);
      return [
        validated.title,
        validated.summary,
        validated.endpoints.before,
        validated.endpoints.after,
        ...validated.items.flatMap((item) => [
          slopeValueText(item.before, unit, validated.value.format),
          slopeValueText(item.after, unit, validated.value.format),
          slopeDeltaCell(item, unit, validated.value.format),
        ]),
      ];
    }
    default:
      return [validated.title, validated.summary];
  }
}

function assertCarriesFacts(
  output: string,
  facts: readonly string[],
  context: string,
): void {
  const compact = compactTerminalSemantics(output);
  for (const fact of facts) {
    assert(
      compact.includes(fact.replaceAll(/\s+/gu, "")),
      `${context} lost ${JSON.stringify(fact)}`,
    );
  }
}

function assertCarriesEveryFact(
  output: string,
  spec: ChartSpec,
  context: string,
): void {
  assertCarriesFacts(output, semanticFacts(spec), context);
}

Deno.test("frames honour their declared tier and descriptions stay lossless", () => {
  const capabilities = testTerminalCapabilities({ columns: 96 });
  for (const entry of chartKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      const spec = releaseCase.spec as ChartSpec;
      const context = `${entry.meta.slug}/${releaseCase.name}`;
      assertCarriesEveryFact(
        describeChart(spec),
        spec,
        `${context}/description`,
      );
      const projection = project(spec, 96);
      if (projection.kind !== "frame") continue;
      assertCarriesFacts(
        projection.frame,
        frameFacts(spec, true),
        `${context}/frame`,
      );
      assertEquals(render(spec, capabilities, "auto"), projection.frame);
    }
  }
});

Deno.test("quantization keeps the honesty invariants at both repertoires", () => {
  const halfStep: BarChartSpec = {
    kind: "bar",
    title: "Probe",
    summary: "One value lands exactly on an eighth-block half boundary.",
    categories: [
      { id: "a", label: "A" },
      { id: "b", label: "B" },
    ],
    series: [{ id: "value", label: "Value", values: [2.5, 64] }],
  };
  const projection = project(halfStep, 19);
  assert(projection.kind === "frame", "the probe must fit its envelope");
  const plain = stripAnsi(projection.frame);
  assert(
    plain.includes("A  ▍ 2.5"),
    "2.5 of 64 across an eight-cell field rounds half away from zero to three eighths",
  );
  assert(plain.includes("B  ████████ 64"), "the maximum fills the field");

  const subEighth: BarChartSpec = {
    ...halfStep,
    summary: "A tiny nonzero value never renders empty.",
    series: [{ id: "value", label: "Value", values: [1, 1000] }],
  };
  const tiny = project(subEighth, 20);
  assert(tiny.kind === "frame");
  assert(
    stripAnsi(tiny.frame).includes("A  ▏ 1"),
    "a nonzero value keeps at least one eighth block",
  );
  const tinyAscii = project(subEighth, 20, { unicode: false });
  assert(tinyAscii.kind === "frame");
  assert(
    stripAnsi(tinyAscii.frame).includes("A  # 1"),
    "a nonzero value keeps at least one full ASCII cell",
  );

  const withZero: BarChartSpec = {
    ...halfStep,
    summary: "Zero renders no bar while its value still prints.",
    series: [{ id: "value", label: "Value", values: [0, 64] }],
  };
  const zero = project(withZero, 19);
  assert(zero.kind === "frame");
  const zeroRow = stripAnsi(zero.frame).split("\n").find((line) =>
    line.includes("A  ")
  );
  assert(zeroRow !== undefined);
  assert(zeroRow.includes("A  0"), "zero prints its authored value");
  assert(
    !/[█▉▊▋▌▍▎▏]/u.test(zeroRow),
    "zero renders no bar glyph from the zero baseline",
  );
});

Deno.test("a sub-resolution proportion declines instead of exaggerating a share", () => {
  const skewed: BarChartSpec = {
    kind: "bar",
    title: "Skewed proportion probe",
    summary:
      "Tiny shares cannot be represented honestly beside a dominant share.",
    variant: "proportion",
    categories: [{ id: "all", label: "All" }],
    series: [
      { id: "first", label: "First", values: [1] },
      { id: "second", label: "Second", values: [1] },
      { id: "third", label: "Third", values: [98] },
    ],
  };
  const projection = project(skewed, 60, { unicode: false });
  assertEquals(projection, {
    kind: "declined",
    code: "segment-resolution",
    fact: 100,
    limit: 48,
  });
  const capabilities = testTerminalCapabilities({
    columns: 60,
    unicode: false,
  });
  assertEquals(
    render(skewed, capabilities),
    render(skewed, capabilities, "description"),
  );
});

Deno.test("declines carry the exceeded fact and route to the complete table", () => {
  const narrow = project(representative, 24);
  assertEquals(narrow, {
    kind: "declined",
    code: "width",
    fact: 24,
    limit: 32,
  });
  const capabilities = testTerminalCapabilities({ columns: 24 });
  const fallback = render(representative, capabilities, "auto");
  assertEquals(fallback, render(representative, capabilities, "description"));
  // The narrow responsive table wraps cells across interleaved column lines,
  // so contiguous matching happens at a measure where cells stay whole; the
  // Table suite owns the proof that responsive wrapping loses nothing.
  assertCarriesEveryFact(
    render(
      representative,
      testTerminalCapabilities({ columns: 160 }),
      "description",
    ),
    representative,
    "description fallback",
  );

  const longTitle: BarChartSpec = {
    ...representative,
    title: "A deliberately very long probe title that cannot embed in a border",
  };
  const titled = project(longTitle, 40);
  assert(titled.kind === "declined");
  assertEquals(titled.code, "title-width");
  assertEquals(titled.fact, measureText(longTitle.title));

  const verboseLabel = "A deliberately wordy series name";
  const wideLegend: BarChartSpec = {
    ...representative,
    series: representative.series.map((series, index) =>
      index === 0 ? { ...series, label: verboseLabel } : series
    ),
  };
  const legend = project(wideLegend, 36);
  assert(legend.kind === "declined");
  assertEquals(legend.code, "label-wrap");
  assertEquals(legend.fact, 2 + measureText(verboseLabel));
});

Deno.test("bar CLI keeps validation failures deterministic", () => {
  const capabilities = testTerminalCapabilities({ columns: 80 });
  const invalid = {
    ...representative,
    categories: [],
  } as unknown as ChartSpec;
  const first = assertThrows(() => render(invalid, capabilities));
  const second = assertThrows(() => render(invalid, capabilities));
  assertInstanceOf(first, ChartValidationError);
  assertInstanceOf(second, ChartValidationError);
  assertEquals(first.code, second.code);
  assertEquals(first.message, second.message);
});

Deno.test("Chart Catalogue CLI examples cover enhanced, deliberate description, and typed fallback postures", () => {
  const catalogueCapabilities = testTerminalCapabilities({
    columns: 160,
    colorDepth: "truecolor",
    unicode: true,
  });
  const postures = Object.fromEntries(cliExamples.map((example) => {
    const capabilities = resolveCliExampleCapabilities(
      example,
      catalogueCapabilities,
    );
    const output = stripAnsi(renderChartCli(example.props, capabilities));
    return [
      example.name,
      output.startsWith("Title:") ? "description" : "enhanced",
    ];
  }));
  for (const entry of chartKindRegistry) {
    assertEquals(
      postures[`${entry.meta.slug}-${entry.meta.cli.stance}`],
      entry.meta.cli.stance,
    );
    assertEquals(
      postures[`${entry.meta.slug}-universal-description`],
      "description",
    );
    if (entry.meta.cli.stance === "enhanced") {
      assertEquals(
        postures[`${entry.meta.slug}-structural`],
        "enhanced",
        `${entry.meta.slug} structural posture renders enhanced at review width`,
      );
      assertEquals(
        postures[`${entry.meta.slug}-maximum-density`],
        "enhanced",
        `${entry.meta.slug} density ceiling stays inside its declared tier`,
      );
      assertEquals(
        postures[`${entry.meta.slug}-narrow-ascii-fallback`],
        "description",
      );
    }
  }
  assertEquals(Object.keys(postures).length, chartKindRegistry.length * 5);
});

const terminalReleaseProfiles = (
  ["truecolor", "ansi256", "ansi16", "none"] as const
).flatMap((colorDepth) =>
  [true, false].map((unicode) => ({ colorDepth, unicode }))
);

Deno.test("generated Chart CLI matrix preserves facts across every stance and viability boundary", () => {
  const scanWidths = Array.from({ length: 137 }, (_, index) => index + 24);
  for (const entry of chartKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      const spec = releaseCase.spec as ChartSpec;
      for (const profile of terminalReleaseProfiles) {
        const context =
          `${entry.meta.slug}/${releaseCase.name}/${profile.colorDepth}/${
            profile.unicode ? "unicode" : "ascii"
          }`;
        const scan = scanWidths.map((columns) => ({
          columns,
          projection: project(spec, columns, profile),
        }));
        const selectedWidths = new Set([24, 34, 80, 120, 160]);
        for (let index = 1; index < scan.length; index += 1) {
          const before = scan[index - 1];
          const after = scan[index];
          if (
            before !== undefined && after !== undefined &&
            before.projection.kind !== after.projection.kind
          ) {
            selectedWidths.add(before.columns);
            selectedWidths.add(after.columns);
            if (after.columns < 160) selectedWidths.add(after.columns + 1);
          }
        }

        const reachedFrame = scan.some(({ projection }) =>
          projection.kind === "frame"
        );
        if (!reachedFrame) {
          // A capability decline — colourless frames past the mono series
          // envelope — is permanent by design; width alone must never be
          // the reason a corpus case has no frame by 160 columns.
          const widest = scan.at(-1)?.projection;
          assert(
            widest !== undefined && widest.kind === "declined" &&
              (widest.code === "mono-series" ||
                widest.code === "collision-count"),
            `${context} never reached an enhanced frame by 160 columns`,
          );
        }
        for (const { columns, projection } of scan) {
          const repeated = project(spec, columns, profile);
          assertEquals(repeated, projection, `${context}/${columns}`);
          if (projection.kind === "declined") {
            assert(projection.code.length > 0);
            assert(Number.isSafeInteger(projection.fact));
            assert(Number.isSafeInteger(projection.limit));
            assert(projection.fact >= 0);
            assert(projection.limit >= 0);
          }
        }

        for (const columns of [...selectedWidths].toSorted((a, b) => a - b)) {
          const capabilities = testTerminalCapabilities({
            columns,
            ...profile,
          });
          const projection = project(spec, columns, profile);
          const automatic = render(spec, capabilities);
          const description = render(spec, capabilities, "description");
          assertClosedAndBounded(automatic, capabilities);
          assertClosedAndBounded(description, capabilities);
          // Frames owe contiguous facts at every accepted width; the table's
          // interleaved cell wrapping makes contiguous matching meaningful
          // only at measures where cells stay whole, and the Table suite owns
          // the narrow losslessness proof.
          if (columns >= 120) {
            assertCarriesEveryFact(
              description,
              spec,
              `${context}/${columns}/description`,
            );
          }
          if (projection.kind === "frame") {
            assertCarriesFacts(
              automatic,
              frameFacts(spec, profile.unicode),
              `${context}/${columns}/auto`,
            );
            assertEquals(automatic, projection.frame);
            assertClosedAndBounded(projection.frame, capabilities);
          } else {
            assertEquals(
              automatic,
              description,
              `${context}/${columns} did not fall back atomically`,
            );
          }
        }
      }
    }
  }
});

Deno.test("the kind projector ignores the SVG-side orientation hint", () => {
  const vertical = projectBarChartCli(
    prepareChartSemantics({ ...representative, orientation: "vertical" })
      .validated as ValidatedBarChart & { readonly kind: "bar" },
    {
      capabilities: testTerminalCapabilities({ columns: 96 }),
      maxWidth: 96,
      theme: "dark",
      description: describeChart(representative),
    },
  );
  const horizontal = projectBarChartCli(
    prepareChartSemantics({ ...representative, orientation: "horizontal" })
      .validated as ValidatedBarChart & { readonly kind: "bar" },
    {
      capabilities: testTerminalCapabilities({ columns: 96 }),
      maxWidth: 96,
      theme: "dark",
      description: describeChart(representative),
    },
  );
  assertEquals(vertical, horizontal);
});
