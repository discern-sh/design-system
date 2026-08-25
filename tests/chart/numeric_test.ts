import { assertEquals, assertThrows } from "@std/assert";
import {
  chartDecimalFromNumber,
  chartDecimalToNumber,
  compareChartDecimals,
  normalizeChartDecimal,
  renderChartDecimal,
  roundChartDecimal,
} from "../../src/chart/decimal.ts";
import {
  type ChartNumberFormat,
  formatChartNumber,
} from "../../src/chart/format.ts";

Deno.test("decimal parsing reads the canonical shortest form exactly", () => {
  assertEquals(chartDecimalFromNumber(0.1, "test"), {
    coefficient: 1n,
    exponent: -1,
  });
  assertEquals(chartDecimalFromNumber(-3.25, "test"), {
    coefficient: -325n,
    exponent: -2,
  });
  assertEquals(chartDecimalFromNumber(1e21, "test"), {
    coefficient: 1n,
    exponent: 21,
  });
  assertEquals(chartDecimalFromNumber(1.5e-7, "test"), {
    coefficient: 15n,
    exponent: -8,
  });
  assertEquals(chartDecimalFromNumber(0, "test"), {
    coefficient: 0n,
    exponent: 0,
  });
  assertEquals(chartDecimalFromNumber(1250, "test"), {
    coefficient: 1250n,
    exponent: 0,
  });
  assertThrows(
    () => chartDecimalFromNumber(Number.NaN, "test"),
    TypeError,
    "test must be a finite number",
  );
  assertThrows(
    () => chartDecimalFromNumber(Number.POSITIVE_INFINITY, "test"),
    TypeError,
    "test must be a finite number",
  );
});

Deno.test("rounding is half-away-from-zero in both directions", () => {
  const round = (value: number, exponent: number): string =>
    renderChartDecimal(
      roundChartDecimal(chartDecimalFromNumber(value, "test"), exponent),
    );
  assertEquals(round(2.5, 0), "3");
  assertEquals(round(-2.5, 0), "-3");
  assertEquals(round(2.4, 0), "2");
  assertEquals(round(-2.4, 0), "-2");
  assertEquals(round(0.125, -2), "0.13");
  assertEquals(round(-0.125, -2), "-0.13");
  assertEquals(round(1.005, -2), "1.01");
  assertEquals(round(9.999, -2), "10.00");
  assertEquals(round(3, -2), "3.00");
});

Deno.test("decimal rendering assembles digits, signs, and grouping exactly", () => {
  assertEquals(renderChartDecimal({ coefficient: 0n, exponent: -2 }), "0.00");
  assertEquals(renderChartDecimal({ coefficient: -1n, exponent: -2 }), "-0.01");
  assertEquals(renderChartDecimal({ coefficient: 2n, exponent: 3 }), "2000");
  assertEquals(
    renderChartDecimal({ coefficient: 1234567n, exponent: 0 }, true),
    "1,234,567",
  );
  assertEquals(
    renderChartDecimal({ coefficient: -1234567891n, exponent: -2 }, true),
    "-12,345,678.91",
  );
  assertEquals(renderChartDecimal({ coefficient: 15n, exponent: -1 }), "1.5");
});

Deno.test("comparison and normalization are exact across exponents", () => {
  const of = (value: number): ReturnType<typeof chartDecimalFromNumber> =>
    chartDecimalFromNumber(value, "test");
  assertEquals(compareChartDecimals(of(0.3), of(0.30000001)), -1);
  assertEquals(
    compareChartDecimals(of(100), { coefficient: 1n, exponent: 2 }),
    0,
  );
  assertEquals(compareChartDecimals(of(-5), of(2)), -1);
  assertEquals(
    normalizeChartDecimal({ coefficient: 25000n, exponent: -3 }),
    { coefficient: 25n, exponent: 0 },
  );
  assertEquals(
    normalizeChartDecimal({ coefficient: 0n, exponent: 5 }),
    { coefficient: 0n, exponent: 0 },
  );
  assertEquals(chartDecimalToNumber({ coefficient: 25n, exponent: -1 }), 2.5);
});

