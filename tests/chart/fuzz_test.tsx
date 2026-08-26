import {
  assert,
  assertEquals,
  assertInstanceOf,
  assertNotMatch,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { renderChartCli, renderMarkdownCli } from "../../src/cli/mod.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  chartAltText,
  ChartValidationError,
  describeChart,
  renderChartMarkdownImage,
  renderChartSvg,
} from "../../src/chart/mod.ts";
import {
  prepareChart,
  validateChart,
} from "../../src/generated/chart-dispatch.ts";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";
import type { ChartSpec } from "../../src/generated/chart-spec.ts";
import { Chart, Markdown, MarkdownParseError } from "../../src/react.ts";

const capabilities = testTerminalCapabilities({
  colorDepth: "ansi16",
  columns: 96,
  unicode: true,
});
const resourceSource = "./fuzz-chart.svg";

interface ErrorIdentity {
  readonly name: string;
  readonly code: string;
  readonly message: string;
  readonly path: string | undefined;
  readonly remedy: string;
}

interface BoundaryAction {
  readonly name: string;
  readonly run: () => unknown;
}

type BoundaryOutcome =
  | { readonly kind: "output"; readonly value: string }
  | { readonly kind: "error"; readonly value: ErrorIdentity };

function errorIdentity(error: unknown): ErrorIdentity {
  if (error instanceof MarkdownParseError) {
    return {
      name: error.name,
      code: "markdown/parse",
      message: error.message,
      path: undefined,
      remedy: "Reject the malformed registered resource before projection.",
    };
  }
  assertInstanceOf(error, ChartValidationError);
  return {
    name: error.name,
    code: error.code,
    message: error.message,
    path: error.path,
    remedy: error.remedy,
  };
}

function publicBoundaryActions(spec: unknown): readonly BoundaryAction[] {
  const typed = spec as ChartSpec;
  const resource = { source: resourceSource, spec: typed } as const;
  const markdownSource = (): string => renderChartMarkdownImage(resource);
  return [
    { name: "validate", run: () => validateChart(spec) },
    { name: "scene", run: () => prepareChart(spec).scene },
    { name: "description", run: () => describeChart(typed) },
    { name: "alt", run: () => chartAltText(typed) },
    { name: "svg", run: () => renderChartSvg(typed) },
    { name: "markdown-image", run: () => renderChartMarkdownImage(resource) },
    { name: "cli", run: () => renderChartCli({ spec: typed }, capabilities) },
    {
      name: "react",
      run: () => renderToStaticMarkup(<Chart spec={typed} />),
    },
    {
      name: "markdown-cli",
      run: () =>
        renderMarkdownCli(
          { source: markdownSource(), charts: [resource] },
          capabilities,
        ),
    },
    {
      name: "markdown-react",
      run: () =>
        renderToStaticMarkup(
          <Markdown source={markdownSource()} charts={[resource]} />,
        ),
    },
  ];
}

function outputIdentity(output: unknown): string {
  return typeof output === "string" ? output : JSON.stringify(output);
}

function assertSafeOutput(output: string, context: string): void {
  assert(output.length > 0, `${context} returned empty partial output`);
  assert(output.length < 10_000_000, `${context} returned unbounded output`);
  assertNotMatch(output, /<(?:script|foreignObject|iframe)\b/iu, context);
  assertNotMatch(output, /\s(?:href|xlink:href|on[a-z]+)=["']/iu, context);
  assertNotMatch(
    output,
    /(?:^|[^\w])(?:NaN|[+-]?Infinity)(?:[^\w]|$)/u,
    context,
  );
}

function actionOutcome(
  action: BoundaryAction,
  context: string,
): BoundaryOutcome {
  try {
    const value = outputIdentity(action.run());
    assertSafeOutput(value, `${context}/${action.name}`);
    return { kind: "output", value };
  } catch (error) {
    return { kind: "error", value: errorIdentity(error) };
  }
}

function assertBoundaryDeterminism(
  spec: unknown,
  context: string,
  expected: "safe" | "refusal" | "either",
): void {
  for (const action of publicBoundaryActions(spec)) {
    const first = actionOutcome(action, context);
    const second = actionOutcome(action, context);
    assertEquals(second, first, `${context}/${action.name} drifted`);
    if (expected !== "either") {
      assertEquals(
        first.kind,
        expected === "safe" ? "output" : "error",
        `${context}/${action.name} crossed the all-or-nothing boundary`,
      );
    }
  }
}

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 0x1_0000_0000;
  };
}

