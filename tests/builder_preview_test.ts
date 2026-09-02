import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { isValidElement } from "react";
import { buildDesignSystem } from "../scripts/build.ts";
import { BuilderDocumentError } from "../catalogue/builder/export.ts";
import { emptyDocument } from "../catalogue/builder/model.ts";
import { documentPolicy } from "../catalogue/builder/registry-core.ts";
import {
  deriveBuilderCallbackProps,
  registryCoreBySlug,
} from "../catalogue/builder/registry-core.ts";
import { builderPreviewAccent } from "../catalogue/builder/preview/controls.tsx";
import {
  catalogueAppearanceOptions,
  defaultCatalogueAppearanceOption,
} from "../catalogue/shell/appearance-options.ts";
import {
  builderPreviewMessageFromEvent,
  builderPreviewSnapshot,
  formatBuilderPreviewCallbackWitness,
} from "../catalogue/builder/preview/protocol.ts";
import {
  displayRectFromLogical,
  logicalPointFromDisplay,
  previewDecorationFlags,
  previewNodeAtPoint,
} from "../catalogue/builder/preview/geometry.ts";

interface BuiltBuilderModules {
  readonly registryIndex:
    typeof import("../catalogue/builder/registry-index.ts");
  readonly render: typeof import("../catalogue/builder/render.tsx");
}

let builtModules: Promise<BuiltBuilderModules> | undefined;

function builderModules(): Promise<BuiltBuilderModules> {
  builtModules ??= (async () => {
    await buildDesignSystem();
    const registryIndex = await import(
      "../catalogue/builder/registry-index.ts"
    );
    const render = await import("../catalogue/builder/render.tsx");
    return { registryIndex, render };
  })();
  return builtModules;
}

Deno.test("canvas hover decoration never overrides the selection outline", () => {
  assertEquals(previewDecorationFlags("node", "node", "node", null), {
    selected: true,
    hovered: false,
    dropped: false,
  });
  assertEquals(previewDecorationFlags("node", null, "node", "node"), {
    selected: false,
    hovered: true,
    dropped: true,
  });
});

Deno.test("default instances render real markup through the shared renderer", async () => {
  const { registryIndex, render } = await builderModules();
  const { componentEntries, instantiateComponent } = registryIndex;
  const { renderBuilderChild, rendersFromDefaults } = render;

  let rendered = 0;
  for (const entry of componentEntries) {
    const slug = entry.meta.slug;
    if (!rendersFromDefaults(slug)) continue;
    const markup = renderToStaticMarkup(
      renderBuilderChild(instantiateComponent(slug)),
    );
    assert(
      markup.length > 0,
      `${slug} rendered empty markup from its default instance`,
    );
    rendered += 1;
  }
  assert(
    rendered >= componentEntries.length / 2,
    "most components should render from synthesized defaults",
  );
});

Deno.test("cloneElement components preview a lone slotted element", async () => {
  const { registryIndex, render } = await builderModules();
  const { instantiateComponent } = registryIndex;
  const { renderBuilderChild } = render;

  const tooltip = instantiateComponent("tooltip");
  const configured = {
    ...tooltip,
    props: {
      ...tooltip.props,
      children: { kind: "slot", children: [instantiateComponent("button")] },
    },
  } as typeof tooltip;
  const markup = renderToStaticMarkup(renderBuilderChild(configured));
  assertStringIncludes(markup, "discern-tooltip");
  assertStringIncludes(markup, "discern-button");
});

Deno.test("the canvas renders newlines in text literals as line breaks", async () => {
  const { registryIndex, render } = await builderModules();
  const { instantiateComponent } = registryIndex;
  const { renderBuilderChild } = render;

  const button = instantiateComponent("button");
  const configured = {
    ...button,
    props: {
      ...button.props,
      children: {
        kind: "slot",
        children: [{ kind: "text", id: "t1", text: "One\nTwo" }],
      },
    },
  } as typeof button;
  const markup = renderToStaticMarkup(renderBuilderChild(configured));
  assertStringIncludes(markup, "One<br/>Two");
});

Deno.test("the shared renderer refuses unaccepted JSON", async () => {
  const { registryIndex, render } = await builderModules();
  const { instantiateComponent } = registryIndex;
  const { renderBuilderChild } = render;

  const card = { ...instantiateComponent("card"), extra: "{" };
  assertThrows(
    () => renderToStaticMarkup(renderBuilderChild(card)),
    BuilderDocumentError,
    "valid JSON",
  );
});

