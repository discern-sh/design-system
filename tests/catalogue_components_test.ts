import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { fromFileUrl, join } from "@std/path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import {
  ComponentEvidence,
  componentExampleUnavailableReason,
  ComponentPreview,
  ComponentSourceActions,
  ComponentSpecimen,
} from "../catalogue/pages/components/component-preview.tsx";
import {
  ComponentCollectionCard,
  ComponentResultCard,
} from "../catalogue/pages/components/directory-card.tsx";
import { componentDirectory } from "../catalogue/pages/components/collections.ts";
import {
  componentDetailHref,
  componentExplorerHref,
  parseComponentDetailState,
  parseComponentExplorerState,
} from "../catalogue/pages/components/state.ts";
import {
  representativeComponentExampleImage,
} from "../catalogue/example-images.ts";
import { componentSearchRecords } from "../catalogue/routes.ts";
import {
  explanatoryMatchReason,
  searchRecords,
} from "../catalogue/search/mod.ts";
import { catalogue, catalogueEntry } from "./support/catalogue.ts";

const PACKAGE_ROOT = fromFileUrl(new URL("../", import.meta.url));

Deno.test("Theme Toggle's Catalogue example presents one page-chrome control", async () => {
  const { registry } = await catalogue();
  const example = catalogueEntry(registry, "theme-toggle").webExamples[0];
  assert(example !== undefined);
  const markup = renderToStaticMarkup(
    createElement(example.Example),
  );
  assertEquals(
    markup.match(/class="[^"]*\bdiscern-theme-toggle\b[^"]*"/g)?.length,
    1,
  );
  assertEquals(markup.includes("Lorem ipsum"), false);
});

Deno.test("complete Component panels keep supporting disclosures closed in canonical order", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const markup = renderToStaticMarkup(
    createElement(ComponentPreview, {
      entry: command,
      surface: "web",
      terminalTheme: "dark",
      onSurfaceChange: () => undefined,
    }),
  );
  const summaries = [...markup.matchAll(/<summary>([^<]+)<\/summary>/g)].map(
    (match) => match[1],
  );
  assertEquals(summaries, [
    "Usage guidance",
    "Selection and import",
    "Props and variants",
  ]);
  assertEquals([...markup.matchAll(/<details\b/g)].length, summaries.length);
  assert(!/<details\b[^>]*\bopen(?:\s|=|>)/.test(markup));
  assertStringIncludes(markup, "Web");
  assertStringIncludes(markup, "CLI");
  assertStringIncludes(markup, "Open React source");
  assertEquals(markup.includes("<footer"), false);
  assertEquals(
    [
      ...markup.matchAll(
        /<section\b[^>]*\bdata-discern-example-state="[^"]+"[^>]*><header><h5>([^<]+)<\/h5>/g,
      ),
    ].map((match) => match[1]),
    command.webExamples.map(({ label }) => label),
  );
});

Deno.test("Component collections derive counts, summaries, imagery, browse, and Compare paths", async () => {
  const { registry } = await catalogue();
  const directory = componentDirectory(registry);
  assertEquals(directory.components, registry);
  for (const collection of [...directory.groups, ...directory.purposes]) {
    const markup = renderToStaticMarkup(
      createElement(ComponentCollectionCard, { collection }),
    );
    assertStringIncludes(
      markup,
      `${collection.members.length} Component${
        collection.members.length === 1 ? "" : "s"
      }`,
    );
    assertStringIncludes(markup, `href="${collection.browseHref}`);
    assertStringIncludes(markup, `href="${collection.compareHref}`);
    if (collection.members.length > 4) {
      assertStringIncludes(markup, `+${collection.members.length - 4} more`);
    }
    assertEquals(
      [...markup.matchAll(/data-discern-collection-image=/g)].length,
      Math.min(3, collection.members.length) * 2,
    );
    assertEquals(markup.includes("data-discern-component="), false);
  }
});

Deno.test("every Component result card uses generated representative imagery without mounting specimens", async () => {
  const { registry } = await catalogue();
  for (const entry of registry) {
    const markup = renderToStaticMarkup(
      createElement(ComponentResultCard, {
        entry,
        showGroup: true,
      }),
    );
    for (const theme of ["light", "dark"] as const) {
      const image = representativeComponentExampleImage(
        entry.meta.slug,
        theme,
      );
      assert(image !== undefined, `${entry.meta.slug}/${theme}`);
      assertStringIncludes(markup, `src="${image.assetUrl}"`);
      assertStringIncludes(markup, `width="${image.width}"`);
      assertStringIncludes(markup, `height="${image.height}"`);
    }
    assertStringIncludes(markup, `>${entry.meta.name}</h3>`);
    assertStringIncludes(
      markup,
      entry.cli.stance === "rendered" ? "Web and CLI" : "Web only",
    );
    assertEquals(markup.includes("data-discern-component="), false);
  }
});

