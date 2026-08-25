import {
  assert,
  assertAlmostEquals,
  assertEquals,
  assertThrows,
} from "@std/assert";
import {
  CHART_LOG_BASE,
  chartBandSegment,
  chartLinearPosition,
  chartLogPosition,
  createChartBandScale,
  createChartLinearScale,
  createChartLogScale,
} from "../../src/chart/scale.ts";
import { chartLinearTicks, chartLogTicks } from "../../src/chart/ticks.ts";

function labels(set: ReturnType<typeof chartLinearTicks>): readonly string[] {
  return set.ticks.map((tick) => tick.label);
}

Deno.test("nice steps follow the 1-2-5 progression with exact thresholds", () => {
  const hundred = chartLinearTicks({
    minimum: 0,
    maximum: 100,
    targetCount: 5,
    subject: "test",
  });
  assertEquals(hundred.step, { mantissa: 2, exponent: 1 });
  assertEquals(labels(hundred), ["0", "20", "40", "60", "80", "100"]);
  assertEquals(hundred.decimals, 0);

  const sixty = chartLinearTicks({
    minimum: 0,
    maximum: 60,
    targetCount: 5,
    subject: "test",
  });
  assertEquals(sixty.step, { mantissa: 2, exponent: 1 });

  const seven = chartLinearTicks({
    minimum: 0,
    maximum: 7,
    targetCount: 5,
    subject: "test",
  });
  assertEquals(seven.step, { mantissa: 2, exponent: 0 });
  assertEquals(labels(seven), ["0", "2", "4", "6", "8"]);

  const thirty = chartLinearTicks({
    minimum: 0,
    maximum: 30,
    targetCount: 4,
    subject: "test",
  });
  assertEquals(thirty.step, { mantissa: 1, exponent: 1 });
  assertEquals(labels(thirty), ["0", "10", "20", "30"]);
});

Deno.test("ticks cover the domain outward and the last tick reaches the maximum", () => {
  const set = chartLinearTicks({
    minimum: 0,
    maximum: 93,
    targetCount: 5,
    subject: "test",
  });
  const first = set.ticks[0];
  const last = set.ticks.at(-1);
  assert(first !== undefined && last !== undefined);
  assert(first.number <= 0);
  assert(last.number >= 93);
});

Deno.test("fractional domains keep exact labels with derived precision", () => {
  const fractions = chartLinearTicks({
    minimum: 0,
    maximum: 0.3,
    targetCount: 4,
    subject: "test",
  });
  assertEquals(fractions.step, { mantissa: 1, exponent: -1 });
  assertEquals(fractions.decimals, 1);
  assertEquals(labels(fractions), ["0.0", "0.1", "0.2", "0.3"]);

  const accumulation = chartLinearTicks({
    minimum: 0,
    maximum: 0.7,
    targetCount: 8,
    subject: "test",
  });
  assertEquals(
    labels(accumulation),
    ["0.0", "0.1", "0.2", "0.3", "0.4", "0.5", "0.6", "0.7"],
  );

  const tiny = chartLinearTicks({
    minimum: 0,
    maximum: 0.0000003,
    targetCount: 4,
    subject: "test",
  });
  assertEquals(tiny.decimals, 7);
  assertEquals(
    labels(tiny),
    ["0.0000000", "0.0000001", "0.0000002", "0.0000003"],
  );
});

Deno.test("negative domains label through the same integer arithmetic", () => {
  const set = chartLinearTicks({
    minimum: -10,
    maximum: 25,
    targetCount: 5,
    subject: "test",
  });
  assertEquals(set.step, { mantissa: 1, exponent: 1 });
  assertEquals(labels(set), ["-10", "0", "10", "20", "30"]);
});

Deno.test("large domains group tick labels canonically", () => {
  const set = chartLinearTicks({
    minimum: 0,
    maximum: 45_000,
    targetCount: 5,
    subject: "test",
  });
  assertEquals(labels(set), [
    "0",
    "10,000",
    "20,000",
    "30,000",
    "40,000",
    "50,000",
  ]);
});

Deno.test("equal domains produce deeply equal tick sets", () => {
  const options = {
    minimum: 0,
    maximum: 87.5,
    targetCount: 6,
    subject: "test",
  } as const;
  assertEquals(chartLinearTicks(options), chartLinearTicks(options));
});

Deno.test("degenerate or hostile tick domains are refused", () => {
  assertThrows(
    () =>
      chartLinearTicks({
        minimum: 5,
        maximum: 5,
        targetCount: 4,
        subject: "test",
      }),
    TypeError,
    "span upward",
  );
  assertThrows(
    () =>
      chartLinearTicks({
        minimum: 0,
        maximum: Number.POSITIVE_INFINITY,
        targetCount: 4,
        subject: "test",
      }),
    TypeError,
    "finite",
  );
  assertThrows(
    () =>
      chartLinearTicks({
        minimum: 0,
        maximum: 10,
        targetCount: 1,
        subject: "test",
      }),
    TypeError,
    "between 2 and 12",
  );
});