Deno.test("the shared renderer preserves safe passthrough props only", async () => {
  const { registryIndex, render } = await builderModules();
  const { instantiateComponent } = registryIndex;
  const { renderBuilderChild } = render;

  const safe = {
    ...instantiateComponent("card"),
    extra: JSON.stringify({
      "aria-label": "Safe card",
      "data-test-id": "safe-card",
      className: "consumer-card",
      style: { opacity: 0.8 },
      title: "Ordinary prop",
    }),
  };
  const markup = renderToStaticMarkup(renderBuilderChild(safe));
  assertStringIncludes(markup, 'aria-label="Safe card"');
  assertStringIncludes(markup, 'data-test-id="safe-card"');
  assertStringIncludes(markup, "consumer-card");
  assertStringIncludes(markup, "opacity:0.8");
  assertStringIncludes(markup, 'title="Ordinary prop"');

  const unsafe = {
    ...instantiateComponent("card"),
    extra: '{"dangerouslySetInnerHTML":{"__html":"<b>owned</b>"}}',
  };
  assertThrows(
    () => renderToStaticMarkup(renderBuilderChild(unsafe)),
    BuilderDocumentError,
    "dangerouslySetInnerHTML",
  );
});

Deno.test("preview messages are same-origin, versioned, and policy-accepted", () => {
  const snapshot = builderPreviewSnapshot({
    document: emptyDocument("Protocol check"),
    documentKey: JSON.stringify(emptyDocument("Protocol check")),
    viewport: { id: "fluid", label: "Fluid", logicalWidth: 860 },
    zoom: { id: "fit", scale: 1 },
    appearance: {
      theme: "light",
      resolvedTheme: "dark",
      accent: "field",
      field: {
        darkness: 0.6,
        structure: 1.2,
        emphasis: 0.8,
        density: 1.1,
        preset: "blue",
      },
    },
    mode: "edit",
    selectionId: null,
    interactionRevision: 0,
  });
  assertEquals(
    builderPreviewMessageFromEvent(
      { origin: "https://catalogue.test", data: snapshot, source: null },
      "https://catalogue.test",
      documentPolicy,
    ),
    snapshot,
  );
  assertEquals(
    builderPreviewMessageFromEvent(
      { origin: "https://elsewhere.test", data: snapshot, source: null },
      "https://catalogue.test",
      documentPolicy,
    ),
    undefined,
  );
  assertEquals(
    builderPreviewMessageFromEvent(
      {
        origin: "https://catalogue.test",
        data: {
          ...snapshot,
          appearance: {
            ...snapshot.appearance,
            field: { ...snapshot.appearance.field!, darkness: 1.2 },
          },
        },
        source: null,
      },
      "https://catalogue.test",
      documentPolicy,
    ),
    undefined,
  );
  assertEquals(
    builderPreviewMessageFromEvent(
      {
        origin: "https://catalogue.test",
        data: { ...snapshot, documentKey: "stale-document-identity" },
        source: null,
      },
      "https://catalogue.test",
      documentPolicy,
    ),
    undefined,
  );
  assertEquals(
    builderPreviewMessageFromEvent(
      {
        origin: "https://catalogue.test",
        data: { ...snapshot, document: { ...snapshot.document, version: 2 } },
        source: null,
      },
      "https://catalogue.test",
      documentPolicy,
    ),
    undefined,
  );
  const sources = new MessageChannel();
  assertEquals(
    builderPreviewMessageFromEvent(
      {
        origin: "https://catalogue.test",
        data: snapshot,
        source: sources.port1,
      },
      "https://catalogue.test",
      documentPolicy,
      sources.port2,
    ),
    undefined,
  );
  assertEquals(
    builderPreviewMessageFromEvent(
      {
        origin: "https://catalogue.test",
        data: {
          ...snapshot,
          document: {
            ...snapshot.document,
            extra: () => "code cannot cross",
          },
        },
        source: null,
      },
      "https://catalogue.test",
      documentPolicy,
    ),
    undefined,
  );
});

Deno.test("preview geometry maps logical hit testing independently of visual zoom", () => {
  assertEquals(
    logicalPointFromDisplay(
      { clientX: 174, clientY: 116 },
      { left: 24, top: 16 },
      0.5,
    ),
    { x: 300, y: 200 },
  );
  assertEquals(
    displayRectFromLogical(
      { x: 120, y: 80, width: 240, height: 64 },
      0.75,
    ),
    { x: 90, y: 60, width: 180, height: 48 },
  );
  assertEquals(
    previewNodeAtPoint([
      { id: "parent", rect: { x: 0, y: 0, width: 300, height: 200 } },
      { id: "child", rect: { x: 80, y: 40, width: 120, height: 60 } },
    ], { x: 100, y: 50 }),
    "child",
  );
});

