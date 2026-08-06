import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { createElement } from "react";
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
  ancestorsOf,
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
  wrapChild,
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

Deno.test("ancestors resolve and wrapping replaces a child in place", () => {
  let document = emptyDocument("Wrap check");
  const card = node("c1", "card", {
    children: slot(
      node("b1", "button", { children: slot(text("t1", "Go")) }),
    ),
  });
  document = insertChild(document, { parent: "root" }, 0, card);

  assertEquals(ancestorsOf(document, "c1"), []);
  assertEquals(
    ancestorsOf(document, "t1").map((ancestor) => ancestor.id),
    ["c1", "b1"],
  );
  assertEquals(ancestorsOf(document, "missing"), []);

  const wrapper = node("s1", "stack", {
    gap: { kind: "number", value: 4 },
    children: slot(text("seed", "placeholder")),
  });
  document = wrapChild(document, "b1", wrapper);
  const placed = findChild(document, "s1");
  assert(placed !== undefined && placed.child.kind === "component");
  assertEquals(placed.location, {
    parent: "node",
    nodeId: "c1",
    prop: "children",
  });
  const wrapped = placed.child.props.children;
  assert(wrapped !== undefined && wrapped.kind === "slot");
  assertEquals(wrapped.children.map((child) => child.id), ["b1"]);
  assertEquals(placed.child.props.gap, { kind: "number", value: 4 });
  assertEquals(ancestorsOf(document, "b1").map((a) => a.id), ["c1", "s1"]);
  assert(findChild(document, "seed") === undefined);

  // A wrapper whose id already exists in the tree is refused.
  assertEquals(
    wrapChild(document, "b1", node("c1", "stack")),
    document,
  );
  assertEquals(wrapChild(document, "missing", node("x1", "stack")), document);
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
    sharedVariants: [{ typeName: "SpaceStep", values: ["0", "1", "2"] }],
    objectTypes: new Map([[
      "HeroRow",
      {
        typeName: "HeroRow",
        props: [
          { name: "label", type: "ReactNode", required: true },
          { name: "width", type: "number", required: false },
          { name: "surface", type: "HeroBlockSurface", required: false },
          { name: "onPick", type: "() => void", required: false },
        ],
      },
    ]]),
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
  const gap = byName.get("gap");
  assert(gap?.control === "select");
  assertEquals(gap.options, [0, 1, 2]);
  const rows = byName.get("rows");
  assert(rows?.control === "json");
  assert(rows.shape !== undefined && rows.shape.list);
  assertEquals(rows.shape.typeName, "HeroRow");
  assertEquals(
    rows.shape.members.map((member) => [member.name, member.control]),
    [["label", "text"], ["width", "number"], ["surface", "select"]],
  );
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

Deno.test("shaped JSON sources round-trip through row editing", async () => {
  const {
    editableCell,
    newShapedRow,
    parseShapedSource,
    serializeShapedRows,
    withRowValue,
  } = await import("../styleguide/builder/object-editor.ts");
  const shape = {
    list: true,
    typeName: "SelectOption",
    members: [
      {
        name: "value",
        label: "Value",
        required: true,
        typeText: "string",
        control: "text",
      },
      {
        name: "label",
        label: "Label",
        required: true,
        typeText: "string",
        control: "text",
      },
      {
        name: "disabled",
        label: "Disabled",
        required: false,
        typeText: "boolean",
        control: "toggle",
      },
    ],
  } as const;

  assertEquals(parseShapedSource("", shape), []);
  assertEquals(
    parseShapedSource('[{"value":"a","label":"A"}]', shape),
    [{ value: "a", label: "A" }],
  );
  assertEquals(parseShapedSource("{oops", shape), undefined);
  assertEquals(parseShapedSource('{"value":"a"}', shape), undefined);
  assertEquals(parseShapedSource("[1, 2]", shape), undefined);

  const rows = [...(parseShapedSource("[]", shape) ?? []), newShapedRow(shape)];
  assertEquals(rows, [{ value: "", label: "" }]);
  const edited = withRowValue(
    withRowValue(rows, 0, "value", "gb"),
    0,
    "label",
    "United Kingdom",
  );
  assertEquals(
    JSON.parse(serializeShapedRows(edited, shape)),
    [{ value: "gb", label: "United Kingdom" }],
  );
  const cleared = withRowValue(edited, 0, "disabled", undefined);
  assert(!("disabled" in (cleared[0] ?? {})));

  const row = edited[0];
  assert(row !== undefined);
  assert(editableCell(row, shape.members[0]));
  assert(editableCell({ value: 3 }, shape.members[1]));
  assert(!editableCell({ value: 3 }, shape.members[0]));
  assert(!editableCell({ value: { nested: true } }, shape.members[0]));

  // Structural members are never cell-editable, present or absent — a text
  // cell would store a string where an array or object belongs.
  const itemsMember = {
    name: "items",
    label: "Items",
    required: true,
    typeText: "readonly DocsNavItem[]",
    control: "json",
  } as const;
  assert(!editableCell({}, itemsMember));
  assert(!editableCell({ items: [] }, itemsMember));
  const seeded = newShapedRow({
    list: true,
    typeName: "DocsNavSection",
    members: [
      {
        name: "label",
        label: "Label",
        required: true,
        typeText: "string",
        control: "text",
      },
      itemsMember,
    ],
  });
  assertEquals(seeded, { label: "", items: [] });

  const single = {
    list: false,
    typeName: "FileChangeMagnitude",
    members: [{
      name: "added",
      label: "Added",
      required: false,
      typeText: "number",
      control: "number",
    }],
  } as const;
  assertEquals(parseShapedSource("", single), [{}]);
  assertEquals(parseShapedSource('{"added":3}', single), [{ added: 3 }]);
  assertEquals(
    serializeShapedRows([{ added: 4 }], single),
    '{\n  "added": 4\n}',
  );
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

Deno.test("newlines in text literals export as explicit line breaks", () => {
  const block: BuilderDocument = {
    version: 1,
    name: "Poem",
    children: [
      node("s1", "stack", {
        children: slot(text("t1", "Line one\nLine two\n\nLine four")),
      }),
    ],
  };
  const blockOutput = documentToTsx(block, naming);
  assertStringIncludes(
    blockOutput,
    "      Line one\n      <br />\n      Line two\n      <br />\n      <br />\n      Line four",
  );

  const named: BuilderDocument = {
    version: 1,
    name: "Card",
    children: [
      node("h1", "hero-block", {
        title: slot(text("t1", "First\nSecond")),
      }),
    ],
  };
  const namedOutput = documentToTsx(named, naming);
  assertStringIncludes(namedOutput, "title={");
  assertStringIncludes(namedOutput, "First");
  assertStringIncludes(namedOutput, "<br />");
  assertStringIncludes(namedOutput, "Second");

  const singleLine: BuilderDocument = {
    version: 1,
    name: "Plain",
    children: [
      node("b1", "button", { children: slot(text("t1", "No breaks")) }),
    ],
  };
  assert(!documentToTsx(singleLine, naming).includes("<br />"));
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
  for (const module of ["app.tsx", "fields.tsx"]) {
    const source = await Deno.readTextFile(
      new URL(`../styleguide/builder/${module}`, import.meta.url),
    );
    for (const [index, chunk] of source.split("apply(").entries()) {
      if (index === 0) continue;
      const head = chunk.slice(0, 300);
      assert(
        !head.includes("event."),
        `an apply() updater in ${module} reads the synthetic event:\n${
          head.slice(0, 160)
        }`,
      );
    }
  }
});

Deno.test("the shaped editor keeps a stable scaffold across validity flips", async () => {
  // A structural difference between the valid and invalid states would
  // remount the raw textarea mid-keystroke, dropping focus and caret.
  const { ShapedJsonEditor, MemberCell } = await import(
    "../styleguide/builder/fields.tsx"
  );
  const shape = {
    list: true,
    typeName: "SelectOption",
    members: [
      {
        name: "value",
        label: "Value",
        required: true,
        typeText: "string",
        control: "text",
      },
      {
        name: "items",
        label: "Items",
        required: false,
        typeText: "readonly DocsNavItem[]",
        control: "json",
      },
    ],
  } as const;
  const scaffold = (markup: string): string[] => {
    const container = /<div class="discern-builder-object"/.exec(markup);
    const details = /<details[^>]*class="discern-builder-object__raw"/.exec(
      markup,
    );
    assert(container !== null && details !== null);
    return [String(container.index < details.index)];
  };
  const valid = renderToStaticMarkup(createElement(ShapedJsonEditor, {
    shape,
    source: '[{"value":"a"}]',
    onSource: () => {},
  }));
  const invalid = renderToStaticMarkup(createElement(ShapedJsonEditor, {
    shape,
    source: "{oops",
    onSource: () => {},
  }));
  assertEquals(scaffold(valid), scaffold(invalid));
  // The disclosure forces itself open while the source is invalid, so the
  // field being typed in cannot vanish behind a collapsed summary.
  assert(/<details[^>]*open/.test(invalid));
  assertStringIncludes(invalid, "Fix the JSON");

  // Structural members render as read-only cells, never as text inputs
  // that would corrupt the value with the first keystroke.
  const cell = renderToStaticMarkup(createElement(MemberCell, {
    member: shape.members[1],
    row: {},
    onValue: () => {},
  }));
  assertStringIncludes(cell, "(edit as JSON)");
  assertStringIncludes(cell, "disabled");
});

Deno.test("canvas hover styling never overrides the selection outline", async () => {
  // Hover and selection both draw outlines; an unguarded hover rule outranks
  // the selection ring, hiding it exactly while the pointer is over the node.
  const css = await Deno.readTextFile(
    new URL("../styleguide/builder/builder.css", import.meta.url),
  );
  const hoverRules = css.match(
    /\[data-discern-builder-node\][^,{]*:hover[^,{]*/g,
  ) ?? [];
  assert(hoverRules.length > 0);
  for (const rule of hoverRules) {
    assertStringIncludes(rule, ":not([data-discern-builder-selected])");
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

  // Union Props (linked/static branches) merge into the shared surface:
  // Mention exposes its real text prop and never a phantom children slot.
  const mentionControls = controlsBySlug("mention");
  assertEquals(
    mentionControls.find(({ name }) => name === "name")?.control,
    "text",
  );
  assert(!mentionControls.some(({ name }) => name === "children"));
  const buttonControls = controlsBySlug("button");
  const buttonChildren = buttonControls.find(({ name }) => name === "children");
  assert(buttonChildren?.control === "slot" && buttonChildren.required);
  const buttonSize = buttonControls.find(({ name }) => name === "size");
  assert(buttonSize?.control === "select");
  assertEquals(buttonSize.options, ["sm", "md", "lg"]);
  assert(!buttonControls.some(({ name }) => name === "disabled"));

  // Shared-module unions (layout/space.ts) resolve to selects too.
  const stackGap = controlsBySlug("stack").find(({ name }) => name === "gap");
  assert(stackGap?.control === "select");
  assert(stackGap.options.includes(0) && stackGap.options.includes(24));

  // Typed object props carry their form shape for structured editing.
  const selectOptions = controlsBySlug("select").find(({ name }) =>
    name === "options"
  );
  assert(selectOptions?.control === "json");
  assert(selectOptions.shape !== undefined && selectOptions.shape.list);
  assertEquals(
    selectOptions.shape.members.map((member) => [
      member.name,
      member.control,
    ]),
    [["value", "text"], ["label", "text"], ["disabled", "toggle"]],
  );

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
