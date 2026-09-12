import {
  assert,
  assertEquals,
  assertMatch,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi } from "../src/cli/ansi.ts";
import { resolveCliExampleCapabilities } from "../src/cli/contracts.ts";
import { projectTerminalSpans } from "../src/cli/projection.ts";
import { measureText } from "../src/cli/text.ts";
import {
  catalogueCliCapabilities,
  catalogueCliExampleProps,
  CliComponentPreview,
  CliExamplePreview,
  projectCliExample,
} from "../catalogue/cli-preview.tsx";
import { parseTerminalLabState } from "../catalogue/terminal-lab-state.ts";
import { projectTerminalLayoutRecipe } from "../catalogue/terminal-layout-inspector.tsx";
import { registry } from "../catalogue/generated/registry.ts";
import { resolveCatalogueTerminalPresentation } from "../catalogue/terminal-theme.ts";

const fieldLight = resolveCatalogueTerminalPresentation("light", undefined);
const fieldDark = resolveCatalogueTerminalPresentation("dark", undefined);
const fractionalAccent = resolveCatalogueTerminalPresentation("dark", 137.5);

Deno.test("Component inspection and recipe projection share capability state without rewriting example facts", () => {
  for (const slug of ["command", "markdown", "select"]) {
    const entry = registry.find(({ meta }) => meta.slug === slug)!;
    assert(entry.cli.stance === "rendered");
    for (const example of entry.cli.examples) {
      const facts = JSON.stringify(example);
      const canonical = projectCliExample(entry, example.id, fieldLight).output;
      for (const columns of [40, 80, 120]) {
        for (const unicode of [true, false]) {
          for (const color of ["none", "ansi16", "ansi256", "truecolor"]) {
            const controls = ["unicode", "colorDepth"] as const;
            const { state } = parseTerminalLabState(
              new URLSearchParams(
                `columns=${columns}&unicode=${unicode ? 1 : 0}&color=${color}`,
              ),
              controls,
            );
            const inspected = projectCliExample(
              entry,
              example.id,
              fieldLight,
              state,
            );
            const cli = entry.cli;
            const recipe = {
              id: "future-specimen",
              title: "Future specimen",
              description: "Same authored example",
              components: [slug],
              capabilityControls: controls,
              source: "",
              render: (capabilities: Parameters<typeof cli.render>[1]) =>
                cli.render(
                  catalogueCliExampleProps(slug, example.props, fieldLight),
                  resolveCliExampleCapabilities(example, capabilities),
                ),
            };
            assertEquals(
              inspected.output,
              projectTerminalLayoutRecipe(recipe, state, fieldLight).output,
            );
            for (
              const [key, value] of Object.entries(example.capabilities ?? {})
            ) {
              assertEquals(
                inspected
                  .capabilities[key as keyof typeof inspected.capabilities],
                value,
              );
            }
          }
        }
      }
      assertEquals(JSON.stringify(example), facts);
      assertEquals(
        projectCliExample(entry, example.id, fieldLight).output,
        canonical,
      );
    }
  }
});

Deno.test("one named CLI specimen uses the bare shared projection", () => {
  const entry = registry.find(({ cli }) => cli.stance === "rendered");
  assert(entry !== undefined && entry.cli.stance === "rendered");
  const example = entry.cli.examples[0];
  assert(example !== undefined);
  const markup = renderToStaticMarkup(createElement(CliExamplePreview, {
    entry,
    exampleId: example.id,
    presentation: fractionalAccent,
  }));
  assertStringIncludes(
    markup,
    `data-discern-cli-example-state="${example.id}"`,
  );
  assertStringIncludes(markup, example.label);
  assertEquals([...markup.matchAll(/<pre\b/g)].length, 1);
  assertStringIncludes(markup, 'class="discern-catalogue-cli-output"');
  assertStringIncludes(markup, 'data-discern-terminal-ground="dark"');
  assertStringIncludes(markup, 'data-discern-terminal-appearance="accent"');
  assertStringIncludes(markup, 'data-discern-terminal-accent-hue="137.5"');
  assertEquals(markup.includes('class="discern-terminal'), false);
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
      const markup = renderToStaticMarkup(
        createElement(CliComponentPreview, {
          entry,
          presentation: fieldDark,
        }),
      );
      assertStringIncludes(
        markup,
        'class="discern-catalogue-cli-exemption"',
      );
      assertStringIncludes(
        markup,
        'data-discern-catalogue-copy="decision"',
      );
      assertMatch(
        markup,
        /<p data-discern-catalogue-copy="decision">[^<]+<\/p>/,
      );
      continue;
    }

    assert(entry.cli.examples.length > 0, `${entry.meta.slug} needs examples`);
    for (const example of entry.cli.examples) {
      assertMatch(example.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
      assert(example.label.trim().length > 0);
      const fragment = `component-${entry.meta.slug}--cli-${example.id}`;
      assert(!fragments.has(fragment), `duplicate CLI fragment ${fragment}`);
      fragments.add(fragment);

      for (const presentation of [fieldLight, fractionalAccent]) {
        const output = entry.cli.render(
          catalogueCliExampleProps(
            entry.meta.slug,
            example.props,
            presentation,
          ),
          resolveCliExampleCapabilities(example, catalogueCliCapabilities),
        );
        assert(
          output.length > 0,
          `${fragment}/${
            presentation.appearance.accent ?? "mono"
          } rendered an empty frame`,
        );
        const projected = projectTerminalSpans(output).map(({ text }) => text)
          .join("");
        assertEquals(
          projected,
          stripAnsi(output),
          `${fragment}/${presentation.appearance.accent ?? "mono"} lost text`,
        );
      }
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

Deno.test("browser CLI specimens follow the resolved Catalogue terminal presentation", () => {
  const heading = registry.find(({ meta }) => meta.slug === "heading");
  if (heading === undefined) throw new TypeError("heading is missing");

  const light = renderToStaticMarkup(
    createElement(CliComponentPreview, {
      entry: heading,
      presentation: fieldLight,
    }),
  );
  const dark = renderToStaticMarkup(
    createElement(CliComponentPreview, {
      entry: heading,
      presentation: fractionalAccent,
    }),
  );

  assertStringIncludes(light, 'data-discern-theme="light"');
  assertStringIncludes(dark, 'data-discern-theme="dark"');
  assert(!light.includes("data-discern-accent"));
  assertStringIncludes(dark, 'data-discern-accent=""');
  assertStringIncludes(dark, "--discern-accent-hue:137.5");
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
      presentation: fieldLight,
    }),
  );

  assertStringIncludes(light, "Switch to the dark theme");
  assertStringIncludes(light, "Switch to the light theme");
  assertStringIncludes(light, 'data-discern-theme="light"');
});
