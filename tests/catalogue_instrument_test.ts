import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import { buildDesignSystem } from "../scripts/build.ts";
import {
  type CataloguePurpose,
  cataloguePurposes,
} from "../src/types/component-meta.ts";
import type { ComponentMeta } from "../src/types/component-meta.ts";
import { compositionRecipes } from "../styleguide/compositions.tsx";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

interface CatalogueState {
  readonly name: string;
  readonly label: string;
}

type PropDocumentation =
  | {
    readonly status: "available";
    readonly props: readonly {
      readonly type: string;
    }[];
  }
  | {
    readonly status: "unavailable";
    readonly reason: string;
  };

interface CatalogueEntry {
  readonly meta: ComponentMeta;
  readonly states: readonly CatalogueState[];
  readonly reactExport: string;
  readonly selection: {
    readonly component: string;
    readonly group: string;
    readonly reactImport: string;
  };
  readonly propDocumentation: PropDocumentation;
}

interface GeneratedCatalogue {
  readonly packageVersion: string;
  readonly registry: readonly CatalogueEntry[];
}

let generatedCatalogue: Promise<GeneratedCatalogue> | undefined;

function catalogue(): Promise<GeneratedCatalogue> {
  generatedCatalogue ??= (async () => {
    await buildDesignSystem();
    return await import(
      new URL(
        "../styleguide/generated/registry.ts?catalogue-instrument-test",
        import.meta.url,
      ).href
    ) as GeneratedCatalogue;
  })();
  return generatedCatalogue;
}

function entry(
  registry: readonly CatalogueEntry[],
  slug: string,
): CatalogueEntry {
  const found = registry.find((candidate) => candidate.meta.slug === slug);
  assert(found !== undefined, `missing Catalogue entry ${slug}`);
  return found;
}

Deno.test("Catalogue purposes are closed, selective, and guidance-backed", async () => {
  const { registry } = await catalogue();
  const knownPurposes = new Set<string>(cataloguePurposes);
  const purposeCounts = Object.fromEntries(
    cataloguePurposes.map((purpose) => [purpose, 0]),
  ) as Record<CataloguePurpose, number>;

  for (const { meta } of registry) {
    const memberships = meta.purposes ?? [];
    assertEquals(
      new Set(memberships).size,
      memberships.length,
      `${meta.slug} repeats a Catalogue purpose`,
    );
    for (const purpose of memberships) {
      assert(
        knownPurposes.has(purpose),
        `${meta.slug} names unknown Catalogue purpose ${purpose}`,
      );
      purposeCounts[purpose] += 1;
    }
  }

  for (const purpose of cataloguePurposes) {
    assert(
      purposeCounts[purpose] > 0,
      `${purpose} must contain at least one component`,
    );
    assert(
      purposeCounts[purpose] < registry.length,
      `${purpose} must remain a selective collection`,
    );
  }

  const confusedPairSlugs = new Set([
    "terminal",
    "command",
    "banner",
    "diagnostic",
    "process-steps",
    "procedure",
    "badge",
    "ownership-badge",
    "receipt",
    "result-summary",
  ]);
  for (const { meta } of registry) {
    if (meta.group !== "Workflow" && !confusedPairSlugs.has(meta.slug)) {
      continue;
    }
    assert(
      meta.useWhen !== undefined && meta.useWhen.length > 0,
      `${meta.slug} needs positive usage guidance`,
    );
    assert(
      meta.notWhen !== undefined && meta.notWhen.length > 0,
      `${meta.slug} needs negative usage guidance`,
    );
  }
});

