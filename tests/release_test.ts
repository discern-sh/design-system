import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { dirname, fromFileUrl, join, relative } from "@std/path";
import { packageManifest } from "../src/manifest.ts";
import {
  componentBehaviorOptIns,
  componentBehaviors,
} from "../src/types/component-meta.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("..", import.meta.url));

const ANSI_CODES = new RegExp(String.fromCharCode(27) + "\\[[0-9;]*m", "g");

interface DenoConfig {
  readonly name: string;
  readonly version: string;
  readonly exports: Readonly<Record<string, string>>;
  readonly tasks: Readonly<Record<string, string>>;
}

const config = JSON.parse(
  await Deno.readTextFile(join(PACKAGE_ROOT, "deno.json")),
) as DenoConfig;

async function run(
  cwd: string,
  args: readonly string[],
): Promise<{ code: number; output: string }> {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [...args],
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  const output = new TextDecoder().decode(result.stdout) +
    new TextDecoder().decode(result.stderr);
  return {
    code: result.code,
    output: output.replaceAll(ANSI_CODES, ""),
  };
}

/** The relative paths `deno publish` would upload, from a dry run. */
async function publishFileSet(): Promise<readonly string[]> {
  const { code, output } = await run(PACKAGE_ROOT, [
    "publish",
    "--dry-run",
    "--allow-dirty",
  ]);
  assertEquals(code, 0, `publish dry run failed:\n${output}`);
  const files = [...output.matchAll(/file:\/\/\S+/g)]
    .map((match) => relative(PACKAGE_ROOT, fromFileUrl(match[0])))
    .filter((path) => !path.startsWith(".."));
  assert(files.length > 0, "dry run listed no files");
  return files;
}

const REQUIRED_FILES = [
  "CHANGELOG.md",
  "LICENSE",
  "NOTICE",
  "README.md",
  "deno.json",
];

/** Every published path must match one of these shapes and none of the denies. */
function isAllowedPublishPath(path: string): boolean {
  if (REQUIRED_FILES.includes(path)) return true;
  if (!path.startsWith("src/")) return false;
  if (path.startsWith("src/fixtures/")) return false;
  if (path.endsWith(".examples.tsx")) return false;
  return /\.(ts|tsx)$/.test(path);
}

Deno.test("the publish set contains only allowlisted package files", async () => {
  const files = await publishFileSet();
  for (const required of REQUIRED_FILES) {
    assert(files.includes(required), `publish set is missing ${required}`);
  }
  const unexpected = files.filter((path) => !isAllowedPublishPath(path));
  assertEquals(
    unexpected,
    [],
    `unexpected files in the publish set: ${unexpected.join(", ")}`,
  );
});

Deno.test("every exported module graph is inside the publish set", async () => {
  const files = new Set(await publishFileSet());
  for (const entry of Object.values(config.exports)) {
    const { code, output } = await run(PACKAGE_ROOT, [
      "info",
      "--json",
      "--config",
      "deno.json",
      entry,
    ]);
    assertEquals(code, 0, `deno info failed for ${entry}:\n${output}`);
    const graph = JSON.parse(output) as {
      readonly modules: readonly { readonly specifier: string }[];
    };
    for (const module of graph.modules) {
      if (!module.specifier.startsWith("file://")) continue;
      const path = relative(PACKAGE_ROOT, fromFileUrl(module.specifier));
      if (path.startsWith("node_modules/")) continue;
      assert(
        files.has(path),
        `${entry} depends on ${path}, which the publish allowlist omits`,
      );
    }
  }
});

const CLI_EXPORTS = [
  "./cli",
  "./cli/interactive",
  "./cli/interactive/testing",
  "./cli/projection",
] as const;

Deno.test("the CLI export graphs never resolve React", async () => {
  for (const exportName of CLI_EXPORTS) {
    const entry = config.exports[exportName];
    assert(entry !== undefined, `deno.json has no ${exportName} export`);
    const { code, output } = await run(PACKAGE_ROOT, [
      "info",
      "--json",
      "--config",
      "deno.json",
      entry,
    ]);
    assertEquals(code, 0, `deno info failed for ${entry}:\n${output}`);
    assert(
      !output.includes("npm:react"),
      `${exportName} resolved the React package`,
    );
    assert(
      !output.includes("/src/react.ts"),
      `${exportName} reached the React adapter`,
    );
    assert(
      !output.includes('.tsx"'),
      `${exportName} reached a TSX component module`,
    );
  }
});

Deno.test("the CLI module graphs import without ambient I/O", async () => {
  for (const exportName of CLI_EXPORTS) {
    const entry = config.exports[exportName];
    assert(entry !== undefined, `deno.json has no ${exportName} export`);
    const { code, output } = await run(PACKAGE_ROOT, [
      "run",
      "--no-prompt",
      entry,
    ]);
    assertEquals(
      code,
      0,
      `importing ${exportName} with no permissions failed:\n${output}`,
    );
  }
});

