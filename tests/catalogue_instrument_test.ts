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
import { compositionRecipes } from "../catalogue/compositions.tsx";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

interface CatalogueState {
  readonly name: string;
  readonly label: string;
}

type PropDocumentation =
  | {
    readonly status: "available";
    readonly props: readonly {
      readonly name: string;
      readonly type: string;
      readonly required: boolean;
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
        "../catalogue/generated/registry.ts?catalogue-instrument-test",
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
  assertEquals(available.length + unavailable.length, registry.length);
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
  // Union Props components (the linked/static branch pattern) document
  // their merged shared surface instead of an omission reason.
  for (const slug of ["agent-mention", "button", "mention"]) {
    const documentation = entry(registry, slug).propDocumentation;
    if (documentation.status !== "available") {
      throw new TypeError(`${slug} lost its merged union prop evidence`);
    }
    const names = documentation.props.map(({ name }) => name);
    assert(
      names.includes("href"),
      `${slug} should document the linked branch's href as optional`,
    );
    const href = documentation.props.find(({ name }) => name === "href");
    assert(href !== undefined && !href.required && href.type === "string");
  }

  const appSource = await Deno.readTextFile(
    join(PACKAGE_ROOT, "catalogue", "app.tsx"),
  );
  assertStringIncludes(appSource, "propDocumentation.props.map");
  assertStringIncludes(appSource, "{propDocumentation.reason}");

  const buildSource = await Deno.readTextFile(
    join(PACKAGE_ROOT, "scripts", "build.ts"),
  );
  assertStringIncludes(buildSource, '"doc",');
  assertStringIncludes(buildSource, '"--json",');

  const authoredCatalogueFiles = [
    join(PACKAGE_ROOT, "catalogue", "app.tsx"),
    join(PACKAGE_ROOT, "catalogue", "compositions.tsx"),
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
    join(PACKAGE_ROOT, "catalogue", "compositions.tsx"),
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

Deno.test("Catalogue navigation stays stable while purpose filters the component view", async () => {
  const source = await Deno.readTextFile(
    join(PACKAGE_ROOT, "catalogue", "app.tsx"),
  );
  const navStart = source.indexOf(
    '<nav className="discern-catalogue-nav" aria-label="Catalogue">',
  );
  const navEnd = source.indexOf("</nav>", navStart);
  assert(navStart >= 0 && navEnd > navStart, "missing Catalogue navigation");
  const navigation = source.slice(navStart, navEnd);

  assert(!navigation.includes("Purpose collections"));
  assert(!navigation.includes("discern-catalogue-nav__collection"));
  assert(!navigation.includes("<button"));
  assertStringIncludes(navigation, "sidebarGroupedComponents.map");
  assertStringIncludes(source, "<span>Filter components by purpose</span>");

  const css = await Deno.readTextFile(
    join(PACKAGE_ROOT, "catalogue", "catalogue.css"),
  );
  const pickerRule = /\.discern-catalogue-purpose-picker\s*\{(?<body>[^}]*)\}/
    .exec(css);
  const pickerBody = pickerRule?.groups?.body;
  assert(pickerBody !== undefined, "missing purpose picker rule");
  assertStringIncludes(pickerBody, "display: grid;");
  assert(!pickerBody.includes("display: none;"));
});

Deno.test("Catalogue search presents explicit destinations without filtering the page", async () => {
  const source = await Deno.readTextFile(
    join(PACKAGE_ROOT, "catalogue", "app.tsx"),
  );

  assertStringIncludes(source, "SearchPalette,");
  assertStringIncludes(source, "SearchPaletteResult,");
  assertStringIncludes(source, "const searchDestinations");
  assertStringIncludes(source, "const searchResults");
  assertStringIncludes(source, "catalogueSearchRank");
  assertStringIncludes(source, "title === `${query}s`");
  assertStringIncludes(source, 'aria-haspopup="dialog"');
  assertStringIncludes(source, 'label="Search the Catalogue"');
  assertStringIncludes(source, "<SearchPaletteResult");
  assertStringIncludes(source, "prepareComponentNavigation");
  assert(
    !source.includes("normalizedQuery"),
    "typing in search must not silently mutate the rendered inventory",
  );
});

Deno.test("Catalogue switches each ordinary Component while conformance stays web-only", async () => {
  const source = await Deno.readTextFile(
    join(PACKAGE_ROOT, "catalogue", "app.tsx"),
  );
  assertStringIncludes(source, 'parameters.get("surface")');
  assertStringIncludes(source, "componentSurfaces[entry.meta.slug]");
  assertStringIncludes(source, "changeComponentSurface(entry.meta.slug, next)");
  assertStringIncludes(
    source,
    "<CliComponentPreview entry={entry} theme={terminalTheme} />",
  );
  assertStringIncludes(source, 'role="group"');
  assertStringIncludes(source, "aria-pressed={resolvedSurface === candidate}");
  assertStringIncludes(source, 'candidate === "web" ? "Web" : "CLI"');
  assertStringIncludes(source, 'states.length !== 1 || name !== "default"');
  assertStringIncludes(source, "const cliUnavailableReason");
  assertStringIncludes(source, "const resolvedSurface");
  assertStringIncludes(source, "<Tooltip");
  assertStringIncludes(source, "label={cliUnavailableReason}");
  assertStringIncludes(source, "disabled");
  assertStringIncludes(source, 'aria-label="CLI preview unavailable"');

  const conformanceStart = source.indexOf("if (conformanceMode)");
  const ordinaryStart = source.indexOf(
    '<div\n      className="discern-catalogue-shell"',
    conformanceStart,
  );
  assert(
    conformanceStart >= 0 && ordinaryStart > conformanceStart,
    "missing Catalogue render boundaries",
  );
  const conformance = source.slice(conformanceStart, ordinaryStart);
  assertStringIncludes(conformance, 'surface="web"');
  assert(!conformance.includes("onSurfaceChange"));

  const ordinary = source.slice(ordinaryStart);
  assertStringIncludes(ordinary, "onSurfaceChange={(next) =>");
});

Deno.test("Catalogue component panels share a closed canonical order", async () => {
  const source = await Deno.readTextFile(
    join(PACKAGE_ROOT, "catalogue", "app.tsx"),
  );
  const previewStart = source.indexOf("function ComponentPreview");
  const previewEnd = source.indexOf("function JourneyPreview", previewStart);
  assert(
    previewStart >= 0 && previewEnd > previewStart,
    "missing shared ComponentPreview renderer",
  );
  const preview = source.slice(previewStart, previewEnd);
  const summaries = [...preview.matchAll(/<summary>([^<]+)<\/summary>/g)].map(
    (match) => match[1],
  );

  assertEquals(summaries, [
    "Best practices",
    "Selection and React import",
    "Props and variants",
  ]);
  assertEquals([...preview.matchAll(/<details\b/g)].length, summaries.length);
  assert(!/<details\b[^>]*\bopen(?:\s|=|>)/.test(preview));
  assert(!preview.includes("<footer"));
});

Deno.test("Command text carries the stronger readable type treatment", async () => {
  const source = await Deno.readTextFile(
    join(
      PACKAGE_ROOT,
      "src",
      "components",
      "workflow",
      "command",
      "command.css",
    ),
  );
  const rule = /\.discern-command__text\s*\{(?<body>[^}]*)\}/.exec(source);
  const body = rule?.groups?.body;
  assert(body !== undefined, "missing .discern-command__text rule");
  assertStringIncludes(
    body,
    "font-size: var(--discern-font-size-sm);",
  );
  assertStringIncludes(
    body,
    "font-weight: var(--discern-font-weight-strong);",
  );
});
