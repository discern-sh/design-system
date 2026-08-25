import { assert, assertEquals } from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";

const PACKAGE_ROOT = fromFileUrl(new URL("../..", import.meta.url));

/**
 * The chart graph computes every numeral in scaled-decimal integer space, so
 * locale facilities, float formatting, and ambient clock access are banned
 * from every module the chart root reaches. The first root is the published
 * `./chart` entrypoint; conformance stays a second root because the public
 * boundary deliberately withholds it. The ban is scoped to exactly this
 * graph: the CLI text authority's segmenter use is legitimate and
 * deliberately outside it, and the kind CLI projectors live on the `./cli`
 * graph rather than here.
 */
const CHART_GRAPH_ROOTS = [
  "src/chart/mod.ts",
  "src/chart/conformance.ts",
] as const;

const BANNED_SOURCES: readonly {
  readonly name: string;
  readonly pattern: RegExp;
}[] = [
  { name: "a locale facility (Intl)", pattern: /\bIntl\s*[.(]/u },
  {
    name: "locale-dependent conversion (toLocale*)",
    pattern: /\.\s*toLocale[A-Za-z]*\s*\(/u,
  },
  { name: "float formatting (toFixed)", pattern: /\.\s*toFixed\s*\(/u },
  {
    name: "ambient date or clock access (Date)",
    pattern:
      /(?<![\w.$])(?:new\s+Date\s*\(|Date\s*\.\s*(?:now|parse|UTC)\s*\(|Date\s*\()/u,
  },
] as const;

async function chartGraphModules(): Promise<readonly string[]> {
  const paths = new Set<string>();
  for (const root of CHART_GRAPH_ROOTS) {
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
  for (const path of await chartGraphModules()) {
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
  for (const path of await chartGraphModules()) {
    const source = await Deno.readTextFile(join(PACKAGE_ROOT, path));
    for (const banned of BANNED_SOURCES) {
      if (banned.pattern.test(source)) {
        offenders.push(`${path} uses ${banned.name}`);
      }
    }
  }
  assertEquals(offenders, [], offenders.join("\n"));
});

Deno.test("the ban is scoped: the CLI text authority stays outside the chart graph", async () => {
  const textAuthority = "src/cli/text.ts";
  const modules = await chartGraphModules();
  assert(
    !modules.includes(textAuthority),
    "the chart graph must not reach the CLI text authority",
  );
  const source = await Deno.readTextFile(join(PACKAGE_ROOT, textAuthority));
  const intl = BANNED_SOURCES[0];
  assert(
    intl !== undefined && intl.pattern.test(source),
    "premise: the CLI text authority legitimately uses the segmenter this guard would flag, so its exclusion is load-bearing",
  );
});
