import { assert, assertEquals, assertRejects } from "@std/assert";
import {
  generateDiagramKindSources,
  loadDiagramKindSources,
} from "../../scripts/generate.ts";
import {
  generateKindFamilySources,
  type KindFamilyConfig,
  loadKindFamilySources,
} from "../../scripts/kind-family.ts";

interface FamilyVocabulary {
  readonly word: string;
  readonly typeName: string;
  readonly postures: readonly string[];
}

const DIAGRAM_FAMILY: FamilyVocabulary = {
  word: "diagram",
  typeName: "Diagram",
  postures: [
    "minimal",
    "representative",
    "structural",
    "long-text",
    "maximum-density",
    "semantic-roles",
  ],
};

const SYNTHETIC_FAMILY: FamilyVocabulary = {
  word: "signal",
  typeName: "Signal",
  postures: ["baseline", "hostile"],
};

function syntheticFamily(root: URL): KindFamilyConfig {
  return {
    word: SYNTHETIC_FAMILY.word,
    typeName: SYNTHETIC_FAMILY.typeName,
    kindRoot: root,
    budgetRemedies: ["trim-lanes"],
    releasePostures: SYNTHETIC_FAMILY.postures,
    cliStances: ["quiet", "projected"],
    cliModuleStance: "projected",
    generatedFiles: {
      spec: "signal-spec.ts",
      metadata: "signal-metadata.ts",
      registry: "signal-registry.ts",
      dispatch: "signal-dispatch.ts",
      exports: "signal-exports.ts",
      cliRegistry: "signal-cli-registry.ts",
    },
    modules: {
      kindMeta: "../signal/kind-meta.ts",
      errors: "../signal/errors.ts",
      conformance: "../signal/conformance.ts",
      validation: "../signal/validation.ts",
      scene: "../signal/scene.ts",
      cliContracts: "../cli/signal-kinds.ts",
    },
  };
}

interface FixtureKindOptions {
  readonly slug?: string;
  readonly order?: number;
  readonly stance?: string;
  readonly include?: readonly string[];
  readonly useWhen?: readonly string[];
  readonly budgetDescription?: string;
  readonly budgetRemedy?: string;
  readonly family?: FamilyVocabulary;
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
  const family = options.family ?? DIAGRAM_FAMILY;
  const pascal = `${slug[0]?.toUpperCase()}${slug.slice(1)}${family.typeName}`;
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
  notWhen: ["A real ${family.word} kind is required."],
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
      `export interface ${pascal}Spec { readonly kind: "${slug}"; readonly title: string; readonly summary: string; }
export interface Validated${pascal} extends ${pascal}Spec {}\n`,
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
      `const spec = { kind: "${slug}", title: "Temporary", summary: "Temporary." };
export const releaseCorpus = {
  kind: "${slug}",
  cases: [{
    name: "complete",
    postures: [${
        family.postures.map((posture) => JSON.stringify(posture)).join(", ")
      }],
    spec,
  }],
  overBudget: {
    dimension: "entities",
    authorAction: "${options.budgetRemedy ?? "split-overview"}",
    spec,
  },
  invalid: [{ name: "invalid", code: "${family.word}/invalid-spec", spec: { ...spec, extra: true } }],
};
export default releaseCorpus.cases.map(({ spec }) => spec);\n`,
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
  prefix = "diagram-kind-generator-",
): Promise<void> {
  const path = await Deno.makeTempDir({ prefix });
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
      `const spec = { kind: "other", title: "", summary: "Missing." };
export const releaseCorpus = {
  kind: "probe",
  cases: [{ name: "bad", postures: ["minimal", "representative", "structural", "long-text", "maximum-density", "semantic-roles"], spec }],
  overBudget: { dimension: "entities", authorAction: "split-overview", spec },
  invalid: [{ name: "invalid", code: "diagram/invalid-spec", spec }],
};
export default releaseCorpus.cases.map(({ spec }) => spec);\n`,
    );
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "does not identify probe with accessible context",
    );
  });
});

