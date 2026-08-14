import { assert, assertEquals, assertMatch } from "@std/assert";
import { stripAnsi } from "../src/cli/ansi.ts";
import { catalogueCliCapabilities } from "../styleguide/cli-preview.tsx";
import { registry } from "../styleguide/generated/registry.ts";
import { parseTerminalAnsi } from "../styleguide/terminal-ansi.ts";

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
      const projected = parseTerminalAnsi(output).map(({ text }) => text).join(
        "",
      );
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
