import { assertEquals, assertThrows } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { renderSparklineCli } from "../../src/cli/mod.ts";
import { Sparkline } from "../../src/react.ts";
import {
  assertExactFrame,
  assertStyledFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";
import {
  sparklineAnnotation,
  sparklineLevels,
} from "../../src/components/display/sparkline/sparkline.shared.ts";

const MOVEMENT = [3.2, 4.1, 3.8, 5.5, 7.4, 9.1] as const;

Deno.test("Sparkline renders the vertical ramp with its endpoint annotation", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertExactFrame(
    renderSparklineCli({ values: [...MOVEMENT] }, capabilities),
    "▁▂▂▄▆█ 3.2→9.1",
    capabilities,
  );
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const styled = testTerminalCapabilities({ colorDepth, columns: 40 });
    assertStyledFrame(
      renderSparklineCli({ values: [...MOVEMENT] }, styled),
      "▁▂▂▄▆█ 3.2→9.1",
      styled,
    );
  }
});

Deno.test("Sparkline ASCII degrades to declared height levels, never blanks", () => {
  const ascii = testTerminalCapabilities({ columns: 40, unicode: false });
  assertExactFrame(
    renderSparklineCli({ values: [...MOVEMENT] }, ascii),
    "___==# 3.2->9.1",
    ascii,
  );
});

Deno.test("Sparkline renders explicit nulls as the declared gap character", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertExactFrame(
    renderSparklineCli({ values: [12, null, 14, 19, null, 23] }, capabilities),
    "▁·▂▅·█ 12→23",
    capabilities,
  );
  const ascii = testTerminalCapabilities({ columns: 40, unicode: false });
  assertExactFrame(
    renderSparklineCli({ values: [12, null, 14, 19, null, 23] }, ascii),
    "_._=.# 12->23",
    ascii,
  );
});

Deno.test("a flat series maps to the middle glyph, never all-min or all-max", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertExactFrame(
    renderSparklineCli({ values: [5, 5, 5, 5, 5] }, capabilities),
    "▄▄▄▄▄ 5→5",
    capabilities,
  );
});

Deno.test("bucket ties round half-away-from-zero", () => {
  assertEquals(sparklineLevels([0, 1, 2]), [1, 5, 8]);
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertExactFrame(
    renderSparklineCli({ values: [0, 1, 2] }, capabilities),
    "▁▅█ 0→2",
    capabilities,
  );
});

Deno.test("Sparkline shares finite overflow-safe geometry across browser and terminal", () => {
  const values = [-Number.MAX_VALUE, 0, Number.MAX_VALUE] as const;
  assertEquals(sparklineLevels(values), [1, 5, 8]);
  const html = renderToStaticMarkup(createElement(Sparkline, { values }));
  assertEquals(html.includes("NaN"), false);
  assertEquals(html.includes("Infinity"), false);
  assertEquals(html.includes("0,29 50,16 100,3"), true);
});

Deno.test("the annotation prints canonical decimals in every charset", () => {
  assertEquals(
    sparklineAnnotation([0.30000000000000004, 1, 2], true),
    "0.30000000000000004→2",
  );
  assertEquals(sparklineAnnotation([3.2, null, 9.1], false), "3.2->9.1");
  assertEquals(sparklineAnnotation([null, 4, 7, null], true), "4→7");
});

Deno.test("Sparkline refuses series that cannot state truthful movement", () => {
  const capabilities = testTerminalCapabilities({ columns: 40 });
  assertThrows(
    () => renderSparklineCli({ values: [5] }, capabilities),
    TypeError,
    "at least two entries",
  );
  assertThrows(
    () => renderSparklineCli({ values: [null, null] }, capabilities),
    TypeError,
    "at least one finite value",
  );
  assertThrows(
    () =>
      renderSparklineCli(
        { values: [1, Number.POSITIVE_INFINITY] },
        capabilities,
      ),
    TypeError,
    "finite number or an explicit null gap",
  );
  assertThrows(
    () =>
      renderSparklineCli(
        { values: Array.from({ length: 101 }, (_, index) => index) },
        testTerminalCapabilities({ columns: 200 }),
      ),
    TypeError,
    "at most 100 entries",
  );
  assertThrows(
    () =>
      renderSparklineCli({ values: [...MOVEMENT], maxWidth: 0 }, capabilities),
    TypeError,
    "positive safe integer",
  );
});

Deno.test("Sparkline refuses widths that would truncate the run or annotation", () => {
  const narrow = testTerminalCapabilities({ columns: 10 });
  assertThrows(
    () => renderSparklineCli({ values: [...MOVEMENT] }, narrow),
    TypeError,
    "columns",
  );
});
