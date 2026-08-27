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

Deno.test("component example vocabularies bind every live Web and CLI implementation", async () => {
  const { catalogueWebExample, registry } = await catalogue();
  const fragmentIds = new Set<string>();
  const surfaceOnlyReasonOwners = new Map<string, Set<string>>();
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
    assert(candidate.canonicalExamples.length > 0, candidate.meta.slug);
    const ids = new Set<string>();
    const labels = new Set<string>();
    for (const [index, definition] of candidate.canonicalExamples.entries()) {
      assertMatch(definition.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert(definition.label.trim().length > 0, candidate.meta.slug);
      assert(!ids.has(definition.id), candidate.meta.slug);
      assert(!labels.has(definition.label), candidate.meta.slug);
      ids.add(definition.id);
      labels.add(definition.label);
      if (definition.id === "default") assertEquals(index, 0);
      assertEquals(
        [...new Set(definition.surfaces)],
        definition.surfaces,
        candidate.meta.slug,
      );
      assert(
        definition.surfaces.length === 1 ||
          definition.surfaces.length === 2,
        candidate.meta.slug,
      );
      if (definition.surfaces.length === 1) {
        assert(
          definition.reason !== undefined &&
            definition.reason.trim().length >= 24,
          `${candidate.meta.slug}:${definition.id} needs a specific impossibility reason`,
        );
        const reason = definition.reason.trim();
        const owners = surfaceOnlyReasonOwners.get(reason) ?? new Set<string>();
        owners.add(candidate.meta.slug);
        surfaceOnlyReasonOwners.set(reason, owners);
      } else {
        assertEquals(definition.reason, undefined, candidate.meta.slug);
      }
    }

    const expectedWeb = candidate.canonicalExamples
      .filter(({ surfaces }) => surfaces.includes("web"))
      .map(({ id, label }) => ({ id, label }));
    assertEquals(
      candidate.webExamples.map(({ id, label }) => ({ id, label })),
      expectedWeb,
      candidate.meta.slug,
    );
    const webIds = new Set(expectedWeb.map(({ id }) => id));
    for (const scenario of candidate.conformance) {
      assert(
        webIds.has(scenario.example),
        `${candidate.meta.slug} conformance scenario targets undeclared Web example ${scenario.example}`,
      );
      assert(scenario.name.trim().length > 0, candidate.meta.slug);
    }
    for (const example of candidate.webExamples) {
      assertEquals(
        catalogueWebExample(candidate.meta.slug, example.id),
        example,
      );
      const fragmentId = `component-${candidate.meta.slug}--${example.id}`;
      assert(!fragmentIds.has(fragmentId));
      fragmentIds.add(fragmentId);
    }

    assertEquals(candidate.cli.stance, candidate.meta.cli.stance);
    if (candidate.cli.stance === "exempt") {
      assertEquals(
        candidate.canonicalExamples.some(({ surfaces }) =>
          surfaces.includes("cli")
        ),
        false,
        candidate.meta.slug,
      );
      continue;
    }

    const expectedCli = candidate.canonicalExamples
      .filter(({ surfaces }) => surfaces.includes("cli"))
      .map(({ id, label }) => ({ id, label }));
    assertEquals(
      candidate.cli.examples.map(({ id, label }) => ({ id, label })),
      expectedCli,
      candidate.meta.slug,
    );
    const shared = candidate.canonicalExamples.filter(({ surfaces }) =>
      surfaces.includes("web") && surfaces.includes("cli")
    );
    assert(shared.length > 0, `${candidate.meta.slug} needs a shared example`);
    const sharedIds = new Set(shared.map(({ id }) => id));
    assertEquals(
      candidate.webExamples.filter(({ id }) => sharedIds.has(id)).map(
        ({ id, label }) => ({ id, label }),
      ),
      candidate.cli.examples.filter(({ id }) => sharedIds.has(id)).map(
        ({ id, label }) => ({ id, label }),
      ),
      candidate.meta.slug,
    );
  }
  for (const [reason, owners] of surfaceOnlyReasonOwners) {
    assertEquals(
      owners.size,
      1,
      `surface-only reason is reused across Components ${
        [...owners].join(", ")
      }: ${reason}`,
    );
  }
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