type DataPath = readonly (string | number)[];

function matchingPaths(
  value: unknown,
  predicate: (value: unknown, key: string | number | undefined) => boolean,
  path: DataPath = [],
): readonly DataPath[] {
  const key = path.at(-1);
  const matches = predicate(value, key) ? [path] : [];
  if (Array.isArray(value)) {
    return [
      ...matches,
      ...value.flatMap((member, index) =>
        matchingPaths(member, predicate, [...path, index])
      ),
    ];
  }
  if (value === null || typeof value !== "object") return matches;
  return [
    ...matches,
    ...Object.entries(value).flatMap(([name, member]) =>
      matchingPaths(member, predicate, [...path, name])
    ),
  ];
}

function replaceAtPath(base: unknown, path: DataPath, value: unknown): unknown {
  const cloned = structuredClone(base);
  let cursor = cloned as Record<string | number, unknown>;
  for (const key of path.slice(0, -1)) {
    cursor = cursor[key] as Record<string | number, unknown>;
  }
  const final = path.at(-1);
  assert(final !== undefined, "a replacement path names one field");
  cursor[final] = value;
  return cloned;
}

function nextBinary64(value: number, direction: "up" | "down"): number {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setFloat64(0, value);
  let bits = view.getBigUint64(0);
  if (direction === "up") bits += 1n;
  else bits -= 1n;
  view.setBigUint64(0, bits);
  return view.getFloat64(0);
}

function representativeSpec(
  entry: typeof chartKindRegistry[number],
): ChartSpec {
  const representative = entry.releaseCorpus.cases.find(({ postures }) =>
    postures.some((posture) => posture === "representative")
  )?.spec;
  assert(
    representative !== undefined,
    `${entry.meta.slug} has a representative`,
  );
  return representative as ChartSpec;
}

Deno.test("the generated corpus succeeds or refuses atomically at every public boundary", () => {
  for (const entry of chartKindRegistry) {
    for (const releaseCase of entry.releaseCorpus.cases) {
      assertBoundaryDeterminism(
        releaseCase.spec,
        `${entry.meta.slug}/${releaseCase.name}`,
        "safe",
      );
    }
    for (const invalid of entry.releaseCorpus.invalid) {
      assertBoundaryDeterminism(
        invalid.spec,
        `${entry.meta.slug}/${invalid.name}`,
        "refusal",
      );
    }
    assertBoundaryDeterminism(
      entry.releaseCorpus.overBudget.spec,
      `${entry.meta.slug}/over-budget`,
      "refusal",
    );
  }
});

const COUNT_BUDGET_UNITS = new Set([
  "series",
  "categories",
  "points",
  "values",
  "bins",
  "rows",
  "columns",
  "items",
]);

