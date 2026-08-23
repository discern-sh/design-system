import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  generateDiagramKindSources,
  loadDiagramKindSources,
} from "../../scripts/generate.ts";

interface FixtureKindOptions {
  readonly slug?: string;
  readonly order?: number;
  readonly stance?: "description" | "enhanced";
  readonly include?: readonly string[];
  readonly useWhen?: readonly string[];
  readonly budgetDescription?: string;
  readonly budgetRemedy?: string;
}

const REQUIRED = [
  "meta",
  "spec",
  "validation",
  "layout",
  "description",
  "fixtures",
  "mod",
] as const;

function rootUrl(path: string): URL {
  return new URL(`file://${path.endsWith("/") ? path : `${path}/`}`);
}

async function writeKind(
  root: string,
  directory: string,
  options: FixtureKindOptions = {},
): Promise<void> {
  const slug = options.slug ?? directory.split("/").at(-1) ?? "probe";
  const include = new Set(options.include ?? REQUIRED);
  const path = `${root}/${directory}`;
  await Deno.mkdir(path, { recursive: true });
  const files = new Map<string, string>([
    [
      "meta",
      `export default {
  name: "${slug}",
  slug: "${slug}",
  order: ${options.order ?? 10},
  description: "A temporary generator conformance kind.",
  useWhen: ${
        JSON.stringify(options.useWhen ?? ["Proving generated enrolment."])
      },
  notWhen: ["A real diagram kind is required."],
  budgets: {
    entities: {
      limit: 3,
      unit: "entities",
      remedy: "${options.budgetRemedy ?? "split-overview"}",
      description: ${
        JSON.stringify(
          options.budgetDescription ?? "A measurable temporary ceiling.",
        )
      },
    },
  },
  cli: { stance: "${options.stance ?? "description"}" },
} as const;
`,
    ],
    [
      "spec",
      `export interface ${slug[0]?.toUpperCase()}${
        slug.slice(1)
      }DiagramSpec { readonly kind: "${slug}"; readonly title: string; readonly summary: string; }
export interface Validated${slug[0]?.toUpperCase()}${
        slug.slice(1)
      }Diagram extends ${slug[0]?.toUpperCase()}${
        slug.slice(1)
      }DiagramSpec {}\n`,
    ],
    [
      "validation",
      "export default function validate(value: unknown): unknown { return value; }\n",
    ],
    [
      "layout",
      "export default function layout(value: unknown): unknown { return value; }\n",
    ],
    [
      "description",
      'export default function describe(): string { return "temporary"; }\n',
    ],
    [
      "fixtures",
      `export default [{ kind: "${slug}", title: "Temporary", summary: "Temporary." }];\n`,
    ],
    ["mod", "export const temporaryKind = true;\n"],
    [
      "cli",
      'export default function render(): string { return "temporary"; }\n',
    ],
  ]);
  for (const surface of include) {
    const source = files.get(surface);
    assert(source !== undefined);
    const name = surface === "mod" ? "mod.ts" : `${slug}.${surface}.ts`;
    await Deno.writeTextFile(`${path}/${name}`, source);
  }
}

async function withTemporaryRoot(
  action: (path: string, url: URL) => Promise<void>,
): Promise<void> {
  const path = await Deno.makeTempDir({ prefix: "diagram-kind-generator-" });
  try {
    await action(path, rootUrl(path));
  } finally {
    await Deno.remove(path, { recursive: true });
  }
}

Deno.test("one conforming kind enrols every generated consumer together", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe");
    const generated = await generateDiagramKindSources(url);
    assert(generated.spec.includes("ProbeDiagramSpec"));
    assert(generated.spec.includes("ValidatedProbeDiagram"));
    assert(generated.metadata.includes("probe.meta.ts"));
    assert(generated.metadata.includes("# Built-in Diagram kinds"));
    assert(generated.metadata.includes("CLI stance: description."));
    assert(generated.metadata.includes("entities: 3 entities"));
    assert(!generated.metadata.includes("fixtures"));
    assert(generated.registry.includes("probe.fixtures.ts"));
    assert(generated.dispatch.includes('case "probe"'));
    assert(generated.dispatch.includes("validateProbe"));
    assert(generated.dispatch.includes("layoutProbe"));
    assert(generated.dispatch.includes("describeProbe"));
    assert(
      generated.cliRegistry.includes('"probe": { stance: "description" }'),
    );
    assert(generated.exports.includes("probe/mod.ts"));
  });
});

