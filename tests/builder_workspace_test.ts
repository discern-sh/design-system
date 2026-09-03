import { assert, assertEquals, assertStringIncludes } from "@std/assert";

Deno.test("builder font-role changes reset inherited UI OpenType features", async () => {
  const css = (await Promise.all([
    "workspace",
    "discovery",
    "preview",
    "inspector",
    "layers",
  ].map((owner) =>
    Deno.readTextFile(
      new URL(`../catalogue/builder/styles/${owner}.css`, import.meta.url),
    )
  ))).join("\n");
  const incompatibleRules = (source: string): readonly string[] =>
    (source.match(/[^{}]+\{[^{}]*\}/g) ?? []).filter((rule) =>
      /font-family:\s*var\(--discern-font-(?:display|mono)\)/.test(rule) &&
      !/font-feature-settings:\s*normal/.test(rule)
    );

  const futureSibling = `.future-builder-label {
    font-family: var(--discern-font-display);
  }`;
  assertEquals(incompatibleRules(futureSibling).length, 1);
  assertEquals(
    incompatibleRules(css),
    [],
    "Every builder display or mono role must reset the shell's UI-only features",
  );
});

Deno.test("builder bootstrap and styles expose concrete feature ownership", async () => {
  const app = await Deno.readTextFile(
    new URL("../catalogue/builder/app.tsx", import.meta.url),
  );
  assertStringIncludes(app, "BuilderWorkspace");
  assert(!app.includes("useState"));

  const entrypoint = await Deno.readTextFile(
    new URL("../catalogue/builder/builder.css", import.meta.url),
  );
  assertEquals(
    [...entrypoint.matchAll(/styles\/([a-z-]+)\.css/g)].map((match) =>
      match[1]
    ),
    ["shell", "discovery", "preview", "inspector", "layers", "workspace"],
    "workspace responsive rules must follow every feature's base rules",
  );
  for (
    const owner of [
      "workspace",
      "discovery",
      "preview",
      "inspector",
      "layers",
    ]
  ) {
    const css = await Deno.readTextFile(
      new URL("../catalogue/builder/styles/" + owner + ".css", import.meta.url),
    );
    assert(css.length > 500, owner + ".css is an empty ownership wrapper");
  }
});
