import {
  assert,
  assertEquals,
  assertMatch,
  assertStringIncludes,
} from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { stripAnsi } from "../src/cli/ansi.ts";
import { projectTerminalSpans } from "../src/cli/projection.ts";
import { catalogueCliCapabilities } from "../catalogue/cli-preview.tsx";
import { registry } from "../catalogue/generated/registry.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("browser Catalogue owns one bare cell-stable CLI projection", async () => {
  const catalogueRoot = join(PACKAGE_ROOT, "catalogue");
  const authoredSources: Array<
    { readonly path: string; readonly source: string }
  > = [];
  for await (const entry of Deno.readDir(catalogueRoot)) {
    if (!entry.isFile || !entry.name.endsWith(".tsx")) continue;
    const path = join(catalogueRoot, entry.name);
    authoredSources.push({ path, source: await Deno.readTextFile(path) });
  }

  const renderOwners = authoredSources.filter(({ source }) =>
    source.includes("cli.render(") || source.includes("projectTerminalSpans(")
  );
  assertEquals(
    renderOwners.map(({ path }) => path),
    [join(catalogueRoot, "cli-preview.tsx")],
    "new browser CLI projection containers must join the shared preview",
  );

  const preview = renderOwners[0]?.source ?? "";
  assertStringIncludes(preview, "<pre");
  assertStringIncludes(
    preview,
    'className="discern-catalogue-cli-output"',
  );
  assert(
    !/<Terminal(?:\s|>)/.test(preview),
    "CLI output must not grow window chrome",
  );
  assert(
    !preview.includes("components/display/terminal"),
    "browser projection must not depend on the showcase Terminal component",
  );

  const css = await Deno.readTextFile(
    join(catalogueRoot, "catalogue.css"),
  );
  const outputRule = /\.discern-catalogue-cli-output\s*\{(?<body>[^}]*)\}/.exec(
    css,
  )
    ?.groups?.body;
  assert(outputRule !== undefined, "missing shared CLI output rule");
  for (
    const invariant of [
      "padding: 0;",
      "font-family: ui-monospace",
      'font-feature-settings: "liga" 0, "calt" 0;',
      "font-variant-ligatures: none;",
      "white-space: pre;",
    ]
  ) {
    assertStringIncludes(outputRule, invariant);
  }
});

Deno.test("browser Catalogue projects every declared CLI stance from disk", () => {
  const fragments = new Set<string>();
  for (const entry of registry) {
    assertEquals(entry.cli.stance, entry.meta.cli.stance);
    if (entry.cli.stance === "exempt") {
      assertEquals(entry.meta.cli.stance, "exempt");
      if (entry.meta.cli.stance !== "exempt") {
        throw new TypeError(`${entry.meta.slug} lost its CLI exemption`);
      }
      assertEquals(entry.cli.reason, entry.meta.cli.reason);
      assert(entry.cli.reason.trim().length > 0);
      continue;
    }

    assert(entry.cli.examples.length > 0, `${entry.meta.slug} needs examples`);
    for (const example of entry.cli.examples) {
      assertMatch(example.name, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      const fragment = `component-${entry.meta.slug}--cli-${example.name}`;
      assert(!fragments.has(fragment), `duplicate CLI fragment ${fragment}`);
      fragments.add(fragment);

      const output = entry.cli.render(
        example.props,
        catalogueCliCapabilities,
      );
      assert(output.length > 0, `${fragment} rendered an empty frame`);
      const projected = projectTerminalSpans(output).map(({ text }) => text)
        .join("");
      assertEquals(projected, stripAnsi(output), `${fragment} lost text`);
    }
  }
});

Deno.test("browser Catalogue enrols grouped interactions and lossless Fleet identities", () => {
  for (
    const [slug, exampleName] of [
      ["select", "grouped"],
      ["fleet", "lossless-identities"],
    ] as const
  ) {
    const entry = registry.find(({ meta }) => meta.slug === slug);
    assert(entry !== undefined, `${slug} is missing from the Catalogue`);
    assertEquals(entry.cli.stance, "rendered");
    if (entry.cli.stance !== "rendered") continue;
    assert(
      entry.cli.examples.some(({ name }) => name === exampleName),
      `${slug} is missing CLI example ${exampleName}`,
    );
  }
});
