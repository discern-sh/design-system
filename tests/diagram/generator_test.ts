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
import {
  type FamilyVocabulary,
  type FixtureKindOptions,
  REQUIRED,
  withTemporaryRoot,
  writeKind,
} from "../kind_family_harness.ts";

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
    cli: {
      moduleStance: "projected",
      registryFile: "signal-cli-registry.ts",
      contractsModule: "../cli/signal-kinds.ts",
    },
    generatedFiles: {
      spec: "signal-spec.ts",
      metadata: "signal-metadata.ts",
      registry: "signal-registry.ts",
      dispatch: "signal-dispatch.ts",
      exports: "signal-exports.ts",
    },
    modules: {
      kindMeta: "../signal/kind-meta.ts",
      errors: "../signal/errors.ts",
      conformance: "../signal/conformance.ts",
      validation: "../signal/validation.ts",
      scene: "../signal/scene.ts",
    },
  };
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
    const cliRegistry = generated.cliRegistry;
    assert(cliRegistry !== undefined);
    assert(cliRegistry.includes("signalKindCliRegistry"));
    assert(cliRegistry.includes('"pulse": { stance: "quiet" }'));
    assert(cliRegistry.includes("projectSignalKindCli"));
    assert(generated.exports.includes("pulse/mod.ts"));
    for (const source of Object.values(generated)) {
      assert(source !== undefined);
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
      generated.cliRegistry?.includes(
        '{ stance: "projected", project: projectPulseSignalCli }',
      ),
    );
  }, SYNTHETIC_PREFIX);
});

Deno.test("a family without a terminal surface admits stances but forbids projector modules", async () => {
  const pendingFamily = (root: URL): KindFamilyConfig => {
    const { cli: _cli, ...surface } = syntheticFamily(root);
    return surface;
  };
  await withTemporaryRoot(async (path, url) => {
    await writeKind(path, "pulse", syntheticKind({ stance: "projected" }));
    const generated = await generateKindFamilySources(pendingFamily(url), url);
    assertEquals(generated.cliRegistry, undefined);
    assert(generated.dispatch.includes('case "pulse"'));
  }, SYNTHETIC_PREFIX);
  await withTemporaryRoot(async (path, url) => {
    await writeKind(
      path,
      "pulse",
      syntheticKind({ stance: "projected", include: [...REQUIRED, "cli"] }),
    );
    await assertRejects(
      () => loadKindFamilySources(pendingFamily(url)),
      Error,
      "supplies a kind CLI module before the signal family's terminal surface exists",
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