Deno.test("callback witnesses are deterministic inert summaries", () => {
  assertEquals(
    formatBuilderPreviewCallbackWitness("onValueChange", ["details"]),
    'onValueChange("details")',
  );
  assertEquals(
    formatBuilderPreviewCallbackWitness("onCommit", [{ z: 1, a: true }]),
    'onCommit({"a":true,"z":1})',
  );
  assertEquals(
    formatBuilderPreviewCallbackWitness("onOpenChange", [false]),
    "onOpenChange(false)",
  );
});

Deno.test("preview callback witnesses enroll optional future interactions without changing export requirements", () => {
  assertEquals(
    deriveBuilderCallbackProps([
      {
        name: "onFutureChange",
        type: "(value: string) => void",
        required: false,
      },
      { name: "label", type: "string", required: true },
    ], new Set()),
    {
      preview: [{ name: "onFutureChange" }],
      required: [],
    },
  );
  assertEquals(
    registryCoreBySlug.get("tabs")?.previewCallbackProps,
    [{ name: "onValueChange" }],
  );
  assertEquals(
    registryCoreBySlug.get("tabs")?.requiredFunctionProps,
    [],
  );
});

Deno.test("the shared preview renderer injects optional callback witnesses only when requested", async () => {
  const { registryIndex, render } = await builderModules();
  const tabs = registryIndex.instantiateComponent("tabs");
  const witnessed: string[] = [];
  const rendered = render.renderBuilderChild(tabs, {
    callback: (_node, prop) => {
      witnessed.push(prop);
      return () => undefined;
    },
  });
  assert(isValidElement<Record<string, unknown>>(rendered));
  assertEquals(typeof rendered.props.onValueChange, "function");
  assertEquals(witnessed, ["onValueChange"]);
  const inert = render.renderBuilderChild(tabs);
  assert(isValidElement<Record<string, unknown>>(inert));
  assertEquals(inert.props.onValueChange, undefined);
});

Deno.test("Builder preview Appearance accepts only the exhaustive shared presets", () => {
  for (const option of catalogueAppearanceOptions) {
    assertEquals(builderPreviewAccent(option.id), option);
    if (option.kind === "hue") {
      assertEquals(builderPreviewAccent(String(option.hue)), option);
    }
  }
  assertEquals(
    builderPreviewAccent("145"),
    defaultCatalogueAppearanceOption,
  );
  assertEquals(
    builderPreviewAccent("not-a-preset"),
    defaultCatalogueAppearanceOption,
  );
});

Deno.test("preview styles preserve a real frame width and stable editor chrome", async () => {
  const css = await Deno.readTextFile(
    new URL("../catalogue/builder/styles/preview.css", import.meta.url),
  );
  assertStringIncludes(css, ".discern-builder-preview-frame");
  assertStringIncludes(
    css,
    "transform: scale(var(--discern-builder-preview-zoom))",
  );
  assertStringIncludes(css, "--discern-builder-editor-selection");
  assertStringIncludes(css, "@media (prefers-reduced-motion: reduce)");
  assertStringIncludes(css, "@media (forced-colors: active)");
  assert(
    !/\.discern-builder-preview-frame[^}]*max-width/.test(css),
    "the logical frame must never be silently max-width capped",
  );
});

Deno.test("the frame bootstrap admits only the trusted local bundle", async () => {
  const [canvas, frame] = await Promise.all([
    Deno.readTextFile(
      new URL("../catalogue/builder/preview/canvas.tsx", import.meta.url),
    ),
    Deno.readTextFile(
      new URL("../catalogue/builder/preview.html", import.meta.url),
    ),
  ]);
  assertStringIncludes(canvas, 'sandbox="allow-same-origin allow-scripts"');
  assertStringIncludes(frame, "default-src 'none'");
  assertStringIncludes(frame, "form-action 'none'");
  assertStringIncludes(frame, 'src="../dist/builder.js"');
  assertStringIncludes(frame, 'href="./styles/preview.css"');
  assert(!frame.includes('href="./builder.css"'));
  assert(!frame.includes("unsafe-eval"));
});