Deno.test("Catalogue selection snippets and state fragments derive from the registry", async () => {
  const { registry } = await catalogue();
  const fragmentIds = new Set<string>();

  for (const candidate of registry) {
    assertEquals(
      candidate.selection.component,
      `components: [${JSON.stringify(candidate.meta.slug)}],`,
    );
    assertEquals(
      candidate.selection.group,
      `groups: [${JSON.stringify(candidate.meta.group)}],`,
    );
    assertEquals(
      candidate.selection.reactImport,
      `import { ${candidate.reactExport} } from "@discern-sh/design-system/react";`,
    );

    const stateNames = new Set<string>();
    assert(candidate.states.length > 0, `${candidate.meta.slug} needs a state`);
    for (const state of candidate.states) {
      assertMatch(state.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert(state.label.trim().length > 0);
      assert(
        !stateNames.has(state.name),
        `${candidate.meta.slug} repeats state ${state.name}`,
      );
      stateNames.add(state.name);
      const fragmentId = `component-${candidate.meta.slug}--${state.name}`;
      assert(
        !fragmentIds.has(fragmentId),
        `duplicate Catalogue fragment ${fragmentId}`,
      );
      fragmentIds.add(fragmentId);
    }
  }

  assertEquals(
    entry(registry, "command").states.map(({ name }) => name),
    ["default", "overflow", "failure"],
  );
  assertEquals(
    entry(registry, "path-reference").states.map(({ name }) => name),
    ["default", "long-path"],
  );
  assertEquals(
    entry(registry, "diagnostic").states.map(({ name }) => name),
    ["verbose-failure", "attention"],
  );
  assertEquals(
    entry(registry, "table").states.map(({ name }) => name),
    ["default", "dense-overflow"],
  );
  assertEquals(
    entry(registry, "task-metadata").states.map(({ name }) => name),
    ["default", "file-changing"],
  );
  assertEquals(
    entry(registry, "agent-handoff").states.map(({ name }) => name),
    ["default", "long-prompt"],
  );
  assertEquals(
    entry(registry, "branch-choice").states.map(({ name }) => name),
    ["default", "next-action"],
  );
});

Deno.test("Catalogue prop evidence is source-derived and complete", async () => {
  const { registry } = await catalogue();
  const available = registry.filter(({ propDocumentation }) =>
    propDocumentation.status === "available"
  );
  const unavailable = registry.filter(({ propDocumentation }) =>
    propDocumentation.status === "unavailable"
  );
  assertEquals(available.length, 106);
  assertEquals(unavailable.length, 3);
  for (const { meta, propDocumentation } of available) {
    if (propDocumentation.status !== "available") {
      throw new TypeError(`${meta.slug} unexpectedly lacks prop evidence`);
    }
    for (const prop of propDocumentation.props) {
      assert(
        !prop.type.includes("readonly readonly"),
        `${meta.slug} repeats a readonly modifier in ${prop.type}`,
      );
    }
  }
  assertEquals(
    unavailable.map(({ meta }) => meta.slug).toSorted(),
    ["agent-mention", "button", "mention"],
  );
  for (const { meta, propDocumentation } of unavailable) {
    if (propDocumentation.status !== "unavailable") {
      throw new TypeError(`${meta.slug} unexpectedly has prop evidence`);
    }
    assert(
      propDocumentation.reason.trim().length > 0,
      `${meta.slug} needs an omission reason`,
    );
    assertStringIncludes(propDocumentation.reason, "source union");
  }

  const appSource = await Deno.readTextFile(
    join(PACKAGE_ROOT, "styleguide", "app.tsx"),
  );
  assertStringIncludes(appSource, "propDocumentation.props.map");
  assertStringIncludes(appSource, "{propDocumentation.reason}");

  const buildSource = await Deno.readTextFile(
    join(PACKAGE_ROOT, "scripts", "build.ts"),
  );
  assertStringIncludes(buildSource, '"doc",');
  assertStringIncludes(buildSource, '"--json",');

  const authoredCatalogueFiles = [
    join(PACKAGE_ROOT, "styleguide", "app.tsx"),
    join(PACKAGE_ROOT, "styleguide", "compositions.tsx"),
  ];
  for (const path of authoredCatalogueFiles) {
    const source = await Deno.readTextFile(path);
    assert(
      !source.includes("Catalogue" + "Prop"),
      `${relative(PACKAGE_ROOT, path)} must consume generated prop evidence`,
    );
    assert(
      !source.includes("Catalogue" + "Variant"),
      `${relative(PACKAGE_ROOT, path)} must consume generated variant evidence`,
    );
    assert(
      !/\bpropDocumentation\s*:/.test(source),
      `${relative(PACKAGE_ROOT, path)} must not author a prop table`,
    );
  }
});

Deno.test("Catalogue version and composition source share their authorities", async () => {
  const { packageVersion } = await catalogue();
  const manifest = JSON.parse(
    await Deno.readTextFile(join(PACKAGE_ROOT, "deno.json")),
  ) as { readonly version: string };
  assertEquals(packageVersion, manifest.version);

  assertEquals(
    compositionRecipes.map(({ id }) => id),
    [
      "documentation-task",
      "next-action",
      "failure-triage",
      "handoff-receipt",
      "survey-artifacts",
    ],
  );
  for (const recipe of compositionRecipes) {
    assertStringIncludes(
      recipe.source,
      'from "@discern-sh/design-system/react";',
    );
  }
  const source = await Deno.readTextFile(
    join(PACKAGE_ROOT, "styleguide", "compositions.tsx"),
  );
  assertEquals(
    [...source.matchAll(/\bconst \w+Recipe = defineRecipe\(\{/g)].length,
    compositionRecipes.length,
  );
  assertEquals(
    [...source.matchAll(/\bsource: \(definition\) =>/g)].length,
    compositionRecipes.length,
  );
});
