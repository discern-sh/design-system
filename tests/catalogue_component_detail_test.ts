import {
  assert,
  assertEquals,
  assertNotEquals,
  assertStringIncludes,
} from "@std/assert";
import { createElement, Fragment } from "react";
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
        width: "fit",
        expanded: false,
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
      width: "fit",
      expanded: false,
    },
  );
});

Deno.test("detail view, width, and expansion state round-trip through canonical URLs", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const inspection = parseComponentDetailState(
    command,
    new URL(
      "https://catalogue.example/catalogue/components/command/?example=overflow&view=playground&width=narrow&expanded=1",
    ),
    "web",
  );
  assertEquals(inspection, {
    surface: "web",
    exampleId: "overflow",
    view: "playground",
    width: "narrow",
    expanded: true,
  });
  const href = componentDetailHref(command, inspection, { anchor: true });
  assertEquals(
    href,
    "/catalogue/components/command/?example=overflow&view=playground&width=narrow&expanded=1",
  );
  assertEquals(
    parseComponentDetailState(
      command,
      new URL(href, "https://catalogue.example"),
      "web",
    ),
    inspection,
  );
  assertEquals(
    parseComponentDetailState(
      command,
      new URL(
        "https://catalogue.example/?view=states&width=invalid&expanded=2",
      ),
      "web",
    ).view,
    "states",
  );
  assertEquals(
    parseComponentDetailState(
      command,
      new URL("https://catalogue.example/?width=oversize&expanded=yes"),
      "web",
    ),
    {
      surface: "web",
      exampleId: command.canonicalExamples[0]?.id ?? "default",
      view: "single",
      width: "fit",
      expanded: false,
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
    width: "fit",
    expanded: false,
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

interface DetailPlaygroundModules {
  readonly playground:
    typeof import("../catalogue/pages/components/detail-playground.ts");
  readonly render: typeof import("../catalogue/builder/render.tsx");
}

let playgroundModules: Promise<DetailPlaygroundModules> | undefined;

function detailPlayground(): Promise<DetailPlaygroundModules> {
  playgroundModules ??= (async () => {
    await catalogue();
    return {
      playground: await import(
        "../catalogue/pages/components/detail-playground.ts"
      ),
      render: await import("../catalogue/builder/render.tsx"),
    };
  })();
  return playgroundModules;
}

Deno.test("every registry entry enrolls a truthful starter or an explicit blocking reason", async () => {
  const { registry } = await catalogue();
  const { playground, render } = await detailPlayground();
  let ready = 0;
  for (const entry of registry) {
    const starter = playground.createDetailStarter(entry.meta.slug);
    if (starter.status === "unavailable") {
      assertStringIncludes(starter.reason, "Builder", entry.meta.slug);
      assertStringIncludes(starter.reason, entry.meta.name, entry.meta.slug);
      continue;
    }
    ready += 1;
    const markup = renderToStaticMarkup(
      createElement(Fragment, null, render.renderBuilderChild(starter.node)),
    );
    assert(markup.length > 0, `${entry.meta.slug} starter rendered nothing`);
    const usage = playground.detailStarterUsage(entry, starter.node);
    assertStringIncludes(usage.tsx, `<${entry.reactExport}`, entry.meta.slug);
    assertStringIncludes(
      usage.tsx,
      '"@discern-sh/design-system/react"',
      entry.meta.slug,
    );
    assert(
      !/from "\.\.?\//.test(usage.tsx),
      `${entry.meta.slug} starter usage leaks local imports`,
    );
    assertStringIncludes(
      usage.selection,
      JSON.stringify(entry.meta.slug),
      entry.meta.slug,
    );
    if (starter.core.requiredFunctionProps.length > 0) {
      assertStringIncludes(usage.tsx, "callbacks.", entry.meta.slug);
    }
  }
  assert(ready > 0, "no Component enrolled a ready starter");
});

Deno.test("playground adjustments feed the render and the export from one model", async () => {
  const { registry } = await catalogue();
  const { playground, render } = await detailPlayground();
  const button = catalogueEntry(registry, "button");
  const starter = playground.createDetailStarter("button");
  assert(starter.status === "ready");
  const pristine = renderToStaticMarkup(
    createElement(Fragment, null, render.renderBuilderChild(starter.node)),
  );

  const controls = playground.detailPlaygroundControls(
    starter.core,
    starter.node,
  );
  const variant = controls.fields.find(({ name }) => name === "variant");
  assert(
    variant?.control === "select" && variant.options.includes("secondary"),
  );
  const withVariant = playground.changeDetailProp(starter.node, "variant", {
    kind: "string",
    value: "secondary",
  });
  assert("node" in withVariant);
  const label = controls.textSlots.find(({ name }) => name === "children");
  assert(label !== undefined);
  const withLabel = playground.changeDetailSlotText(
    withVariant.node,
    label,
    "Ship the change",
  );
  assert("node" in withLabel);
  assertEquals(
    playground.detailSlotText(withLabel.node, label),
    "Ship the change",
  );

  const adjusted = renderToStaticMarkup(
    createElement(Fragment, null, render.renderBuilderChild(withLabel.node)),
  );
  assertStringIncludes(adjusted, "Ship the change");
  assertNotEquals(adjusted, pristine);
  const usage = playground.detailStarterUsage(button, withLabel.node);
  assertStringIncludes(usage.tsx, 'variant="secondary"');
  assertStringIncludes(usage.tsx, "Ship the change");

  const refusedHandler = playground.changeDetailProp(
    withLabel.node,
    "onClick",
    { kind: "string", value: "alert" },
  );
  assert("error" in refusedHandler);
  assertStringIncludes(refusedHandler.error, "executable handler");
  const refusedUnknown = playground.changeDetailProp(
    withLabel.node,
    "mystery",
    { kind: "string", value: "value" },
  );
  assert("error" in refusedUnknown);
  assertStringIncludes(refusedUnknown.error, "not a modeled prop");
});

Deno.test("the state strip presents committed snapshots and review posture links", async () => {
  const { registry } = await catalogue();
  const { ComponentStateStrip } = await import(
    "../catalogue/pages/components/detail-states.tsx"
  );
  const command = catalogueEntry(registry, "command");
  const detailState = {
    surface: "web",
    exampleId: "default",
    view: "states",
    width: "fit",
    expanded: false,
  } as const;
  const markup = renderToStaticMarkup(createElement(ComponentStateStrip, {
    entry: command,
    theme: "light",
    state: detailState,
  }));
  assertEquals(
    [...markup.matchAll(/data-discern-detail-state="/g)].length,
    command.canonicalExamples.filter(({ surfaces }) => surfaces.includes("web"))
      .length,
  );
  assertStringIncludes(
    markup,
    "/catalogue/generated/example-images/command--default--light.png",
  );
  assertStringIncludes(markup, "Snapshot — not operable");
  assertStringIncludes(markup, "Open live");

  const authored = registry.find((entry) =>
    entry.reviewPostures.some((posture) =>
      !posture.id.startsWith("settled-") &&
      posture.unavailableReason === undefined
    )
  );
  assert(authored !== undefined, "no Component authors a review posture");
  const posture = authored.reviewPostures.find((candidate) =>
    !candidate.id.startsWith("settled-") &&
    candidate.unavailableReason === undefined
  );
  assert(posture !== undefined);
  const strip = renderToStaticMarkup(createElement(ComponentStateStrip, {
    entry: authored,
    theme: "dark",
    state: detailState,
  }));
  assertStringIncludes(strip, "/catalogue/reviews/components/?group=");
  assertStringIncludes(strip, `posture=${posture.id}`);
  assertStringIncludes(strip, posture.category);
});

Deno.test("detail evidence can omit the selection disclosure the page presents openly", async () => {
  const { registry } = await catalogue();
  const command = catalogueEntry(registry, "command");
  const evidence = renderToStaticMarkup(
    createElement(ComponentEvidence, {
      entry: command,
      sections: ["guidance", "api"],
    }),
  );
  assertEquals(
    [...evidence.matchAll(/<summary>([^<]+)<\/summary>/g)].map((match) =>
      match[1]
    ),
    ["Usage guidance", "Props and variants"],
  );
  assert(!evidence.includes("Selection and import"));
});