Deno.test("Component result cards project the universal engine's match reason", async () => {
  const { registry } = await catalogue();
  const result = searchRecords(
    componentSearchRecords(registry),
    "call to action",
  )[0];
  assert(result?.record.payload !== undefined);
  const reason = explanatoryMatchReason(result);
  assert(reason !== undefined);
  assertEquals(result.record.title, "CTA band");
  const markup = renderToStaticMarkup(createElement(ComponentResultCard, {
    entry: result.record.payload,
    showGroup: true,
    matchReason: reason,
  }));
  assertStringIncludes(
    markup,
    `Matched ${reason.label.toLowerCase()}: ${reason.value}`,
  );
  assertStringIncludes(
    markup,
    'class="discern-catalogue-component-card__description" data-discern-catalogue-copy="decision"',
  );
  assertStringIncludes(
    markup,
    'class="discern-catalogue-component-card__match" data-discern-catalogue-copy="decision"',
  );

  const descriptionMatch = renderToStaticMarkup(
    createElement(ComponentResultCard, {
      entry: result.record.payload,
      showGroup: true,
      matchReason: {
        label: "Description",
        value: result.record.payload.meta.description,
      },
    }),
  );
  assertEquals(
    descriptionMatch.split(result.record.payload.meta.description).length - 1,
    1,
  );
  assertEquals(descriptionMatch.includes("Matched description:"), false);
});

Deno.test("Component explorer and detail URL state round-trip canonical evidence", async () => {
  const explorer = parseComponentExplorerState(
    new URL(
      "https://catalogue.example/catalogue/components/?q=proof&group=workflow&purpose=displaying-tool-output&all=1",
    ),
  );
  assertEquals(
    componentExplorerHref(explorer),
    "/catalogue/components/?q=proof&group=workflow&purpose=displaying-tool-output&all=1",
  );

  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const detail = parseComponentDetailState(
    command,
    new URL(
      "https://catalogue.example/catalogue/components/command/?surface=cli&example=failure&view=all#component-command--cli-failure",
    ),
    "web",
  );
  assertEquals(detail, {
    surface: "cli",
    exampleId: "failure",
    view: "all",
  });
  assertEquals(
    componentDetailHref(command, detail, { anchor: true }),
    "/catalogue/components/command/?surface=cli&example=failure&view=all#component-command--cli-failure",
  );
});

Deno.test("detail specimens keep canonical identity across surfaces and make complete review deliberate", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const shared = command.canonicalExamples.find(({ surfaces }) =>
    surfaces.includes("web") && surfaces.includes("cli")
  );
  assert(shared !== undefined);
  for (const surface of ["web", "cli"] as const) {
    const markup = renderToStaticMarkup(
      createElement(ComponentSpecimen, {
        entry: command,
        surface,
        exampleId: shared.id,
        view: "single",
        terminalTheme: "dark",
        headingLevel: 2,
      }),
    );
    assertEquals(
      [...markup.matchAll(/data-discern-(?:cli-)?example-state=/g)].length,
      1,
    );
    assertStringIncludes(markup, shared.label);
  }
  const allMarkup = renderToStaticMarkup(
    createElement(ComponentSpecimen, {
      entry: command,
      surface: "web",
      exampleId: shared.id,
      view: "all",
      terminalTheme: "dark",
      headingLevel: 2,
    }),
  );
  assertEquals(
    [...allMarkup.matchAll(/data-discern-example-state=/g)].length,
    command.webExamples.length,
  );

  const surfaceOnly =
    registry.flatMap((entry) =>
      entry.canonicalExamples.filter(({ surfaces }) => surfaces.length === 1)
        .map((example) => ({ entry, example }))
    )[0];
  assert(surfaceOnly !== undefined);
  const unavailableSurface = surfaceOnly.example.surfaces.includes("web")
    ? "cli"
    : "web";
  assertEquals(
    componentExampleUnavailableReason(
      surfaceOnly.entry,
      surfaceOnly.example.id,
      unavailableSurface,
    ),
    surfaceOnly.example.reason,
  );
});

Deno.test("detail evidence stays closed and source labels describe their destinations", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const evidence = renderToStaticMarkup(
    createElement(ComponentEvidence, { entry: command }),
  );
  assertEquals(
    [...evidence.matchAll(/<summary>([^<]+)<\/summary>/g)].map((match) =>
      match[1]
    ),
    ["Usage guidance", "Selection and import", "Props and variants"],
  );
  assert(!/<details\b[^>]*\bopen(?:\s|=|>)/.test(evidence));

  const sources = renderToStaticMarkup(
    createElement(ComponentSourceActions, { entry: command }),
  );
  assertStringIncludes(sources, "Open React source");
  assertStringIncludes(sources, "/command/command.tsx");
  assertStringIncludes(sources, "Open CLI renderer");
  assertStringIncludes(sources, "/command/command.cli.ts");
  assertStringIncludes(sources, "Open metadata");
  assertStringIncludes(sources, "/command/command.meta.ts");

  for (const entry of registry) {
    const allSources = renderToStaticMarkup(
      createElement(ComponentSourceActions, { entry }),
    );
    const root =
      `/catalogue/src/components/${entry.meta.group.toLowerCase()}/${entry.meta.slug}/${entry.meta.slug}`;
    assertStringIncludes(allSources, `href="${root}.tsx"`);
    assertStringIncludes(allSources, `href="${root}.meta.ts"`);
    assertEquals(
      allSources.includes(`href="${root}.cli.ts"`),
      entry.cli.stance === "rendered",
      entry.meta.slug,
    );
  }
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
  assert(body !== undefined);
  assertStringIncludes(body, "font-size: var(--discern-font-size-sm);");
  assertStringIncludes(
    body,
    "font-weight: var(--discern-font-weight-strong);",
  );
});
