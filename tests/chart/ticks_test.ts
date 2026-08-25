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
import {
  chartLinearTicks,
  chartLogTicks,
  chartTimeTicks,
} from "../../src/chart/ticks.ts";
import {
  CHART_MAX_DATE_ORDINAL,
  parseChartIsoDate,
} from "../../src/chart/dates.ts";

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

Deno.test("linear tick interval selection never underflows or overflows through binary arithmetic", () => {
  const denormal = chartLinearTicks({
    minimum: 0,
    maximum: Number.MIN_VALUE,
    targetCount: 12,
    subject: "test",
  });
  assertEquals(denormal.step, { mantissa: 5, exponent: -324 });
  assertEquals(
    denormal.ticks.map((tick) => tick.number),
    [0, Number.MIN_VALUE],
  );

  const enormous = chartLinearTicks({
    minimum: -1e308,
    maximum: 1e308,
    targetCount: 5,
    subject: "test",
  });
  assertEquals(enormous.step, { mantissa: 5, exponent: 307 });
  assertEquals(
    enormous.ticks.map((tick) => tick.number),
    [-1e308, -5e307, 0, 5e307, 1e308],
  );
});

Deno.test("nice-step thresholds compare the exact decimal span to the integer divisor", () => {
  assertEquals(
    chartLinearTicks({
      minimum: 0,
      maximum: 6,
      targetCount: 5,
      subject: "test",
    }).step,
    { mantissa: 2, exponent: 0 },
  );
  assertEquals(
    chartLinearTicks({
      minimum: 0,
      maximum: 12,
      targetCount: 5,
      subject: "test",
    }).step,
    { mantissa: 5, exponent: 0 },
  );
  assertEquals(
    chartLinearTicks({
      minimum: 0,
      maximum: 28,
      targetCount: 5,
      subject: "test",
    }).step,
    { mantissa: 1, exponent: 1 },
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

function ordinalOf(iso: string): number {
  return parseChartIsoDate(iso, "test").ordinal;
}

function timeLabels(
  set: ReturnType<typeof chartTimeTicks>,
): readonly string[] {
  return set.ticks.map((tick) => tick.label);
}

Deno.test("time ticks walk single days with full ISO labels", () => {
  const set = chartTimeTicks({
    minimumOrdinal: ordinalOf("2024-03-01"),
    maximumOrdinal: ordinalOf("2024-03-04"),
    targetCount: 5,
    subject: "test",
  });
  assertEquals(set.unit, "day");
  assertEquals(set.step, 1);
  assertEquals(timeLabels(set), [
    "2024-03-01",
    "2024-03-02",
    "2024-03-03",
    "2024-03-04",
  ]);
});

Deno.test("weekly time ticks land on Mondays by construction", () => {
  const set = chartTimeTicks({
    minimumOrdinal: ordinalOf("2024-03-05"),
    maximumOrdinal: ordinalOf("2024-04-02"),
    targetCount: 6,
    subject: "test",
  });
  assertEquals(set.unit, "day");
  assertEquals(set.step, 7);
  assertEquals(timeLabels(set), [
    "2024-03-04",
    "2024-03-11",
    "2024-03-18",
    "2024-03-25",
    "2024-04-01",
    "2024-04-08",
  ]);
  for (const tick of set.ticks) assertEquals(tick.ordinal % 7, 0);
});

Deno.test("month time ticks cover the domain outward at month starts", () => {
  const set = chartTimeTicks({
    minimumOrdinal: ordinalOf("2023-11-15"),
    maximumOrdinal: ordinalOf("2024-03-10"),
    targetCount: 6,
    subject: "test",
  });
  assertEquals(set.unit, "month");
  assertEquals(set.step, 1);
  assertEquals(timeLabels(set), [
    "2023-11",
    "2023-12",
    "2024-01",
    "2024-02",
    "2024-03",
    "2024-04",
  ]);
});

Deno.test("half-year time ticks align to January and July", () => {
  const set = chartTimeTicks({
    minimumOrdinal: ordinalOf("2023-02-10"),
    maximumOrdinal: ordinalOf("2024-11-05"),
    targetCount: 8,
    subject: "test",
  });
  assertEquals(set.unit, "month");
  assertEquals(set.step, 6);
  assertEquals(timeLabels(set), [
    "2023-01",
    "2023-07",
    "2024-01",
    "2024-07",
    "2025-01",
  ]);
});

Deno.test("decade time ticks align to calendar decades", () => {
  const set = chartTimeTicks({
    minimumOrdinal: ordinalOf("2013-05-01"),
    maximumOrdinal: ordinalOf("2047-08-09"),
    targetCount: 6,
    subject: "test",
  });
  assertEquals(set.unit, "year");
  assertEquals(set.step, 10);
  assertEquals(timeLabels(set), ["2010", "2020", "2030", "2040", "2050"]);
});

Deno.test("time ticks clamp outward coverage at the calendar edge", () => {
  const set = chartTimeTicks({
    minimumOrdinal: ordinalOf("9999-03-01"),
    maximumOrdinal: ordinalOf("9999-12-31"),
    targetCount: 2,
    subject: "test",
  });
  assertEquals(set.unit, "year");
  assertEquals(timeLabels(set), ["9999", "9999-12-31"]);
  assertEquals(set.ticks.at(-1)?.ordinal, CHART_MAX_DATE_ORDINAL);
});

Deno.test("equal time domains produce deeply equal tick sets", () => {
  const options = {
    minimumOrdinal: ordinalOf("2024-01-05"),
    maximumOrdinal: ordinalOf("2024-09-20"),
    targetCount: 6,
    subject: "test",
  } as const;
  assertEquals(chartTimeTicks(options), chartTimeTicks(options));
});

Deno.test("hostile time tick domains are refused", () => {
  assertThrows(
    () =>
      chartTimeTicks({
        minimumOrdinal: -1,
        maximumOrdinal: 10,
        targetCount: 4,
        subject: "test",
      }),
    TypeError,
    "representable calendar",
  );
  assertThrows(
    () =>
      chartTimeTicks({
        minimumOrdinal: 0,
        maximumOrdinal: CHART_MAX_DATE_ORDINAL + 1,
        targetCount: 4,
        subject: "test",
      }),
    TypeError,
    "representable calendar",
  );
  assertThrows(
    () =>
      chartTimeTicks({
        minimumOrdinal: 100,
        maximumOrdinal: 100,
        targetCount: 4,
        subject: "test",
      }),
    TypeError,
    "span upward",
  );
  assertThrows(
    () =>
      chartTimeTicks({
        minimumOrdinal: 0,
        maximumOrdinal: 10,
        targetCount: 1,
        subject: "test",
      }),
    TypeError,
    "between 2 and 12",
  );
});

Deno.test("chart date parsing binds the chart refusal vocabulary", () => {
  assertEquals(ordinalOf("0001-01-01"), 0);
  assertEquals(ordinalOf("9999-12-31"), CHART_MAX_DATE_ORDINAL);
  assertThrows(
    () => parseChartIsoDate("2024/01/01", "spec.x"),
    Error,
    "canonical YYYY-MM-DD",
  );
  assertThrows(
    () => parseChartIsoDate("2023-02-29", "spec.x"),
    Error,
    "does not exist",
  );
  assertThrows(
    () => parseChartIsoDate(20240101, "spec.x"),
    Error,
    "calendar date string",
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