function countBoundarySpec(
  kind: string,
  dimension: string,
  count: number,
): unknown {
  const labels = (prefix: string, length: number) =>
    Array.from({ length }, (_, index) => ({
      id: `${prefix}-${index + 1}`,
      label: `${prefix.toUpperCase()} ${index + 1}`,
    }));
  switch (`${kind}/${dimension}`) {
    case "bar/series":
    case "bar/categories": {
      const categoryCount = dimension === "categories" ? count : 2;
      const seriesCount = dimension === "series" ? count : 1;
      return {
        kind: "bar",
        title: "Bar count boundary",
        summary: "A generated bar case sits beside one declared count limit.",
        categories: labels("category", categoryCount),
        series: labels("series", seriesCount).map(({ id, label }, slot) => ({
          id,
          label,
          values: Array.from(
            { length: categoryCount },
            (_, index) => 10 + slot + index,
          ),
        })),
      };
    }
    case "line/series":
    case "line/points": {
      const pointCount = dimension === "points" ? count : 3;
      const seriesCount = dimension === "series" ? count : 1;
      return {
        kind: "line",
        title: "Line count boundary",
        summary: "A generated line case sits beside one declared count limit.",
        x: {
          kind: "number",
          values: Array.from({ length: pointCount }, (_, index) => index + 1),
        },
        series: labels("series", seriesCount).map(({ id, label }, slot) => ({
          id,
          label,
          values: Array.from(
            { length: pointCount },
            (_, index) => 10 + slot * 3 + index % 7,
          ),
        })),
      };
    }
    case "distribution/values": {
      return {
        kind: "distribution",
        title: "Distribution value boundary",
        summary: "A generated sample sits beside the recorded-value limit.",
        values: Array.from({ length: count }, (_, index) => index % 101),
        bins: { kind: "rule", rule: "sturges" },
      };
    }
    case "distribution/bins": {
      return {
        kind: "distribution",
        title: "Distribution bin boundary",
        summary: "A generated histogram sits beside the declared-bin limit.",
        values: [0, count],
        bins: {
          kind: "edges",
          values: Array.from({ length: count + 1 }, (_, index) => index),
        },
      };
    }
    case "heatmap/rows":
    case "heatmap/columns":
    case "heatmap/bins": {
      const rowCount = dimension === "rows" ? count : 2;
      const columnCount = dimension === "columns" ? count : 2;
      const binCount = dimension === "bins" ? count : 2;
      return {
        kind: "heatmap",
        title: "Heatmap count boundary",
        summary: "A generated grid sits beside one declared count limit.",
        rows: labels("row", rowCount),
        columns: labels("column", columnCount),
        values: Array.from({ length: rowCount }, (_, row) =>
          Array.from(
            { length: columnCount },
            (_, column) => (row + column) % binCount,
          )),
        bins: {
          edges: Array.from({ length: binCount - 1 }, (_, index) => index + 1),
        },
      };
    }
    case "scatter/series":
    case "scatter/pointsPerSeries": {
      const seriesCount = dimension === "series" ? count : 1;
      const pointCount = dimension === "pointsPerSeries" ? count : 2;
      return {
        kind: "scatter",
        title: "Scatter count boundary",
        summary:
          "A generated scatter case sits beside one declared count limit.",
        series: labels("series", seriesCount).map(({ id, label }, slot) => ({
          id,
          label,
          points: Array.from({ length: pointCount }, (_, index) => ({
            x: index + 1,
            y: (index * 7 + slot * 11) % 97,
          })),
        })),
      };
    }
    case "slope/items": {
      return {
        kind: "slope",
        title: "Slope count boundary",
        summary: "A generated slope case sits beside the declared item limit.",
        items: labels("item", count).map(({ id, label }, index) => ({
          id,
          label,
          before: (index + 1) * 10,
          after: (count - index) * 10,
        })),
      };
    }
    default:
      throw new TypeError(`Unenrolled count budget ${kind}/${dimension}`);
  }
}

Deno.test("every count budget is fuzzed immediately below, at, and above its limit", () => {
  for (const entry of chartKindRegistry) {
    for (const [dimension, budget] of Object.entries(entry.meta.budgets)) {
      if (!COUNT_BUDGET_UNITS.has(budget.unit)) continue;
      for (const offset of [-1, 0, 1] as const) {
        const count = budget.limit + offset;
        assertBoundaryDeterminism(
          countBoundarySpec(entry.meta.slug, dimension, count),
          `${entry.meta.slug}/budget/${dimension}/${count}`,
          offset > 0 ? "refusal" : "safe",
        );
      }
    }
  }
});

