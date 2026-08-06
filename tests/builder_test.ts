import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { renderToStaticMarkup } from "react-dom/server";
import { buildDesignSystem } from "../scripts/build.ts";
import { packageManifest } from "../src/manifest.ts";
import { compositionCost } from "../styleguide/builder/cost.ts";
import type { ControlSource } from "../styleguide/builder/controls.ts";
import {
  createNode,
  defaultProps,
  deriveControls,
} from "../styleguide/builder/controls.ts";
import {
  BuilderDocumentError,
  documentSelectionSnippet,
  documentToTsx,
  parseDocument,
  serializeDocument,
} from "../styleguide/builder/export.ts";
import type {
  BuilderDocument,
  BuilderNode,
  BuilderSlotChild,
} from "../styleguide/builder/model.ts";
import {
  componentCount,
  duplicateChild,
  emptyDocument,
  findChild,
  insertChild,
  isWithinSubtree,
  moveChild,
  nudgeChild,
  removeChild,
  updateNodeExtra,
  updateNodeProp,
  updateTextChild,
  usedSlugs,
} from "../styleguide/builder/model.ts";

function node(
  id: string,
  slug: string,
  props: BuilderNode["props"] = {},
): BuilderNode {
  return { kind: "component", id, slug, props };
}

function text(id: string, value: string): BuilderSlotChild {
  return { kind: "text", id, text: value };
}

function slot(
  ...children: readonly BuilderSlotChild[]
): BuilderNode["props"][string] {
  return { kind: "slot", children };
}

const naming = {
  slugToExport: new Map([
    ["badge", "Badge"],
    ["button", "Button"],
    ["hero-block", "HeroBlock"],
    ["stack", "Stack"],
  ]),
};

Deno.test("builder document operations keep the tree consistent", () => {
  let document = emptyDocument("Test page");
  const stack = node("s1", "stack", { children: slot() });
  document = insertChild(document, { parent: "root" }, 0, stack);
  const inStack = { parent: "node", nodeId: "s1", prop: "children" } as const;
  document = insertChild(document, inStack, 0, text("t1", "Welcome"));
  document = insertChild(document, inStack, 1, node("b1", "button"));
  document = insertChild(document, inStack, 2, node("b2", "badge"));

  assertEquals(componentCount(document), 3);
  assertEquals(usedSlugs(document), ["stack", "button", "badge"]);
  assertEquals(findChild(document, "b2")?.index, 2);
  assert(isWithinSubtree(document, "s1", "b1"));
  assert(!isWithinSubtree(document, "b1", "s1"));

  document = nudgeChild(document, "b2", -1);
  assertEquals(findChild(document, "b2")?.index, 1);
  document = moveChild(document, "t1", inStack, 3);
  assertEquals(findChild(document, "t1")?.index, 2);

  const refused = moveChild(
    document,
    "s1",
    { parent: "node", nodeId: "b1", prop: "children" },
    0,
  );
  assertEquals(refused, document);
  const vanished = moveChild(
    document,
    "b1",
    { parent: "node", nodeId: "gone", prop: "children" },
    0,
  );
  assertEquals(vanished, document);

  document = updateNodeProp(document, "b1", "variant", {
    kind: "string",
    value: "ghost",
  });
  const button = findChild(document, "b1")?.child;
  assert(button !== undefined && button.kind === "component");
  assertEquals(button.props.variant, { kind: "string", value: "ghost" });
  document = updateNodeProp(document, "b1", "variant", undefined);
  const cleared = findChild(document, "b1")?.child;
  assert(cleared !== undefined && cleared.kind === "component");
  assertEquals(cleared.props.variant, undefined);

  document = updateNodeExtra(document, "b1", '{"aria-label":"Go"}');
  const withExtra = findChild(document, "b1")?.child;
  assert(withExtra !== undefined && withExtra.kind === "component");
  assertEquals(withExtra.extra, '{"aria-label":"Go"}');
  document = updateNodeExtra(document, "b1", "  ");
  const withoutExtra = findChild(document, "b1")?.child;
  assert(withoutExtra !== undefined && withoutExtra.kind === "component");
  assertEquals(withoutExtra.extra, undefined);

  document = updateTextChild(document, "t1", "Hello");
  const greeting = findChild(document, "t1")?.child;
  assert(greeting !== undefined && greeting.kind === "text");
  assertEquals(greeting.text, "Hello");

  const duplicated = duplicateChild(document, "b1");
  assertEquals(componentCount(duplicated), 4);
  const original = findChild(duplicated, "b1");
  assert(original !== undefined);
  const copyContext = duplicated.children[0];
  assert(copyContext !== undefined && copyContext.kind === "component");
  const stackChildren = copyContext.props.children;
  assert(stackChildren !== undefined && stackChildren.kind === "slot");
  const ids = stackChildren.children.map((child) => child.id);
  assertEquals(new Set(ids).size, ids.length);

  document = removeChild(document, "s1");
  assertEquals(componentCount(document), 0);
});

