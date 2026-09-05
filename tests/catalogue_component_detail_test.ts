import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { catalogue, catalogueEntry } from "./support/catalogue.ts";
import {
  ComponentEvidence,
  componentExampleUnavailableReason,
  ComponentSourceActions,
  ComponentSpecimen,
} from "../catalogue/pages/components/component-preview.tsx";
import {
  componentDetailHref,
  parseComponentDetailState,
} from "../catalogue/pages/components/detail-state.ts";
import { defaultCatalogueTerminalPresentation } from "../catalogue/terminal-theme.ts";

Deno.test("detail URL defaults and valid fragments preserve canonical surface selection", async () => {
  const { registry } = await catalogue();
  for (const entry of registry) {
    for (const surface of ["web", "cli"] as const) {
      const state = parseComponentDetailState(
        entry,
        new URL(
          "https://catalogue.example/?example=not-an-example&view=invalid",
        ),
        surface,
      );
      assertEquals(state, {
        surface,
        exampleId: entry.canonicalExamples.find((example) =>
          example.surfaces.includes(surface)
        )?.id ?? entry.canonicalExamples[0]?.id ?? "default",
        view: "single",
      });
      assertEquals(
        parseComponentDetailState(
          entry,
          new URL(
            componentDetailHref(entry, state),
            "https://catalogue.example",
          ),
          "web",
        ),
        state,
      );
    }
  }
  const command = catalogueEntry(registry, "command");
  assertEquals(
    parseComponentDetailState(
      command,
      new URL(
        "https://catalogue.example/?surface=web&example=invalid#component-command--cli-failure",
      ),
      "web",
    ),
    {
      surface: "cli",
      exampleId: "failure",
      view: "single",
    },
  );
});

Deno.test("Component detail URL state round-trips canonical evidence", async () => {
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
        terminalPresentation: defaultCatalogueTerminalPresentation,
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
      terminalPresentation: defaultCatalogueTerminalPresentation,
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