Deno.test("fixed-seed numeric hostility stays deterministic across every projection", () => {
  const random = seededRandom(0x6a_c4_a2_7);
  const finiteHostility = [
    Number.MIN_VALUE,
    -Number.MIN_VALUE,
    -0,
    0,
    0.615,
    0.1 + 0.2,
    nextBinary64(1e21, "down"),
    1e21,
    nextBinary64(1e21, "up"),
    Number.MAX_VALUE,
    -Number.MAX_VALUE,
  ] as const;
  for (const entry of chartKindRegistry) {
    const base = representativeSpec(entry);
    const numericPaths = matchingPaths(
      base,
      (value) => typeof value === "number",
    );
    assert(numericPaths.length > 0, `${entry.meta.slug} carries numeric data`);

    for (const value of [Number.NaN, Infinity, -Infinity]) {
      for (const path of numericPaths) {
        assertBoundaryDeterminism(
          replaceAtPath(base, path, value),
          `${entry.meta.slug}/non-finite/${path.join(".")}/${String(value)}`,
          "refusal",
        );
      }
    }

    for (let run = 0; run < 18; run += 1) {
      const path = numericPaths[Math.floor(random() * numericPaths.length)]!;
      const value = finiteHostility[
        Math.floor(random() * finiteHostility.length)
      ]!;
      assertBoundaryDeterminism(
        replaceAtPath(base, path, value),
        `${entry.meta.slug}/finite-${run}/${path.join(".")}`,
        "either",
      );
    }

    for (let run = 0; run < Math.min(8, numericPaths.length); run += 1) {
      const path = numericPaths[Math.floor(random() * numericPaths.length)]!;
      assertBoundaryDeterminism(
        replaceAtPath(base, path, null),
        `${entry.meta.slug}/null-${run}/${path.join(".")}`,
        "either",
      );
    }
  }
});

Deno.test("pathological domains never leak float-shaped or partial output", () => {
  const line = (
    name: string,
    x: readonly number[],
    values: readonly number[],
    scale: "linear" | "log" = "linear",
  ): ChartSpec => ({
    kind: "line",
    title: `Hostile ${name}`,
    summary: "A fixed hostile domain probes one deterministic boundary.",
    x: { kind: "number", values: x },
    value: { scale },
    series: [{ id: "value", label: "Value", values }],
  } as unknown as ChartSpec);
  const cases = [
    line("tiny span", [1, 1 + Number.EPSILON, 1 + 2 * Number.EPSILON], [
      Number.MIN_VALUE,
      2 * Number.MIN_VALUE,
      3 * Number.MIN_VALUE,
    ]),
    line("reversed domain", [3, 2, 1], [3, 2, 1]),
    line("zero width", [1, 1, 1], [-0, -0, -0]),
    line("straddling zero", [-1, 0, 1], [-1, 0, 1]),
    line("many orders", [1, 2, 3], [Number.MIN_VALUE, 1, Number.MAX_VALUE]),
    line(
      "many log orders",
      [1, 2, 3],
      [Number.MIN_VALUE, 1, Number.MAX_VALUE],
      "log",
    ),
    line("format boundary", [1, 2, 3], [
      nextBinary64(1e21, "down"),
      1e21,
      nextBinary64(1e21, "up"),
    ]),
  ];
  cases.forEach((spec, index) =>
    assertBoundaryDeterminism(spec, `domain/${index}`, "either")
  );
});