Deno.test("prop controls derive from documented props and variants", () => {
  const source: ControlSource = {
    reactExport: "HeroBlock",
    propDocumentation: {
      status: "available",
      typeName: "HeroBlockProps",
      inheritedTypes: ['Omit<HTMLAttributes<HTMLElement>, "title">'],
      props: [
        { name: "title", type: "ReactNode", required: true },
        { name: "trigger", type: "ReactElement", required: true },
        { name: "headingLevel", type: "1 | 2", required: false },
        { name: "layout", type: '"split" | "centered"', required: false },
        { name: "surface", type: "HeroBlockSurface", required: false },
        { name: "raised", type: "boolean", required: false },
        { name: "gap", type: "SpaceStep", required: false },
        { name: "rows", type: "readonly HeroRow[]", required: true },
        { name: "count", type: "number", required: false },
        { name: "label", type: "string", required: false },
        {
          name: "onSelect",
          type: "(value: string) => void",
          required: false,
        },
      ],
    },
    variants: [{
      typeName: "HeroBlockSurface",
      values: ["canvas", "sunken", "accent"],
    }],
  };
  const controls = deriveControls(source);
  const byName = new Map(controls.map((control) => [control.name, control]));

  const title = byName.get("title");
  assert(title?.control === "slot" && !title.elementOnly);
  const trigger = byName.get("trigger");
  assert(trigger?.control === "slot" && trigger.elementOnly);
  const heading = byName.get("headingLevel");
  assert(heading?.control === "select");
  assertEquals(heading.options, [1, 2]);
  const layout = byName.get("layout");
  assert(layout?.control === "select");
  assertEquals(layout.options, ["split", "centered"]);
  const surface = byName.get("surface");
  assert(surface?.control === "select");
  assertEquals(surface.options, ["canvas", "sunken", "accent"]);
  assertEquals(byName.get("raised")?.control, "toggle");
  assertEquals(byName.get("gap")?.control, "text");
  assertEquals(byName.get("rows")?.control, "json");
  assertEquals(byName.get("count")?.control, "number");
  assertEquals(byName.get("label")?.control, "text");
  assertEquals(byName.get("label")?.label, "Label");
  assertEquals(byName.get("headingLevel")?.label, "Heading level");
  assert(!byName.has("onSelect"));

  const defaults = defaultProps(controls);
  assertEquals(defaults.title?.kind, "slot");
  assertEquals(defaults.trigger, { kind: "slot", children: [] });
  assertEquals(defaults.rows, { kind: "json", source: "[]" });
  assertEquals(defaults.layout, undefined);
});

Deno.test("union props components fall back to variant controls and a children slot", () => {
  const source: ControlSource = {
    reactExport: "Button",
    propDocumentation: {
      status: "unavailable",
      typeName: "ButtonProps",
      reason: "ButtonProps is a source union.",
    },
    variants: [
      { typeName: "ButtonVariant", values: ["primary", "secondary"] },
      { typeName: "ButtonSize", values: ["sm", "md", "lg"] },
      { typeName: "UnrelatedUnion", values: ["x"] },
    ],
  };
  const controls = deriveControls(source);
  assertEquals(
    controls.map((control) => [control.name, control.control]),
    [["variant", "select"], ["size", "select"], ["children", "slot"]],
  );
  const instance = createNode("button", source);
  assertEquals(instance.slug, "button");
  const children = instance.props.children;
  assert(children !== undefined && children.kind === "slot");
  assertEquals(children.children.length, 1);
});

