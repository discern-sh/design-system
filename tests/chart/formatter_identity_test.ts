import { assert } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import { chartNumberText, chartValueText } from "../../src/chart/value-text.ts";
import type { ChartValueAxisSpec } from "../../src/chart/spec.ts";
import { renderChartSvg } from "../../src/chart/mod.ts";
import { projectChartKindCli } from "../../src/generated/chart-cli-registry.ts";
import {
  prepareChart,
  prepareChartSemantics,
} from "../../src/generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type {
  ChartSpec,
  ValidatedChart,
} from "../../src/generated/chart-spec.ts";

function compact(value: string): string {
  return stripAnsi(value).replaceAll(/\s+/gu, "");
}

function valueText(value: number, axis: ChartValueAxisSpec): string {
  const unit = axis.unit === undefined ? "" : ` ${axis.unit}`;
  return chartValueText(value, unit, axis.format);
}

function descriptionNumerals(validated: ValidatedChart): readonly string[] {
  switch (validated.kind) {
    case "bar":
      return validated.series.flatMap(({ values }) =>
        values.flatMap((value) =>
          value === null ? [] : [valueText(value, validated.value)]
        )
      );
    case "line": {
      const x = validated.x;
      const domainNumerals = x.kind === "number"
        ? x.values.map((value) => chartNumberText(value, x.format))
        : x.values;
      return [
        ...domainNumerals,
        ...validated.series.flatMap(({ values }) =>
          values.flatMap((value) =>
            value === null ? [] : [valueText(value, validated.value)]
          )
        ),
      ];
    }
    case "distribution":
      return validated.authoredValues.map((value) =>
        valueText(value, validated.value)
      );
    case "heatmap":
      return validated.cells.flatMap(({ value }) =>
        value === null ? [] : [valueText(value, validated.value)]
      );
    case "scatter":
      return validated.series.flatMap(({ points }) =>
        points.flatMap(({ x, y }) => [
          valueText(x, validated.x),
          valueText(y, validated.y),
        ])
      );
    case "slope":
      return validated.items.flatMap(({ before, after }) => [
        valueText(before, validated.value),
        valueText(after, validated.value),
      ]);
  }
}

function frameNumerals(validated: ValidatedChart): readonly string[] {
  switch (validated.kind) {
    case "bar":
    case "distribution":
    case "slope":
      return descriptionNumerals(validated);
    case "line": {
      const x = validated.x;
      const domainNumerals = x.kind === "number"
        ? x.values.map((value) => chartNumberText(value, x.format))
        : x.values;
      const first = domainNumerals[0];
      const last = domainNumerals.at(-1);
      return [
        valueText(validated.minimumValue, validated.value),
        valueText(validated.maximumValue, validated.value),
        ...(first === undefined ? [] : [first]),
        ...(last === undefined ? [] : [last]),
      ];
    }
    case "heatmap": {
      const values = validated.cells.flatMap(({ value }) =>
        value === null ? [] : [value]
      );
      return [
        valueText(Math.min(...values), validated.value),
        valueText(Math.max(...values), validated.value),
        ...validated.binRangeLabels,
      ];
    }
    case "scatter":
      return [
        valueText(validated.minimumX, validated.x),
        valueText(validated.maximumX, validated.x),
        valueText(validated.minimumY, validated.y),
        valueText(validated.maximumY, validated.y),
      ];
  }
}

function escapeXmlText(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(
    ">",
    "&gt;",
  );
}

Deno.test("formatter corpus keeps one numeral identity across SVG, description, and CLI", () => {
  const capabilities = testTerminalCapabilities({
    columns: 200,
    colorDepth: "truecolor",
    unicode: true,
  });
  for (const entry of chartKindRegistry) {
    const formatterCase = entry.releaseCorpus.cases.find(({ postures }) =>
      postures.some((posture) => posture === "formatter-table")
    );
    assert(formatterCase !== undefined, `${entry.meta.slug} formatter corpus`);
    const spec = formatterCase.spec as ChartSpec;
    const semantic = prepareChartSemantics(spec);
    const description = compact(semantic.description);
    for (const numeral of descriptionNumerals(semantic.validated)) {
      assert(
        description.includes(compact(numeral)),
        `${entry.meta.slug} description diverged at ${JSON.stringify(numeral)}`,
      );
    }

    const projection = projectChartKindCli(semantic.validated, {
      capabilities,
      maxWidth: capabilities.columns,
      theme: "dark",
      description: semantic.description,
    });
    assert(
      projection?.kind === "frame",
      `${entry.meta.slug} formatter corpus must reach its declared frame`,
    );
    const frame = compact(projection.frame);
    for (const numeral of frameNumerals(semantic.validated)) {
      assert(
        frame.includes(compact(numeral)),
        `${entry.meta.slug} CLI diverged at ${JSON.stringify(numeral)}`,
      );
    }

    const prepared = prepareChart(spec);
    const svg = renderChartSvg(spec);
    for (const label of prepared.scene.elements) {
      if (label.kind !== "tick-label") continue;
      assert(
        svg.includes(`>${escapeXmlText(label.text)}</text>`),
        `${entry.meta.slug} SVG diverged from scene numeral ${
          JSON.stringify(label.text)
        }`,
      );
    }
    assert(!svg.includes("NaN") && !svg.includes("Infinity"));
  }
});