Deno.test("release corpus enrollment requires every posture and derived fixtures", async () => {
  for (
    const posture of [
      "minimal",
      "representative",
      "structural",
      "long-text",
      "maximum-density",
      "semantic-roles",
    ]
  ) {
    await withTemporaryRoot(async (path, url) => {
      await writeKind(path, "probe");
      const fixturePath = `${path}/probe/probe.fixtures.ts`;
      const source = await Deno.readTextFile(fixturePath);
      await Deno.writeTextFile(
        fixturePath,
        source.replace(`"${posture}", `, "").replace(
          `, "${posture}"`,
          "",
        ),
      );
      await assertRejects(
        () => loadDiagramKindSources(url),
        Error,
        `missing ${posture} posture`,
      );
    });
  }
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "probe");
    const fixturePath = `${path}/probe/probe.fixtures.ts`;
    const source = await Deno.readTextFile(fixturePath);
    await Deno.writeTextFile(
      fixturePath,
      source.replace(
        "export default releaseCorpus.cases.map(({ spec }) => spec);",
        'export default [{ kind: "probe", title: "Temporary", summary: "Temporary." }];',
      ),
    );
    await assertRejects(
      () => loadDiagramKindSources(url),
      Error,
      "default fixtures must derive from releaseCorpus cases",
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

const SYNTHETIC_PREFIX = "kind-family-generator-";

function syntheticKind(options: FixtureKindOptions = {}): FixtureKindOptions {
  return {
    family: SYNTHETIC_FAMILY,
    stance: "quiet",
    budgetRemedy: "trim-lanes",
    ...options,
  };
}

Deno.test("a second kind family enrols through the shared machinery as configuration", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "pulse", syntheticKind());
    const generated = await generateKindFamilySources(
      syntheticFamily(url),
      url,
    );
    assert(generated.spec.includes("PulseSignalSpec"));
    assert(generated.spec.includes("ValidatedPulseSignal"));
    assert(generated.spec.includes("export type SignalSpec"));
    assert(generated.metadata.includes("# Built-in Signal kinds"));
    assert(generated.metadata.includes("signalKindMetadata"));
    assert(generated.metadata.includes("CLI stance: quiet."));
    assert(generated.metadata.includes('from "../signal/kind-meta.ts"'));
    assert(generated.registry.includes("signalKindRegistry"));
    assert(generated.registry.includes("SignalKindRegistryEntry"));
    assert(generated.dispatch.includes("SignalValidationError"));
    assert(generated.dispatch.includes("conformSignalScene"));
    assert(generated.dispatch.includes("snapshotSignalJsonSafe"));
    assert(generated.dispatch.includes('"signal/invalid-spec"'));
    assert(generated.dispatch.includes("Unknown signal kind"));
    assert(generated.dispatch.includes('case "pulse"'));
    assert(generated.dispatch.includes("validateSignal"));
    assert(generated.dispatch.includes('from "./signal-spec.ts"'));
    assert(generated.cliRegistry.includes("signalKindCliRegistry"));
    assert(generated.cliRegistry.includes('"pulse": { stance: "quiet" }'));
    assert(generated.cliRegistry.includes("projectSignalKindCli"));
    assert(generated.exports.includes("pulse/mod.ts"));
    for (const source of Object.values(generated)) {
      assert(!source.toLocaleLowerCase().includes("diagram"));
    }
  }, SYNTHETIC_PREFIX);
});

Deno.test("a second family's stance pairing follows its own vocabulary", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "pulse", syntheticKind({ stance: "projected" }));
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "declares projected signal CLI but has no .cli.ts file",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "pulse",
      syntheticKind({
        include: [...REQUIRED, "cli"],
      }),
    );
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "declares quiet-only CLI",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "pulse",
      syntheticKind({
        stance: "projected",
        include: [...REQUIRED, "cli"],
      }),
    );
    const generated = await generateKindFamilySources(
      syntheticFamily(url),
      url,
    );
    assert(
      generated.cliRegistry.includes(
        '{ stance: "projected", project: projectPulseSignalCli }',
      ),
    );
  }, SYNTHETIC_PREFIX);
});

Deno.test("a second family's anatomy, identity, and corpus guards stay family-worded", async () => {
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "pulse",
      syntheticKind({
        include: REQUIRED.filter((surface) => surface !== "layout"),
      }),
    );
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "missing required layout",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "pulse",
      syntheticKind({
        budgetRemedy: "split-overview",
      }),
    );
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "incomplete entities budget Metadata",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "one/pulse", syntheticKind({ order: 10 }));
    await writeKind(path, "two/pulse", syntheticKind({ order: 20 }));
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "Duplicate signal kind slug pulse",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await Deno.mkdir(`${path}/ghost`, { recursive: true });
    await Deno.writeTextFile(
      `${path}/ghost/ghost.cli.ts`,
      "export default function render(): string { return 'ghost'; }\n",
    );
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "no matching signal .meta.ts file",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "pulse", syntheticKind());
    await Deno.writeTextFile(
      `${path}/pulse/extra.ts`,
      "export const extra = true;\n",
    );
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "outside the fixed signal kind anatomy",
    );
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "pulse",
      syntheticKind({
        family: { ...SYNTHETIC_FAMILY, postures: ["baseline"] },
      }),
    );
    await assertRejects(
      () => loadKindFamilySources(syntheticFamily(url)),
      Error,
      "missing hostile posture",
    );
  }, SYNTHETIC_PREFIX);
});