Deno.test("documents export deterministic consumer TSX", () => {
  const document: BuilderDocument = {
    version: 1,
    name: "Landing hero",
    children: [
      node("s1", "stack", {
        gap: { kind: "string", value: "md" },
        children: slot(
          text("t1", "Welcome"),
          node("b1", "button", {
            variant: { kind: "string", value: "primary" },
            children: slot(text("t2", "Get started")),
          }),
          node("g1", "badge", {
            tone: { kind: "string", value: "accent" },
            children: slot(text("t3", "New")),
          }),
        ),
      }),
    ],
  };

  const expected =
    `import { Badge, Button, Stack } from "@discern-sh/design-system/react";

/** Landing hero — composed with the Discern interface builder. */
export function LandingHero() {
  return (
    <Stack gap="md">
      Welcome
      <Button variant="primary">
        Get started
      </Button>
      <Badge tone="accent">
        New
      </Badge>
    </Stack>
  );
}
`;
  assertEquals(documentToTsx(document, naming), expected);
  assertEquals(documentToTsx(document, naming), expected);
  assertEquals(
    documentSelectionSnippet(document),
    'components: ["badge", "button", "stack"],',
  );
});

Deno.test("TSX export escapes text, spreads extras, and names slots", () => {
  const document: BuilderDocument = {
    version: 1,
    name: "hero",
    children: [
      {
        kind: "component",
        id: "h1",
        slug: "hero-block",
        props: {
          title: slot(text("t1", "Hi")),
          headingLevel: { kind: "number", value: 2 },
          raised: { kind: "boolean", value: true },
          plain: { kind: "boolean", value: false },
          rows: { kind: "json", source: "[]" },
          actions: slot(
            node("b1", "button", {
              children: slot(text("t2", "curly { text }")),
            }),
          ),
        },
        extra: '{"aria-label": "Opening"}',
      },
    ],
  };
  const output = documentToTsx(document, naming);
  assertStringIncludes(output, 'title="Hi"');
  assertStringIncludes(output, "headingLevel={2}");
  assertStringIncludes(output, "raised\n");
  assertStringIncludes(output, "plain={false}");
  assertStringIncludes(output, "rows={[]}");
  assertStringIncludes(output, '{"curly { text }"}');
  assertStringIncludes(output, '{...{"aria-label":"Opening"}}');
  assertStringIncludes(output, "actions={");
  assertStringIncludes(output, "/>");

  const unknown: BuilderDocument = {
    version: 1,
    name: "x",
    children: [node("n1", "not-a-component")],
  };
  assertThrows(
    () => documentToTsx(unknown, naming),
    BuilderDocumentError,
    "unknown component",
  );

  const invalidJson: BuilderDocument = {
    version: 1,
    name: "x",
    children: [
      node("n1", "button", { rows: { kind: "json", source: "{oops" } }),
    ],
  };
  assertThrows(
    () => documentToTsx(invalidJson, naming),
    BuilderDocumentError,
    'prop "rows"',
  );
});

Deno.test("TSX export survives hostile names and lone text roots", () => {
  const emptyName: BuilderDocument = { version: 1, name: "", children: [] };
  assertEquals(
    parseDocument(serializeDocument(emptyName), new Set()),
    emptyName,
  );
  const emptyOutput = documentToTsx(emptyName, naming);
  assertStringIncludes(emptyOutput, "Untitled page");
  assertStringIncludes(emptyOutput, "export function ComposedPage()");

  const hostileName: BuilderDocument = {
    version: 1,
    name: "A */ alert(1); /*",
    children: [],
  };
  const hostileOutput = documentToTsx(hostileName, naming);
  assertEquals(hostileOutput.split("*/").length, 2);

  const loneText: BuilderDocument = {
    version: 1,
    name: "Note",
    children: [text("t1", "Hello world")],
  };
  const loneOutput = documentToTsx(loneText, naming);
  assertStringIncludes(loneOutput, "<>");
  assertStringIncludes(loneOutput, "Hello world");
  assertStringIncludes(loneOutput, "</>");

  const ampersand: BuilderDocument = {
    version: 1,
    name: "Menu",
    children: [
      node("b1", "button", {
        variant: { kind: "string", value: "A & B" },
        children: slot(text("t1", "Fish &amp; Chips")),
      }),
    ],
  };
  const ampersandOutput = documentToTsx(ampersand, naming);
  assertStringIncludes(ampersandOutput, 'variant={"A & B"}');
  assertStringIncludes(ampersandOutput, '{"Fish &amp; Chips"}');
});

