import {
  assert,
  assertEquals,
  assertMatch,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../src/cli/ansi.ts";
import { resolveCliExampleCapabilities } from "../src/cli/contracts.ts";
import { projectTerminalSpans } from "../src/cli/projection.ts";
import { measureText } from "../src/cli/text.ts";
import {
  catalogueCliCapabilities,
  CliComponentPreview,
} from "../catalogue/cli-preview.tsx";
import { registry } from "../catalogue/generated/registry.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("browser Catalogue owns one bare CLI projection authority", async () => {
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
    source.includes("cli.render(") ||
    source.includes("projectTerminalInlineHtml(")
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
  assertStringIncludes(preview, "projectTerminalInlineHtml(value)");
  assert(!preview.includes("exampleLabel("));
  assertStringIncludes(preview, "const { id, label, props } = example");
  assert(
    !/<Terminal(?:\s|>)/.test(preview),
    "CLI output must not grow window chrome",
  );
  assert(
    !preview.includes("components/display/terminal"),
    "browser projection must not depend on the showcase Terminal component",
  );
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
      assertMatch(example.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert(example.label.trim().length > 0);
      const fragment = `component-${entry.meta.slug}--cli-${example.id}`;
      assert(!fragments.has(fragment), `duplicate CLI fragment ${fragment}`);
      fragments.add(fragment);

      const output = entry.cli.render(
        example.props,
        resolveCliExampleCapabilities(example, catalogueCliCapabilities),
      );
      assert(output.length > 0, `${fragment} rendered an empty frame`);
      const projected = projectTerminalSpans(output).map(({ text }) => text)
        .join("");
      assertEquals(projected, stripAnsi(output), `${fragment} lost text`);
    }
  }
});

Deno.test("Markdown Catalogue keeps narrow layout separate from capability fallback", () => {
  const markdown = registry.find(({ meta }) => meta.slug === "markdown");
  assert(markdown !== undefined);
  assertEquals(markdown.cli.stance, "rendered");
  if (markdown.cli.stance !== "rendered") return;
  const example = markdown.cli.examples.find(({ id }) =>
    id === "narrow-layout"
  );
  assert(example !== undefined);
  const capabilities = resolveCliExampleCapabilities(
    example,
    catalogueCliCapabilities,
  );
  assertEquals(capabilities, {
    ansiControl: true,
    colorDepth: "truecolor",
    columns: 24,
    unicode: true,
  });
  const output = markdown.cli.render(example.props, capabilities);
  assertStringIncludes(output, "\u001b[");
  assertStringIncludes(stripAnsi(output), "• Preserve");
  for (const line of output.split("\n")) {
    assert(measureText(line) <= 24, line);
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
      entry.cli.examples.some(({ id }) => id === exampleName),
      `${slug} is missing CLI example ${exampleName}`,
    );
  }
});

Deno.test("browser CLI specimens follow the resolved Catalogue terminal theme", () => {
  const heading = registry.find(({ meta }) => meta.slug === "heading");
  if (heading === undefined) throw new TypeError("heading is missing");

  const light = renderToStaticMarkup(
    createElement(CliComponentPreview, { entry: heading, theme: "light" }),
  );
  const dark = renderToStaticMarkup(
    createElement(CliComponentPreview, { entry: heading, theme: "dark" }),
  );

  assertStringIncludes(light, 'data-discern-theme="light"');
  assertStringIncludes(dark, 'data-discern-theme="dark"');
  assertNotEquals(light, dark);
  assertEquals(
    [...light.matchAll(/<h5>([^<]+)<\/h5>/g)].map((match) => match[1]),
    heading.cli.stance === "rendered"
      ? heading.cli.examples.map(({ label }) => label)
      : [],
  );
});

Deno.test("Theme toggle owns the only semantic collision with terminal theme props", () => {
  const owners = new Set<string>();
  for (const entry of registry) {
    if (entry.cli.stance !== "rendered") continue;
    for (const { props } of entry.cli.examples) {
      if (props !== null && typeof props === "object" && "theme" in props) {
        owners.add(entry.meta.slug);
      }
    }
  }
  assertEquals([...owners].sort(), ["theme-toggle"]);
});

Deno.test("Catalogue palette injection preserves Theme toggle example states", () => {
  const themeToggle = registry.find(({ meta }) => meta.slug === "theme-toggle");
  if (themeToggle === undefined) throw new TypeError("theme toggle is missing");

  const light = renderToStaticMarkup(
    createElement(CliComponentPreview, {
      entry: themeToggle,
      theme: "light",
    }),
  );

  assertStringIncludes(light, "Switch to the dark theme");
  assertStringIncludes(light, "Switch to the light theme");
  assertStringIncludes(light, 'data-discern-theme="light"');
});