function commonHostileCases(base: ChartSpec): readonly {
  readonly name: string;
  readonly spec: unknown;
}[] {
  const withExtra = (value: unknown): Record<string, unknown> => ({
    ...(structuredClone(base) as unknown as Record<string, unknown>),
    hostile: value,
  });
  const customPrototype = structuredClone(base) as object;
  Object.setPrototypeOf(customPrototype, { polluted: true });
  const prototypeKey = JSON.parse(JSON.stringify(base)) as Record<
    string,
    unknown
  >;
  Object.defineProperty(prototypeKey, "__proto__", {
    enumerable: true,
    value: { polluted: true },
  });
  const nested: Record<string, unknown> = {};
  let cursor = nested;
  for (let depth = 0; depth < 40; depth += 1) {
    const child: Record<string, unknown> = {};
    cursor.child = child;
    cursor = child;
  }
  const throwingProxy = new Proxy({}, {
    ownKeys(): never {
      throw new Error("ambient ownKeys failure");
    },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();
  const cycle = withExtra(null);
  cycle.hostile = cycle;
  return [
    { name: "root-null", spec: null },
    { name: "root-array", spec: [] },
    { name: "nan-extra", spec: withExtra(Number.NaN) },
    { name: "positive-infinity-extra", spec: withExtra(Infinity) },
    { name: "negative-infinity-extra", spec: withExtra(-Infinity) },
    { name: "function", spec: withExtra(() => undefined) },
    { name: "symbol", spec: withExtra(Symbol("hostile")) },
    { name: "bigint", spec: withExtra(1n) },
    { name: "date", spec: withExtra(new Date(0)) },
    { name: "custom-prototype", spec: customPrototype },
    { name: "prototype-key", spec: prototypeKey },
    { name: "cycle", spec: cycle },
    { name: "excessive-depth", spec: withExtra(nested) },
    { name: "throwing-proxy", spec: throwingProxy },
    { name: "revoked-proxy", spec: revoked.proxy },
  ];
}

Deno.test("prototype-shaped objects, hostile text, and inspection traps stay typed", () => {
  const safeLabels = [
    "<tag> & value",
    '"quoted" XML',
    "cafe\u0301 naïve",
    "設計 العربية",
  ] as const;
  const unsafeLabels = [
    "Unsafe\u0000label",
    "Unsafe\u001b[31mlabel",
    "Unsafe\u202elabel",
    "Unsafe\u2066label",
    "Unsafe\ud800label",
  ] as const;
  for (const entry of chartKindRegistry) {
    const base = representativeSpec(entry);
    for (const hostile of commonHostileCases(base)) {
      assertBoundaryDeterminism(
        hostile.spec,
        `${entry.meta.slug}/${hostile.name}`,
        "refusal",
      );
    }
    const textPaths = matchingPaths(
      base,
      (value, key) =>
        typeof value === "string" &&
        (key === "title" || key === "summary" || key === "label"),
    );
    const labelPath = textPaths.find((path) => path.at(-1) === "label") ??
      textPaths[0];
    assert(labelPath !== undefined);
    for (const label of safeLabels) {
      assertBoundaryDeterminism(
        replaceAtPath(base, labelPath, label),
        `${entry.meta.slug}/safe-label/${label}`,
        "safe",
      );
    }
    for (const label of unsafeLabels) {
      assertBoundaryDeterminism(
        replaceAtPath(base, labelPath, label),
        `${entry.meta.slug}/unsafe-label/${JSON.stringify(label)}`,
        "refusal",
      );
    }
  }
});

Deno.test("validated chart snapshots detach deeply from later caller mutation", () => {
  for (const entry of chartKindRegistry) {
    const original = structuredClone(representativeSpec(entry));
    const expected = JSON.stringify(validateChart(original));
    const mutable = original as ChartSpec & { title: string };
    mutable.title = "Caller changed this after validation";
    const fresh = structuredClone(representativeSpec(entry));
    const validated = validateChart(fresh);
    const beforeMutation = JSON.stringify(validated);
    (fresh as ChartSpec & { title: string }).title = "Changed after validation";
    assertEquals(JSON.stringify(validated), beforeMutation);
    assertEquals(beforeMutation, expected);
    assert(Object.isFrozen(validated));
  }
});