Deno.test("documents round-trip through the JSON save format", () => {
  const knownSlugs = new Set(["stack", "button"]);
  const document: BuilderDocument = {
    version: 1,
    name: "Saved page",
    children: [
      node("s1", "stack", {
        gap: { kind: "string", value: "lg" },
        wide: { kind: "boolean", value: true },
        count: { kind: "number", value: 3 },
        rows: { kind: "json", source: "[]" },
        children: slot(text("t1", "Copy"), node("b1", "button")),
      }),
    ],
  };
  assertEquals(
    parseDocument(serializeDocument(document), knownSlugs),
    document,
  );

  assertThrows(
    () => parseDocument("not json", knownSlugs),
    BuilderDocumentError,
    "not valid JSON",
  );
  assertThrows(
    () => parseDocument('{"version":2,"name":"x","children":[]}', knownSlugs),
    BuilderDocumentError,
    "version",
  );
  assertThrows(
    () =>
      parseDocument(
        JSON.stringify({
          version: 1,
          name: "x",
          children: [node("a", "stack"), node("a", "button")],
        }),
        knownSlugs,
      ),
    BuilderDocumentError,
    "repeats an earlier id",
  );
  assertThrows(
    () =>
      parseDocument(
        JSON.stringify({
          version: 1,
          name: "x",
          children: [node("a", "mystery")],
        }),
        knownSlugs,
      ),
    BuilderDocumentError,
    "unknown component",
  );
  assertThrows(
    () =>
      parseDocument(
        JSON.stringify({
          version: 1,
          name: "x",
          children: [
            node("a", "stack", {
              "my prop": { kind: "string", value: "x" },
            }),
          ],
        }),
        knownSlugs,
      ),
    BuilderDocumentError,
    "JSX-safe",
  );
});

Deno.test("composition cost resolves the emitter's dependency closure", () => {
  const dependent = packageManifest.components.find(
    (component) => component.dependencies.length > 0,
  );
  assert(dependent !== undefined);
  const cost = compositionCost([dependent.id, dependent.id]);
  assertEquals(cost.placed, [dependent.id]);
  for (const dependency of dependent.dependencies) {
    assert(cost.resolved.includes(dependency));
  }
  assert(cost.componentCssBytes > 0);

  const behaviorComponent = packageManifest.components.find(
    (component) => component.behaviors.length > 0,
  );
  assert(behaviorComponent !== undefined);
  assert(compositionCost([behaviorComponent.id]).needsBehaviorScript);

  const neutral = packageManifest.components.find((component) =>
    component.behaviors.length === 0 && component.dependencies.length === 0
  );
  assert(neutral !== undefined);
  assert(!compositionCost([neutral.id]).needsBehaviorScript);

  assertThrows(() => compositionCost(["missing"]), Error, "Unknown component");
});

Deno.test("state updaters never read the synthetic event", async () => {
  // React nulls event.currentTarget after dispatch, so an updater callback
  // that touches the event crashes on the deferred invocation.
  const source = await Deno.readTextFile(
    new URL("../styleguide/builder/app.tsx", import.meta.url),
  );
  for (const [index, chunk] of source.split("apply(").entries()) {
    if (index === 0) continue;
    const head = chunk.slice(0, 300);
    assert(
      !head.includes("event."),
      `an apply() updater reads the synthetic event:\n${head.slice(0, 160)}`,
    );
  }
});

