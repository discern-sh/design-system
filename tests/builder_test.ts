import { assert, assertEquals } from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { builderDiscoveryRecords } from "../catalogue/builder/discovery/registry.ts";
import { preflightBuilderDocument } from "../catalogue/builder/inspector/preflight.ts";
import { inspectorControlRecords } from "../catalogue/builder/inspector/registry.ts";
import { emptyDocument, insertChild } from "../catalogue/builder/model.ts";
import {
  instantiateComponent,
  registryCoreEntries,
} from "../catalogue/builder/registry-core.ts";
import { renderBuilderChild } from "../catalogue/builder/render.tsx";

Deno.test("Builder feature projections consume one registry core and one accepted document", () => {
  assertEquals(
    builderDiscoveryRecords.map(({ payload }) => payload?.core),
    [...registryCoreEntries],
  );
  assertEquals(
    inspectorControlRecords.map(({ slug }) => slug),
    registryCoreEntries.map(({ registry }) => registry.meta.slug),
  );
  const instance = instantiateComponent("button");
  const document = insertChild(
    emptyDocument("Integrated authority check"),
    { parent: "root" },
    0,
    instance,
  );
  const preflight = preflightBuilderDocument(document);
  assert(preflight.ok);
  assert(preflight.tsx.includes("<Button"));
  assert(renderToStaticMarkup(renderBuilderChild(instance)).length > 0);
});

Deno.test("feature commands never retain React synthetic events", async () => {
  // React nulls event.currentTarget after dispatch, so a deferred command
  // must consume primitive values captured before entering the store.
  for (
    const module of [
      "inspector/inspector.tsx",
      "tree/controller.ts",
      "workspace/toolbar.tsx",
    ]
  ) {
    const source = await Deno.readTextFile(
      new URL(`../catalogue/builder/${module}`, import.meta.url),
    );
    for (const [index, chunk] of source.split("apply(").entries()) {
      if (index === 0) continue;
      const head = chunk.slice(0, 300);
      assert(
        !head.includes("event."),
        `an apply() command in ${module} reads the synthetic event:\n${
          head.slice(0, 160)
        }`,
      );
    }
  }
});

Deno.test("Builder features cannot bypass the registry core or accepted history", async () => {
  const featureModules = [
    "discovery/palette.tsx",
    "discovery/registry.ts",
    "inspector/inspector.tsx",
    "inspector/preflight.ts",
    "inspector/registry.ts",
    "preview/canvas.tsx",
    "tree/controller.ts",
    "workspace/toolbar.tsx",
    "workspace/workspace.tsx",
  ] as const;
  const sources = await Promise.all(featureModules.map(async (module) => ({
    module,
    source: await Deno.readTextFile(
      new URL(`../catalogue/builder/${module}`, import.meta.url),
    ),
  })));
  for (const { module, source } of sources) {
    assert(
      !source.includes("registry-index.ts"),
      `${module} bypasses its registry projection through the compatibility index`,
    );
    assert(
      !source.includes("initialHistory(") &&
        !source.includes("commitHistory(") &&
        !source.includes("undoHistory(") &&
        !source.includes("redoHistory("),
      `${module} created an independent document history`,
    );
  }
  const store = await Deno.readTextFile(
    new URL(
      "../catalogue/builder/workspace/document-store.ts",
      import.meta.url,
    ),
  );
  assert(store.includes("initialHistory("));
  assert(store.includes("commitHistory("));
});
