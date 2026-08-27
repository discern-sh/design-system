import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { fromFileUrl, join, relative } from "@std/path";
import {
  type CataloguePurpose,
  cataloguePurposes,
} from "../src/types/component-meta.ts";
import { catalogue, catalogueEntry } from "./support/catalogue.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("Catalogue purposes are closed, selective, and guidance-backed", async () => {
  const { registry } = await catalogue();
  const knownPurposes = new Set<string>(cataloguePurposes);
  const purposeCounts = Object.fromEntries(
    cataloguePurposes.map((purpose) => [purpose, 0]),
  ) as Record<CataloguePurpose, number>;

  for (const { meta } of registry) {
    const memberships = meta.purposes ?? [];
    assertEquals(new Set(memberships).size, memberships.length);
    for (const purpose of memberships) {
      assert(knownPurposes.has(purpose));
      purposeCounts[purpose] += 1;
    }
  }
  for (const purpose of cataloguePurposes) {
    assert(purposeCounts[purpose] > 0);
    assert(purposeCounts[purpose] < registry.length);
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
    "verification-report",
    "result-summary",
  ]);
  for (const { meta } of registry) {
    if (meta.group !== "Workflow" && !confusedPairSlugs.has(meta.slug)) {
      continue;
    }
    assert(meta.useWhen !== undefined && meta.useWhen.length > 0);
    assert(meta.notWhen !== undefined && meta.notWhen.length > 0);
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
    assert(candidate.states.length > 0);
    for (const state of candidate.states) {
      assertMatch(state.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert(state.label.trim().length > 0);
      assert(!stateNames.has(state.name));
      stateNames.add(state.name);
      const fragmentId = `component-${candidate.meta.slug}--${state.name}`;
      assert(!fragmentIds.has(fragmentId));
      fragmentIds.add(fragmentId);
    }
  }
  assertEquals(
    catalogueEntry(registry, "command").states.map(({ name }) => name),
    ["default", "overflow", "failure"],
  );
  assertEquals(
    catalogueEntry(registry, "table").states.map(({ name }) => name),
    ["default", "dense-overflow", "rich-cells"],
  );
});

Deno.test("Catalogue prop evidence is source-derived and complete", async () => {
  const { registry } = await catalogue();
  for (const { meta, propDocumentation } of registry) {
    if (propDocumentation.status === "unavailable") {
      assert(propDocumentation.reason.trim().length > 0, meta.slug);
      continue;
    }
    for (const prop of propDocumentation.props) {
      assert(!prop.type.includes("readonly readonly"), meta.slug);
    }
  }
  for (const slug of ["agent-mention", "button", "mention"]) {
    const documentation = catalogueEntry(registry, slug).propDocumentation;
    assert(documentation.status === "available");
    const href = documentation.props.find(({ name }) => name === "href");
    assert(href !== undefined && !href.required && href.type === "string");
  }

  const buildSource = await Deno.readTextFile(
    join(PACKAGE_ROOT, "scripts", "build.ts"),
  );
  assertStringIncludes(buildSource, '"doc",');
  assertStringIncludes(buildSource, '"--json",');
  const authoredCatalogueFiles: string[] = [];
  for await (
    const entry of Deno.readDir(join(PACKAGE_ROOT, "catalogue", "pages"))
  ) {
    if (!entry.isDirectory) continue;
    const directory = join(PACKAGE_ROOT, "catalogue", "pages", entry.name);
    for await (const child of Deno.readDir(directory)) {
      if (child.isFile && child.name.endsWith(".tsx")) {
        authoredCatalogueFiles.push(join(directory, child.name));
      }
    }
  }
  for (const path of authoredCatalogueFiles) {
    const source = await Deno.readTextFile(path);
    assert(
      !source.includes("Catalogue" + "Prop"),
      relative(PACKAGE_ROOT, path),
    );
    assert(
      !source.includes("Catalogue" + "Variant"),
      relative(PACKAGE_ROOT, path),
    );
    assert(
      !/\bpropDocumentation\s*:/.test(source),
      relative(PACKAGE_ROOT, path),
    );
  }
});

Deno.test("Catalogue version derives from the package manifest", async () => {
  const { packageVersion } = await catalogue();
  const manifest = JSON.parse(
    await Deno.readTextFile(join(PACKAGE_ROOT, "deno.json")),
  ) as { readonly version: string };
  assertEquals(packageVersion, manifest.version);
});
