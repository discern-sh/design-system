import { assert, assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import { chartKindRegistry } from "../../src/generated/chart-registry.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../..", import.meta.url));

/**
 * The chart graph computes every numeral in scaled-decimal integer space, so
 * locale facilities, float formatting, and ambient clock access are banned
 * from every module the chart and terminal projectors reach. The neutral
 * graph remains a separate boundary proof; the numeral graph adds the
 * generated CLI registry so every future enhanced kind enrolls without a
 * hand-maintained folder list.
 */
const NEUTRAL_CHART_GRAPH_ROOTS = [
  "src/chart/mod.ts",
  "src/chart/conformance.ts",
] as const;

const CHART_NUMERAL_GRAPH_ROOTS = [
  ...NEUTRAL_CHART_GRAPH_ROOTS,
  "src/generated/chart-cli-registry.ts",
] as const;

const BANNED_SOURCES: readonly {
  readonly name: string;
  readonly pattern: RegExp;
}[] = [
  {
    name: "locale-dependent number formatting (Intl.NumberFormat)",
    pattern: /\bIntl\s*\.\s*NumberFormat\s*\(/u,
  },
  {
    name: "locale-dependent date formatting (Intl.DateTimeFormat)",
    pattern: /\bIntl\s*\.\s*DateTimeFormat\s*\(/u,
  },
  {
    name: "locale-dependent conversion (toLocaleString)",
    pattern: /\.\s*toLocaleString\s*\(/u,
  },
  { name: "float formatting (toFixed)", pattern: /\.\s*toFixed\s*\(/u },
  {
    name: "ambient date or clock access (Date)",
    pattern:
      /(?<![\w.$])(?:new\s+Date\s*\(|Date\s*\.\s*(?:now|parse|UTC)\s*\(|Date\s*\()/u,
  },
] as const;

async function graphModules(
  roots: readonly string[],
): Promise<readonly string[]> {
  const paths = new Set<string>();
  for (const root of roots) {
    const result = await new Deno.Command(Deno.execPath(), {
      args: ["info", "--json", "--config", "deno.json", root],
      cwd: PACKAGE_ROOT,
      stdout: "piped",
      stderr: "piped",
    }).output();
    const output = new TextDecoder().decode(result.stdout);
    assertEquals(
      result.code,
      0,
      `deno info failed for ${root}:\n${
        new TextDecoder().decode(result.stderr)
      }`,
    );
    const graph = JSON.parse(output) as {
      readonly modules: readonly { readonly specifier: string }[];
    };
    for (const module of graph.modules) {
      assert(
        module.specifier.startsWith("file://"),
        `the chart graph resolved an external module: ${module.specifier}`,
      );
      paths.add(relative(PACKAGE_ROOT, fromFileUrl(module.specifier)));
    }
  }
  assert(paths.size > 1, "the chart graph was unexpectedly empty");
  return [...paths];
}

Deno.test("the chart graph stays neutral and inside its declared roots", async () => {
  for (const path of await graphModules(NEUTRAL_CHART_GRAPH_ROOTS)) {
    assert(
      path.startsWith("src/chart/") || path.startsWith("src/internal/") ||
        path.startsWith("src/unicode/") || path.startsWith("src/tokens/") ||
        path.startsWith("src/generated/") ||
        // The shared safe-URL authority the Markdown producer bridge
        // composes; the banned-source scan below still covers it.
        path === "src/url-reference.ts",
      `the chart graph reached an undeclared root: ${path}`,
    );
    assert(
      !path.startsWith("src/cli/") && !path.endsWith(".tsx") &&
        !path.toLocaleLowerCase().includes("react") &&
        !path.startsWith("src/diagram/"),
      `the chart graph crossed a family or projection boundary: ${path}`,
    );
  }
});

Deno.test("locale, float formatting, and clock access are banned from the chart graph", async () => {
  const offenders: string[] = [];
  const modules = await graphModules(CHART_NUMERAL_GRAPH_ROOTS);
  for (const entry of chartKindRegistry) {
    for (const suffix of ["validation", "layout", "description", "cli"]) {
      const expected =
        `src/chart/kinds/${entry.meta.slug}/${entry.meta.slug}.${suffix}.ts`;
      assert(
        modules.includes(expected),
        `${entry.meta.slug} escaped numeral-graph enrolment at ${expected}`,
      );
    }
  }
  for (
    const authority of [
      "src/chart/decimal.ts",
      "src/chart/format.ts",
      "src/chart/proportions.ts",
      "src/chart/scale.ts",
      "src/chart/svg-geometry.ts",
      "src/chart/ticks.ts",
      "src/chart/value-text.ts",
      "src/cli/glyph-ramps.ts",
    ]
  ) {
    assert(modules.includes(authority), `${authority} escaped the numeral graph`);
  }
  for (const path of modules) {
    const source = await Deno.readTextFile(join(PACKAGE_ROOT, path));
    for (const banned of BANNED_SOURCES) {
      if (banned.pattern.test(source)) {
        offenders.push(`${path} uses ${banned.name}`);
      }
    }
  }
  assertEquals(offenders, [], offenders.join("\n"));
});

Deno.test("the ban keeps the grapheme and interactive-clock exemptions scoped", async () => {
  const textAuthority = "src/cli/text.ts";
  const modules = await graphModules(CHART_NUMERAL_GRAPH_ROOTS);
  assert(
    modules.includes(textAuthority),
    "the terminal chart graph must reach its shared text authority",
  );
  const source = await Deno.readTextFile(join(PACKAGE_ROOT, textAuthority));
  assert(
    /\bIntl\s*\.\s*Segmenter\s*\(/u.test(source),
    "premise: the CLI text authority still uses the legitimate grapheme segmenter",
  );
  assert(
    BANNED_SOURCES.every(({ pattern }) => !pattern.test(source)),
    "the scoped grapheme exemption must not admit a banned formatter",
  );

  const interactiveClock = "src/cli/interactive/background.ts";
  assert(
    !modules.includes(interactiveClock),
    "the pure chart projector graph reached the interactive adapter",
  );
  const interactiveSource = await Deno.readTextFile(
    join(PACKAGE_ROOT, interactiveClock),
  );
  assert(
    /\bDate\s*\.\s*now\s*\(/u.test(interactiveSource),
    "premise: the interactive adapter still owns legitimate clock access",
  );
});