Deno.test("the decimal format renders fixed precision and canonical grouping", () => {
  const decimal = (decimals: number, grouping?: boolean): ChartNumberFormat =>
    grouping === undefined
      ? { kind: "decimal", decimals }
      : { kind: "decimal", decimals, grouping };
  assertEquals(formatChartNumber(0.1 + 0.2, decimal(2)), "0.30");
  assertEquals(
    formatChartNumber(1234567.891, decimal(2, true)),
    "1,234,567.89",
  );
  assertEquals(formatChartNumber(-1234.5, decimal(0, true)), "-1,235");
  assertEquals(formatChartNumber(42, decimal(0)), "42");
  assertEquals(formatChartNumber(2.675, decimal(2)), "2.68");
  assertEquals(formatChartNumber(0.615, decimal(2)), "0.62");
  assertEquals(formatChartNumber(-0.615, decimal(2)), "-0.62");
});

Deno.test("the percent format scales by exponent shift, never by multiplication", () => {
  assertEquals(
    formatChartNumber(0.125, { kind: "percent", decimals: 1 }),
    "12.5%",
  );
  assertEquals(formatChartNumber(1, { kind: "percent", decimals: 0 }), "100%");
  assertEquals(
    formatChartNumber(0.005, { kind: "percent", decimals: 1 }),
    "0.5%",
  );
  assertEquals(
    formatChartNumber(-0.3333, { kind: "percent", decimals: 1 }),
    "-33.3%",
  );
});

Deno.test("the SI format selects ASCII prefixes and carries rounding overflow", () => {
  const si = (decimals: number): ChartNumberFormat => ({
    kind: "si",
    decimals,
  });
  assertEquals(formatChartNumber(12_500, si(1)), "12.5k");
  assertEquals(formatChartNumber(999_960, si(1)), "1.0M");
  assertEquals(formatChartNumber(4_200_000, si(0)), "4M");
  assertEquals(formatChartNumber(0.0000042, si(1)), "4.2u");
  assertEquals(formatChartNumber(0.25, si(2)), "250.00m");
  assertEquals(formatChartNumber(0, si(0)), "0");
  assertEquals(formatChartNumber(-1_500, si(1)), "-1.5k");
  assertEquals(formatChartNumber(2e18, si(0)), "2,000P");
});

Deno.test("format precision outside the closed contract is refused", () => {
  assertThrows(
    () => formatChartNumber(1, { kind: "decimal", decimals: -1 }),
    TypeError,
    "between 0 and 12",
  );
  assertThrows(
    () => formatChartNumber(1, { kind: "decimal", decimals: 1.5 }),
    TypeError,
    "between 0 and 12",
  );
  assertThrows(
    () => formatChartNumber(Number.NaN, { kind: "decimal", decimals: 0 }),
    TypeError,
    "finite",
  );
});

Deno.test("the public formatter refuses every runtime escape from its closed vocabulary", () => {
  for (
    const [format, message] of [
      [null, "must be a chart number format object"],
      [{ kind: "fresh", decimals: 0 }, "kind must be one of"],
      [{ kind: "decimal", decimals: 0, grouping: "yes" }, "grouping must be a boolean"],
      [{ kind: "percent", decimals: 0, grouping: true }, "unsupported field grouping"],
      [{ kind: "si", decimals: 0, extra: true }, "unsupported field extra"],
    ] as const
  ) {
    assertThrows(
      () => formatChartNumber(1_234.5, format as unknown as ChartNumberFormat),
      TypeError,
      message,
    );
  }

  const customPrototype = { kind: "decimal", decimals: 0 };
  Object.setPrototypeOf(customPrototype, { inherited: true });
  assertThrows(
    () =>
      formatChartNumber(
        1,
        customPrototype as unknown as ChartNumberFormat,
      ),
    TypeError,
    "must be a chart number format object",
  );
});