Deno.test("linear scales position values proportionally, including inverted ranges", () => {
  const scale = createChartLinearScale({
    domainMin: 0,
    domainMax: 100,
    rangeStart: 240,
    rangeEnd: 0,
    subject: "test",
  });
  assertEquals(chartLinearPosition(scale, 0), 240);
  assertEquals(chartLinearPosition(scale, 100), 0);
  assertEquals(chartLinearPosition(scale, 25), 180);
  assertThrows(
    () =>
      createChartLinearScale({
        domainMin: 10,
        domainMax: 10,
        rangeStart: 0,
        rangeEnd: 100,
        subject: "test",
      }),
    TypeError,
    "span upward",
  );
});

Deno.test("log ticks mark decades outward across wide spans", () => {
  const set = chartLogTicks({ minimum: 3, maximum: 800, subject: "test" });
  assertEquals(set.subdivided, false);
  assertEquals(
    set.ticks.map((tick) => tick.label),
    ["1", "10", "100", "1,000"],
  );
  const first = set.ticks[0];
  const last = set.ticks.at(-1);
  assert(first !== undefined && last !== undefined);
  assert(first.number <= 3);
  assert(last.number >= 800);
});

Deno.test("log ticks subdivide narrow spans at the 2 and 5 mantissas", () => {
  const set = chartLogTicks({ minimum: 1, maximum: 100, subject: "test" });
  assertEquals(set.subdivided, true);
  assertEquals(
    set.ticks.map((tick) => tick.label),
    ["1", "2", "5", "10", "20", "50", "100"],
  );
});

Deno.test("log ticks keep exact natural precision below one", () => {
  const set = chartLogTicks({ minimum: 0.05, maximum: 3, subject: "test" });
  assertEquals(set.subdivided, false);
  assertEquals(
    set.ticks.map((tick) => tick.label),
    ["0.01", "0.1", "1", "10"],
  );
  const subdivided = chartLogTicks({
    minimum: 0.2,
    maximum: 4,
    subject: "test",
  });
  assertEquals(subdivided.subdivided, true);
  assertEquals(
    subdivided.ticks.map((tick) => tick.label),
    ["0.2", "0.5", "1", "2", "5"],
  );
});

Deno.test("equal log domains produce deeply equal tick sets", () => {
  const options = { minimum: 2.5, maximum: 4_800, subject: "test" } as const;
  assertEquals(chartLogTicks(options), chartLogTicks(options));
});

Deno.test("degenerate or non-positive log tick domains are refused", () => {
  assertThrows(
    () => chartLogTicks({ minimum: 0, maximum: 10, subject: "test" }),
    TypeError,
    "strictly positive",
  );
  assertThrows(
    () => chartLogTicks({ minimum: -1, maximum: 10, subject: "test" }),
    TypeError,
    "strictly positive",
  );
  assertThrows(
    () => chartLogTicks({ minimum: 5, maximum: 5, subject: "test" }),
    TypeError,
    "span upward",
  );
  assertThrows(
    () =>
      chartLogTicks({
        minimum: 1,
        maximum: Number.POSITIVE_INFINITY,
        subject: "test",
      }),
    TypeError,
    "finite",
  );
});

Deno.test("log scales position decades evenly and refuse non-positive facts", () => {
  assertEquals(CHART_LOG_BASE, 10);
  const scale = createChartLogScale({
    domainMin: 1,
    domainMax: 1_000,
    rangeStart: 240,
    rangeEnd: 0,
    subject: "test",
  });
  assertAlmostEquals(chartLogPosition(scale, 1), 240, 1e-9);
  assertAlmostEquals(chartLogPosition(scale, 10), 160, 1e-9);
  assertAlmostEquals(chartLogPosition(scale, 100), 80, 1e-9);
  assertAlmostEquals(chartLogPosition(scale, 1_000), 0, 1e-9);
  assertThrows(
    () => chartLogPosition(scale, 0),
    TypeError,
    "strictly positive",
  );
  assertThrows(
    () =>
      createChartLogScale({
        domainMin: 0,
        domainMax: 10,
        rangeStart: 0,
        rangeEnd: 100,
        subject: "test",
      }),
    TypeError,
    "strictly positive",
  );
  assertThrows(
    () =>
      createChartLogScale({
        domainMin: 10,
        domainMax: 10,
        rangeStart: 0,
        rangeEnd: 100,
        subject: "test",
      }),
    TypeError,
    "span upward",
  );
});

Deno.test("band scales share one step with symmetric edge half-gaps", () => {
  const scale = createChartBandScale({
    count: 4,
    rangeStart: 0,
    rangeEnd: 100,
    gapRatio: 0.2,
    subject: "test",
  });
  assertEquals(scale.step, 25);
  assertEquals(scale.bandWidth, 20);
  assertEquals(chartBandSegment(scale, 0), { start: 2.5, width: 20 });
  assertEquals(chartBandSegment(scale, 3), { start: 77.5, width: 20 });
  assertThrows(() => chartBandSegment(scale, 4), TypeError, "0..3");
  assertThrows(
    () =>
      createChartBandScale({
        count: 0,
        rangeStart: 0,
        rangeEnd: 100,
        gapRatio: 0.2,
        subject: "test",
      }),
    TypeError,
    "positive integer",
  );
});
