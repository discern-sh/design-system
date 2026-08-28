import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDesignSystem } from "../scripts/build.ts";
import { BuilderDocumentError } from "../catalogue/builder/export.ts";
import { emptyDocument } from "../catalogue/builder/model.ts";
import { documentPolicy } from "../catalogue/builder/registry-core.ts";
import {
  builderPreviewMessageFromEvent,
  builderPreviewSnapshot,
} from "../catalogue/builder/preview/protocol.ts";

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

Deno.test("canvas hover styling never overrides the selection outline", async () => {
  // Hover and selection both draw outlines; an unguarded hover rule outranks
  // the selection ring, hiding it exactly while the pointer is over the node.
  const css = await Deno.readTextFile(
    new URL("../catalogue/builder/styles/preview.css", import.meta.url),
  );
  const hoverRules = css.match(
    /\[data-discern-builder-node\][^,{]*:hover[^,{]*/g,
  ) ?? [];
  assert(hoverRules.length > 0);
  for (const rule of hoverRules) {
    assertStringIncludes(rule, ":not([data-discern-builder-selected])");
  }
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
    viewport: { id: "fluid", label: "Fluid" },
    appearance: { theme: "light", accentHue: 255 },
    mode: "edit",
    selectionId: null,
  });
  assertEquals(
    builderPreviewMessageFromEvent(
      { origin: "https://catalogue.test", data: snapshot },
      "https://catalogue.test",
      documentPolicy,
    ),
    snapshot,
  );
  assertEquals(
    builderPreviewMessageFromEvent(
      { origin: "https://elsewhere.test", data: snapshot },
      "https://catalogue.test",
      documentPolicy,
    ),
    undefined,
  );
  assertThrows(() =>
    builderPreviewMessageFromEvent(
      {
        origin: "https://catalogue.test",
        data: { ...snapshot, document: { ...snapshot.document, version: 2 } },
      },
      "https://catalogue.test",
      documentPolicy,
    )
  );
});