Deno.test("missing mandatory kind surfaces fail generation", async () => {
  for (
    const missing of [
      "spec",
      "validation",
      "layout",
      "description",
      "fixtures",
      "mod",
    ] as const
  ) {
    await withTemporaryRoot(async (path, url) => {
      await writeKind(path, "probe", {
        include: REQUIRED.filter((surface) => surface !== missing),
      });
      await assertRejects(
        () => loadDiagramKindSources(url),
        Error,
        `missing required ${missing}`,
      );
    });
  }
});

Deno.test("an anatomy file without Metadata cannot remain unenrolled", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe");
    await Deno.mkdir(`${path}/stray`, { recursive: true });
    await Deno.writeTextFile(
      `${path}/stray/stray.spec.ts`,
      'export interface StrayDiagramSpec { readonly kind: "stray"; }\n',
    );
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "no matching diagram .meta.ts file",
    );
  });
});

Deno.test("incomplete authoring guidance or budget Metadata fails generation", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", { useWhen: [] });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "incomplete useWhen",
    );
  });
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", { budgetDescription: "" });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "incomplete entities budget",
    );
  });
});

Deno.test("budget remedies share one generated validation authority", async () => {
  for (
    const remedy of [
      "shorten-label",
      "reduce-tier",
      "split-overview",
      "split-group",
      "reduce-participants",
      "shorten-range",
    ]
  ) {
    await withTemporaryRoot(async (path, url) => {
      await writeKind(path, "probe", { budgetRemedy: remedy });
      assertEquals((await loadDiagramKindSources(url)).length, 1);
    });
  }
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", { budgetRemedy: "do-anything" });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "incomplete entities budget",
    );
  });
});

Deno.test("kind fixtures must carry accessible context for their own identity", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe");
    await Deno.writeTextFile(
      `${path}/probe/probe.fixtures.ts`,
      'export default [{ kind: "other", title: "", summary: "Missing." }];\n',
    );
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "does not identify probe with accessible context",
    );
  });
});

Deno.test("enhanced CLI stance and module presence are mechanically paired", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", { stance: "enhanced" });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "no .cli.ts file",
    );
  });
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", {
      include: [...REQUIRED, "cli"],
    });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "description-only CLI",
    );
  });
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe", {
      stance: "enhanced",
      include: [...REQUIRED, "cli"],
    });
    const generated = await generateDiagramKindSources(url);
    assert(generated.cliRegistry.includes('stance: "enhanced"'));
    assert(generated.cliRegistry.includes("probe.cli.ts"));
    assert(generated.cliRegistry.includes("projectProbeDiagramCli"));
    assert(generated.cliRegistry.includes("projectDiagramKindCli"));
    assert(generated.cliRegistry.includes("project: projectProbeDiagramCli"));
    assert(!generated.cliRegistry.includes("modulePath"));
  });
});

Deno.test("duplicate kind identity and order fail before generation", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "one/probe", { order: 10 });
    await writeKind(path, "two/probe", { order: 20 });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "Duplicate diagram kind slug probe",
    );
  });
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "alpha", { order: 10 });
    await writeKind(path, "beta", { order: 10 });
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "Duplicate diagram kind order 10",
    );
  });
});

Deno.test("an orphan enhanced module cannot create a parallel kind inventory", async () => {
  await withTemporaryRoot(async (path, url) => {
    await Deno.mkdir(`${path}/ghost`, { recursive: true });
    await Deno.writeTextFile(
      `${path}/ghost/ghost.cli.ts`,
      "export default function render(): string { return 'ghost'; }\n",
    );
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "no matching diagram .meta.ts file",
    );
  });
});