interface BuiltBuilderModules {
  readonly registryIndex:
    typeof import("../styleguide/builder/registry-index.ts");
  readonly render: typeof import("../styleguide/builder/render.tsx");
}

let builtModules: Promise<BuiltBuilderModules> | undefined;

function builderModules(): Promise<BuiltBuilderModules> {
  builtModules ??= (async () => {
    await buildDesignSystem();
    const registryIndex = await import(
      "../styleguide/builder/registry-index.ts"
    );
    const render = await import("../styleguide/builder/render.tsx");
    return { registryIndex, render };
  })();
  return builtModules;
}

Deno.test("every catalogue component yields controls, a default instance, and exportable TSX", async () => {
  const { registryIndex } = await builderModules();
  const {
    componentBySlug,
    componentEntries,
    controlsBySlug,
    exportNaming,
    knownSlugs,
  } = registryIndex;
  assert(componentEntries.length >= 100);

  // Inline string-literal unions must survive extraction as select controls.
  const texture = controlsBySlug("card").find(({ name }) => name === "texture");
  assert(texture?.control === "select");
  assertEquals(texture.options, ["plain", "dots"]);
  const layout = controlsBySlug("hero-block").find(({ name }) =>
    name === "layout"
  );
  assert(layout?.control === "select");
  assertEquals(layout.options, ["split", "centered"]);

  // Unions imported from sibling components resolve through shared variants.
  const status = controlsBySlug("agent-persona").find(({ name }) =>
    name === "status"
  );
  assert(status?.control === "select");
  assert(status.options.includes("working"));
  const level = controlsBySlug("anchor-heading").find(({ name }) =>
    name === "level"
  );
  assert(level?.control === "select");
  assert(level.options.includes(2));

  // Derived `(typeof array)[number]` unions become selects, so required
  // ones synthesize valid defaults instead of the literal string "Text".
  const ownership = controlsBySlug("ownership-badge").find(({ name }) =>
    name === "ownership"
  );
  assert(ownership?.control === "select");
  assert(ownership.options.includes("authored"));
  const disposition = controlsBySlug("file-change").find(({ name }) =>
    name === "disposition"
  );
  assert(disposition?.control === "select");

  // Object-shaped props edit as JSON, never as free text.
  const bodyStyle = controlsBySlug("terminal").find(({ name }) =>
    name === "bodyStyle"
  );
  assert(bodyStyle?.control === "json");

  for (const entry of componentEntries) {
    const slug = entry.meta.slug;
    const controls = controlsBySlug(slug);

    if (entry.propDocumentation.status === "available") {
      const controlNames = new Set(controls.map((control) => control.name));
      for (const prop of entry.propDocumentation.props) {
        if (!prop.required) continue;
        if (prop.type.includes("=>") || /^on[A-Z]/.test(prop.name)) continue;
        assert(
          controlNames.has(prop.name),
          `${slug} required prop "${prop.name}" has no inspector control`,
        );
      }
    }

    assert(componentBySlug(slug) !== undefined);
    const instance = registryIndex.instantiateComponent(slug);
    const document = insertChild(
      emptyDocument(`${entry.meta.name} check`),
      { parent: "root" },
      0,
      instance,
    );
    const tsx = documentToTsx(document, exportNaming);
    assertStringIncludes(tsx, `<${entry.reactExport}`);
    assertEquals(
      parseDocument(serializeDocument(document), knownSlugs),
      document,
    );
    assert(compositionCost([slug]).resolved.includes(slug));
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

Deno.test("lenient rendering tolerates mid-edit invalid JSON", async () => {
  const { registryIndex, render } = await builderModules();
  const { instantiateComponent } = registryIndex;
  const { renderBuilderChild } = render;

  const card = { ...instantiateComponent("card"), extra: "{" };
  assertThrows(
    () => renderToStaticMarkup(renderBuilderChild(card)),
    BuilderDocumentError,
  );
  const markup = renderToStaticMarkup(
    renderBuilderChild(card, { lenient: true }),
  );
  assertStringIncludes(markup, "discern-card");
});