Deno.test("published modules carry no import attributes", async () => {
  const files = await publishFileSet();
  const offenders: string[] = [];
  for (const path of files) {
    if (!/\.(ts|tsx)$/.test(path)) continue;
    const source = await Deno.readTextFile(join(PACKAGE_ROOT, path));
    if (/\bwith\s*\{\s*type\s*:/.test(source)) offenders.push(path);
  }
  assertEquals(
    offenders,
    [],
    "the registry rejects import attributes when it builds the module " +
      "graph, even though a local dry run accepts them; embed the data " +
      "in a generated module instead",
  );
});

Deno.test("browser behavior stays inside the declared component opt-ins", () => {
  for (const behavior of componentBehaviors) {
    const actual: readonly string[] = packageManifest.components
      .filter((component) => component.behaviors.includes(behavior))
      .map(({ id }) => id);
    assertEquals(actual, componentBehaviorOptIns[behavior]);
  }

  const declaredComponents = Object.values(componentBehaviorOptIns).flat();
  assertEquals(
    new Set(declaredComponents).size,
    declaredComponents.length,
    "a component must not repeat across behavior opt-in sets",
  );
});

Deno.test("the publish-shaped artifact serves the neutral consumer alone", async () => {
  const files = await publishFileSet();
  const staged = await Deno.makeTempDir();
  const consumer = await Deno.makeTempDir();
  try {
    for (const path of files) {
      const target = join(staged, path);
      await Deno.mkdir(dirname(target), { recursive: true });
      await Deno.copyFile(join(PACKAGE_ROOT, path), target);
    }
    const imports = Object.fromEntries(
      Object.entries(config.exports)
        .filter(([key]) => key !== "./react")
        .map(([key, value]) => [
          key.replace(/^\./, config.name),
          new URL(value, `file://${staged}/`).href,
        ]),
    );
    await Deno.writeTextFile(
      join(consumer, "deno.json"),
      JSON.stringify({ nodeModulesDir: "none", imports }, null, 2),
    );
    await Deno.writeTextFile(
      join(consumer, "neutral.ts"),
      `import { packageManifest, semanticClass } from "${config.name}";
import { renderBadgeCli, renderHeadingCli, stripAnsi } from "${config.name}/cli";
import {
  type CompactAcknowledgementRequestOptions,
  filterInteractionEntries,
  requestAcknowledgement,
  requestMarkdownBrowser,
  requestText,
  segmentGraphemes,
} from "${config.name}/cli/interactive";
import {
  encodeTerminalKeys,
  FakeTerminalIO,
} from "${config.name}/cli/interactive/testing";
import {
  projectTerminalHtml,
  projectTerminalSpans,
} from "${config.name}/cli/projection";
import { emitDesignSystemRuntime } from "${config.name}/runtime";
const result = await emitDesignSystemRuntime({
  outputRoot: new URL("./runtime/", import.meta.url),
  components: ["button"],
  assets: ["fonts"],
});
const io = new FakeTerminalIO(
  ["Ada", encodeTerminalKeys("enter")],
  { colorDepth: "truecolor", columns: 40 },
);
const requested = await requestText({ label: "Name" }, { io });
const acknowledgement: CompactAcknowledgementRequestOptions = {
  presentation: "compact",
};
const acknowledgementIo = new FakeTerminalIO(
  [encodeTerminalKeys("enter")],
  { colorDepth: "truecolor", columns: 40 },
);
await requestAcknowledgement(acknowledgement, { io: acknowledgementIo });
const browserIo = new FakeTerminalIO(
  ["online", encodeTerminalKeys("enter")],
  { colorDepth: "truecolor", columns: 40, rows: 24 },
);
const browserResult = await requestMarkdownBrowser({
  label: "Documentation",
  entries: [
    {
      kind: "document",
      id: "guide",
      label: "Guide",
      path: "guides/guide.md",
      source: "# Guide\\n\\nPublished Markdown browser.",
    },
    {
      kind: "action",
      id: "online",
      label: "Read online",
      value: "online",
    },
  ],
}, { io: browserIo });
const documentMatches = filterInteractionEntries(
  [{
    id: "guide",
    label: "Reading guide",
    description: "guide.md",
    value: "guide",
  }],
  "guide.md",
);
const styledBadge = renderBadgeCli(
  { label: "Ready", dot: true, tone: "success" },
  { colorDepth: "truecolor", columns: 80, unicode: true },
);
const spans = projectTerminalSpans(styledBadge);
const readingHeading = stripAnsi(renderHeadingCli(
  {
    text: "Reading foundations",
    treatment: "document",
    leadingBlankLines: 0,
  },
  { colorDepth: "truecolor", columns: 40, unicode: true },
));
console.log(JSON.stringify({
  className: semanticClass("button"),
  badge: renderBadgeCli({ label: "Ready", dot: true }, { colorDepth: "none", columns: 80, unicode: true }),
  graphemes: segmentGraphemes("A👩‍💻B").length,
  files: result.manifest.integrity.files.length,
  package: packageManifest.package,
  requested,
  compactRawModeBalanced: acknowledgementIo.rawTransitions.join(","),
  browserKind: browserResult.kind,
  browserRawModeBalanced: browserIo.rawTransitions.join(","),
  browserResizeListeners: browserIo.resizeListenerCount,
  documentMatch: documentMatches[0]?.id,
  headingIncludesReading: readingHeading.includes("Reading foundations"),
  rawModeBalanced: io.rawTransitions.join(","),
  projectedText: spans.map(({ text }) => text).join(""),
  projectionMatchesStrip: spans.map(({ text }) => text).join("") ===
    stripAnsi(styledBadge),
  htmlShell: projectTerminalHtml(styledBadge).startsWith("<pre style="),
}));
`,
    );
    const { code, output } = await run(consumer, [
      "run",
      "--allow-read",
      "--allow-write",
      "neutral.ts",
    ]);
    assertEquals(code, 0, `staged consumer failed:\n${output}`);
    assertStringIncludes(output, `"className":"discern-button"`);
    assertStringIncludes(output, `"badge":"[● Ready]"`);
    assertStringIncludes(output, `"graphemes":3`);
    assertStringIncludes(output, `"package":"${config.name}"`);
    assertStringIncludes(output, `"requested":"Ada"`);
    assertStringIncludes(output, `"compactRawModeBalanced":"true,false"`);
    assertStringIncludes(output, `"browserKind":"action"`);
    assertStringIncludes(output, `"browserRawModeBalanced":"true,false"`);
    assertStringIncludes(output, `"browserResizeListeners":0`);
    assertStringIncludes(output, `"documentMatch":"guide"`);
    assertStringIncludes(output, `"headingIncludesReading":true`);
    assertStringIncludes(output, `"rawModeBalanced":"true,false"`);
    assertStringIncludes(output, `"projectedText":"[● Ready]"`);
    assertStringIncludes(output, `"projectionMatchesStrip":true`);
    assertStringIncludes(output, `"htmlShell":true`);
    const css = await Deno.readTextFile(
      join(consumer, "runtime", "discern.css"),
    );
    assertStringIncludes(css, ".discern-button");
  } finally {
    await Deno.remove(staged, { recursive: true });
    await Deno.remove(consumer, { recursive: true });
  }
});

Deno.test("every entrypoint and public symbol is documented", async () => {
  const result = await new Deno.Command(Deno.execPath(), {
    args: ["doc", "--json", ...Object.values(config.exports)],
    cwd: PACKAGE_ROOT,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assertEquals(
    result.code,
    0,
    `deno doc failed:\n${new TextDecoder().decode(result.stderr)}`,
  );
  const parsed = JSON.parse(new TextDecoder().decode(result.stdout)) as {
    readonly nodes: Readonly<
      Record<string, {
        readonly module_doc?: unknown;
        readonly symbols?: readonly {
          readonly name?: string;
          readonly jsDoc?: unknown;
          readonly declarations?: readonly { readonly jsDoc?: unknown }[];
        }[];
      }>
    >;
  };
  const problems: string[] = [];
  for (const [entry, node] of Object.entries(parsed.nodes)) {
    const path = relative(PACKAGE_ROOT, fromFileUrl(entry));
    if (!node.module_doc) problems.push(`${path}: missing module doc`);
    for (const symbol of node.symbols ?? []) {
      if (
        path === "src/cli/interactive/mod.ts" &&
        /prompt/iu.test(symbol.name ?? "")
      ) {
        problems.push(
          `${path}: ${symbol.name} uses terminal vocabulary reserved for agent instructions`,
        );
      }
      const documented = Boolean(symbol.jsDoc) ||
        (symbol.declarations ?? []).some((dec) => Boolean(dec.jsDoc));
      if (!documented) {
        problems.push(`${path}: ${symbol.name} has no JSDoc`);
      }
    }
  }
  assertEquals(problems, [], problems.join("\n"));
});

Deno.test("release verification builds generated prerequisites first", () => {
  const verify = config.tasks.verify;
  assert(verify, "deno.json has no verify task");
  const stages = verify.split(/\s*&&\s*/u);
  assertEquals(
    stages[0],
    "deno task build",
    "verify must materialize ignored generated sources before any checking or testing stage",
  );
});

Deno.test("release identity stays coherent across config and changelog", async () => {
  assertEquals(config.name, "@discern-sh/design-system");
  const changelog = await Deno.readTextFile(join(PACKAGE_ROOT, "CHANGELOG.md"));
  const heading = changelog.match(/^## (\d+\.\d+\.\d+\S*)/m);
  assert(heading, "the changelog has no release heading");
  assertEquals(
    heading[1],
    config.version,
    "deno.json version and the newest changelog heading disagree",
  );
  const npm = JSON.parse(
    await Deno.readTextFile(join(PACKAGE_ROOT, "package.json")),
  ) as {
    readonly version: string;
    readonly private: boolean;
    readonly exports: Readonly<Record<string, string>>;
  };
  assertEquals(npm.version, config.version);
  assertEquals(npm.private, true, "npm publication is not a release channel");
  assertEquals(
    npm.exports,
    config.exports,
    "package manifests disagree on exports",
  );
});
