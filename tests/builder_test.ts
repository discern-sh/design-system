import {
  assert,
  assertEquals,
  assertStringIncludes,
  assertThrows,
} from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { dirname, fromFileUrl, join } from "@std/path";
import { buildDesignSystem } from "../scripts/build.ts";
import { packageManifest } from "../src/manifest.ts";
import { compositionCost } from "../catalogue/builder/cost.ts";
import type { ControlSource } from "../catalogue/builder/controls.ts";
import {
  createNode,
  defaultProps,
  deriveControls,
} from "../catalogue/builder/controls.ts";
import {
  BuilderDocumentError,
  documentSelectionSnippet,
  documentToTsx,
  type ExportNaming,
  parseDocument,
  serializeDocument,
} from "../catalogue/builder/export.ts";
import type {
  BuilderDocument,
  BuilderNode,
  BuilderSlotChild,
} from "../catalogue/builder/model.ts";
import { BUILDER_DOCUMENT_LIMITS } from "../catalogue/builder/policy.ts";
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
} from "../catalogue/builder/model.ts";

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

const testPropsBySlug = new Map([
  ["badge", new Set(["tone", "children"])],
  ["button", new Set(["variant", "children", "rows"])],
  [
    "hero-block",
    new Set([
      "title",
      "headingLevel",
      "raised",
      "plain",
      "rows",
      "actions",
    ]),
  ],
  ["stack", new Set(["gap", "wide", "count", "rows", "value", "children"])],
]);
const naming: ExportNaming = {
  knownSlugs: new Set(["badge", "button", "hero-block", "stack"]),
  modeledPropsBySlug: testPropsBySlug,
  reservedPropsBySlug: testPropsBySlug,
  slugToExport: new Map([
    ["badge", "Badge"],
    ["button", "Button"],
    ["hero-block", "HeroBlock"],
    ["stack", "Stack"],
  ]),
  requiredFunctionPropsBySlug: new Map(),
};

const PACKAGE_ROOT = dirname(dirname(fromFileUrl(import.meta.url)));
const decoder = new TextDecoder();

async function runDeno(
  args: readonly string[],
  cwd = PACKAGE_ROOT,
): Promise<void> {
  const result = await new Deno.Command(Deno.execPath(), {
    args: [...args],
    cwd,
    stdout: "piped",
    stderr: "piped",
  }).output();
  assert(
    result.success,
    `${args.join(" ")} failed:\n${decoder.decode(result.stdout)}${
      decoder.decode(result.stderr)
    }`,
  );
}

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
  } = await import("../catalogue/builder/object-editor.ts");
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
    documentSelectionSnippet(document, naming),
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
    ".props.rows.source",
  );
});

Deno.test("TSX export survives hostile names and lone text roots", () => {
  const emptyName: BuilderDocument = { version: 1, name: "", children: [] };
  assertEquals(
    parseDocument(serializeDocument(emptyName, naming), naming),
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
  const policy = naming;
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
    parseDocument(serializeDocument(document, policy), policy),
    document,
  );

  assertThrows(
    () => parseDocument("not json", policy),
    BuilderDocumentError,
    "must contain valid JSON",
  );
  assertThrows(
    () => parseDocument('{"version":2,"name":"x","children":[]}', policy),
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
        policy,
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
        policy,
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
        policy,
      ),
    BuilderDocumentError,
    "JSX-safe",
  );
});

Deno.test("document acceptance rejects React escape hatches and preserves safe additional props", () => {
  const modeledPropsBySlug = new Map([
    ["card", new Set(["children", "rows", "raised"])],
  ]);
  const policy = {
    knownSlugs: new Set(["card"]),
    modeledPropsBySlug,
    reservedPropsBySlug: new Map([
      [
        "card",
        new Set([
          ...modeledPropsBySlug.get("card") ?? [],
          "canonicalCallback",
        ]),
      ],
    ]),
  };
  const unsafe = [
    {
      extra:
        '{"children":null,"dangerouslySetInnerHTML":{"__html":"<b>owned</b>"}}',
      message: "dangerouslySetInnerHTML",
    },
    { extra: '{"onFutureAction":"owned"}', message: "onFutureAction" },
    { extra: '{"ref":"owned"}', message: "ref" },
    { extra: '{"key":"owned"}', message: "key" },
    { extra: '{"srcDoc":"<b>owned</b>"}', message: "srcDoc" },
    { extra: '{"__proto__":{"owned":true}}', message: "__proto__" },
    { extra: '{"href":" javascript:alert(1)"}', message: "executable href" },
    { extra: "[]", message: "object" },
    { extra: '{"children":"override"}', message: "children" },
    {
      extra: '{"canonicalCallback":"override"}',
      message: "cannot override modeled prop",
    },
  ] as const;
  for (const [index, example] of unsafe.entries()) {
    const document: BuilderDocument = {
      version: 1,
      name: "Untrusted",
      children: [{
        ...node(`card-${index}`, "card", {
          children: slot(text(`text-${index}`, "Safe")),
        }),
        extra: example.extra,
      }],
    };
    assertThrows(
      () => parseDocument(JSON.stringify(document), policy),
      BuilderDocumentError,
      example.message,
    );
  }

  const modeledEscape: BuilderDocument = {
    version: 1,
    name: "Modeled escape",
    children: [node("card", "card", {
      dangerouslySetInnerHTML: {
        kind: "json",
        source: '{"__html":"<b>owned</b>"}',
      },
    })],
  };
  assertThrows(
    () => parseDocument(JSON.stringify(modeledEscape), policy),
    BuilderDocumentError,
    "dangerouslySetInnerHTML",
  );

  const modeledCollision: BuilderDocument = {
    version: 1,
    name: "Modeled collision",
    children: [{
      ...node("card", "card"),
      extra: '{"raised":true}',
    }],
  };
  assertThrows(
    () => parseDocument(JSON.stringify(modeledCollision), policy),
    BuilderDocumentError,
    "cannot override modeled prop",
  );

  const nestedPrototype: BuilderDocument = {
    version: 1,
    name: "Nested",
    children: [node("card", "card", {
      rows: {
        kind: "json",
        source: '{"future":{"constructor":{"prototype":{"owned":true}}}}',
      },
    })],
  };
  assertThrows(
    () => parseDocument(JSON.stringify(nestedPrototype), policy),
    BuilderDocumentError,
    "constructor",
  );

  const nestedHandler: BuilderDocument = {
    version: 1,
    name: "Nested handler",
    children: [node("card", "card", {
      rows: {
        kind: "json",
        source: '{"widgetOptions":{"onFutureAction":"owned"}}',
      },
    })],
  };
  assertThrows(
    () => parseDocument(JSON.stringify(nestedHandler), policy),
    BuilderDocumentError,
    "onFutureAction",
  );

  const safe: BuilderDocument = {
    version: 1,
    name: "Safe",
    children: [{
      ...node("card", "card"),
      extra: JSON.stringify({
        "aria-label": "Safe card",
        "data-test-id": "card",
        className: "consumer-card",
        style: { opacity: 0.8 },
        title: "Ordinary prop",
      }),
    }],
  };
  assertEquals(parseDocument(serializeDocument(safe, policy), policy), safe);
});

Deno.test("document acceptance bounds every recursive and retained resource", () => {
  const propsBySlug = new Map([
    ["stack", new Set(["children", "value"])],
  ]);
  const policy = {
    knownSlugs: new Set(["stack"]),
    modeledPropsBySlug: propsBySlug,
    reservedPropsBySlug: propsBySlug,
  };
  const parse = (
    document: BuilderDocument,
    selectedPolicy = policy,
  ): BuilderDocument => parseDocument(JSON.stringify(document), selectedPolicy);
  const expectBoundary = (
    boundary: BuilderDocument,
    next: BuilderDocument,
    message: string,
    selectedPolicy = policy,
  ): void => {
    assertEquals(parse(boundary, selectedPolicy), boundary);
    assertThrows(
      () => parse(next, selectedPolicy),
      BuilderDocumentError,
      message,
    );
  };

  expectBoundary(
    emptyDocument("n".repeat(BUILDER_DOCUMENT_LIMITS.nameBytes)),
    emptyDocument("n".repeat(BUILDER_DOCUMENT_LIMITS.nameBytes + 1)),
    "document.name",
  );
  expectBoundary(
    {
      version: 1,
      name: "Text",
      children: [
        text("text", "x".repeat(BUILDER_DOCUMENT_LIMITS.textBytes)),
      ],
    },
    {
      version: 1,
      name: "Text",
      children: [
        text("text", "x".repeat(BUILDER_DOCUMENT_LIMITS.textBytes + 1)),
      ],
    },
    ".text",
  );
  expectBoundary(
    {
      version: 1,
      name: "Identifier",
      children: [text(
        "i".repeat(BUILDER_DOCUMENT_LIMITS.identifierBytes),
        "x",
      )],
    },
    {
      version: 1,
      name: "Identifier",
      children: [text(
        "i".repeat(BUILDER_DOCUMENT_LIMITS.identifierBytes + 1),
        "x",
      )],
    },
    ".id",
  );

  const childrenDocument = (count: number): BuilderDocument => ({
    version: 1,
    name: "Slot",
    children: Array.from(
      { length: count },
      (_, index) => text(`text-${index}`, "x"),
    ),
  });
  expectBoundary(
    childrenDocument(BUILDER_DOCUMENT_LIMITS.childrenPerSlot),
    childrenDocument(BUILDER_DOCUMENT_LIMITS.childrenPerSlot + 1),
    "document.children",
  );

  const depthDocument = (depth: number): BuilderDocument => {
    let nested: BuilderSlotChild = text("leaf", "x");
    for (let layer = 1; layer < depth; layer += 1) {
      nested = node(`depth-${layer}`, "stack", { children: slot(nested) });
    }
    return { version: 1, name: "Depth", children: [nested] };
  };
  expectBoundary(
    depthDocument(BUILDER_DOCUMENT_LIMITS.treeDepth),
    depthDocument(BUILDER_DOCUMENT_LIMITS.treeDepth + 1),
    "tree depth",
  );

  const fullRoots = Array.from(
    { length: 5 },
    (_, rootIndex) =>
      node(`root-${rootIndex}`, "stack", {
        children: slot(...Array.from(
          { length: 99 },
          (_, childIndex) => text(`text-${rootIndex}-${childIndex}`, "x"),
        )),
      }),
  );
  const exactNodes: BuilderDocument = {
    version: 1,
    name: "Nodes",
    children: fullRoots,
  };
  const tooManyNodes: BuilderDocument = {
    ...exactNodes,
    children: [...fullRoots, node("one-too-many", "stack")],
  };
  expectBoundary(exactNodes, tooManyNodes, "total nodes");

  const scalarDocument = (
    value: BuilderNode["props"][string],
  ): BuilderDocument => ({
    version: 1,
    name: "Value",
    children: [node("stack", "stack", { value })],
  });
  expectBoundary(
    scalarDocument({
      kind: "string",
      value: "x".repeat(BUILDER_DOCUMENT_LIMITS.stringBytes),
    }),
    scalarDocument({
      kind: "string",
      value: "x".repeat(BUILDER_DOCUMENT_LIMITS.stringBytes + 1),
    }),
    ".value",
  );

  const rawSource = (bytes: number): string => `"${"x".repeat(bytes - 2)}"`;
  expectBoundary(
    scalarDocument({
      kind: "json",
      source: rawSource(BUILDER_DOCUMENT_LIMITS.jsonSourceBytes),
    }),
    scalarDocument({
      kind: "json",
      source: rawSource(BUILDER_DOCUMENT_LIMITS.jsonSourceBytes + 1),
    }),
    ".source",
  );

  const nestedJson = (depth: number): string => {
    let value: unknown = "x";
    for (let layer = 0; layer < depth; layer += 1) value = [value];
    return JSON.stringify(value);
  };
  expectBoundary(
    scalarDocument({
      kind: "json",
      source: nestedJson(BUILDER_DOCUMENT_LIMITS.jsonDepth),
    }),
    scalarDocument({
      kind: "json",
      source: nestedJson(BUILDER_DOCUMENT_LIMITS.jsonDepth + 1),
    }),
    "JSON depth",
  );

  const jsonValues = (count: number): string =>
    JSON.stringify(Array.from({ length: count - 1 }, () => 0));
  expectBoundary(
    scalarDocument({
      kind: "json",
      source: jsonValues(BUILDER_DOCUMENT_LIMITS.jsonValues),
    }),
    scalarDocument({
      kind: "json",
      source: jsonValues(BUILDER_DOCUMENT_LIMITS.jsonValues + 1),
    }),
    "JSON values",
  );

  const jsonObject = (count: number): string =>
    JSON.stringify(Object.fromEntries(
      Array.from({ length: count }, (_, index) => [`key${index}`, index]),
    ));
  expectBoundary(
    scalarDocument({
      kind: "json",
      source: jsonObject(BUILDER_DOCUMENT_LIMITS.jsonKeysPerObject),
    }),
    scalarDocument({
      kind: "json",
      source: jsonObject(BUILDER_DOCUMENT_LIMITS.jsonKeysPerObject + 1),
    }),
    "JSON keys",
  );
  expectBoundary(
    scalarDocument({
      kind: "json",
      source: JSON.stringify({
        ["k".repeat(BUILDER_DOCUMENT_LIMITS.jsonKeyBytes)]: true,
      }),
    }),
    scalarDocument({
      kind: "json",
      source: JSON.stringify({
        ["k".repeat(BUILDER_DOCUMENT_LIMITS.jsonKeyBytes + 1)]: true,
      }),
    }),
    "bytes",
  );

  const propNames = Array.from(
    { length: BUILDER_DOCUMENT_LIMITS.propsPerNode + 1 },
    (_, index) => `prop${index}`,
  );
  const boundedPropsBySlug = new Map([[
    "stack",
    new Set(propNames),
  ]]);
  const propsPolicy = {
    knownSlugs: new Set(["stack"]),
    modeledPropsBySlug: boundedPropsBySlug,
    reservedPropsBySlug: boundedPropsBySlug,
  };
  const propsDocument = (count: number): BuilderDocument => ({
    version: 1,
    name: "Props",
    children: [node(
      "stack",
      "stack",
      Object.fromEntries(
        propNames.slice(0, count).map((name) => [
          name,
          { kind: "boolean", value: true },
        ]),
      ),
    )],
  });
  expectBoundary(
    propsDocument(BUILDER_DOCUMENT_LIMITS.propsPerNode),
    propsDocument(BUILDER_DOCUMENT_LIMITS.propsPerNode + 1),
    "props",
    propsPolicy,
  );

  const compact = JSON.stringify(emptyDocument("Bytes"));
  const exactInput = compact.padEnd(BUILDER_DOCUMENT_LIMITS.inputBytes, " ");
  assertEquals(parseDocument(exactInput, policy), emptyDocument("Bytes"));
  assertThrows(
    () => parseDocument(`${exactInput} `, policy),
    BuilderDocumentError,
    "input bytes",
  );
});

Deno.test("exported component identifiers never collide with imported Components", () => {
  for (const name of ["Button", "", "123", "☃", "!!!", "按钮"]) {
    const document: BuilderDocument = {
      version: 1,
      name,
      children: [node("button", "button", {
        children: slot(text("label", "Go")),
      })],
    };
    const output = documentToTsx(document, naming);
    assertEquals(documentToTsx(document, naming), output);
    assertStringIncludes(output, "import { Button }");
    assert(!output.includes("export function Button()"));
    assert(/export function [A-Za-z_$][A-Za-z0-9_$]*\(\)/.test(output));
  }
});

Deno.test("required callbacks have explicit deterministic consumer wiring", () => {
  const callbackNaming: ExportNaming = {
    knownSlugs: new Set(["theme-switcher"]),
    modeledPropsBySlug: new Map([
      ["theme-switcher", new Set(["mode"])],
    ]),
    reservedPropsBySlug: new Map([
      ["theme-switcher", new Set(["mode", "onModeChange"])],
    ]),
    slugToExport: new Map([["theme-switcher", "ThemeSwitcher"]]),
    requiredFunctionPropsBySlug: new Map([
      ["theme-switcher", [{ name: "onModeChange" }]],
    ]),
  };
  const document: BuilderDocument = {
    version: 1,
    name: "ComponentProps",
    children: [
      node("first", "theme-switcher"),
      node("second", "theme-switcher"),
    ],
  };
  const output = documentToTsx(document, callbackNaming);
  assertStringIncludes(output, 'import type { ComponentProps } from "react";');
  assertStringIncludes(
    output,
    "export function ComponentPropsComposition(",
  );
  assertStringIncludes(
    output,
    "export interface ComponentPropsCompositionCallbacks",
  );
  assertStringIncludes(
    output,
    'ComponentProps<typeof ThemeSwitcher>["onModeChange"]',
  );
  assertStringIncludes(
    output,
    "onModeChange={callbacks.themeSwitcherOnModeChange}",
  );
  assertStringIncludes(
    output,
    "onModeChange={callbacks.themeSwitcherOnModeChange2}",
  );
  assert(!output.includes("=> {}"));
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
      new URL(`../catalogue/builder/${module}`, import.meta.url),
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
    "../catalogue/builder/fields.tsx"
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
    label: "Options",
    onSource: () => {},
  }));
  const invalid = renderToStaticMarkup(createElement(ShapedJsonEditor, {
    shape,
    source: "{oops",
    label: "Options",
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
    new URL("../catalogue/builder/builder.css", import.meta.url),
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

Deno.test("every catalogue component yields controls, a default instance, and exportable TSX", async () => {
  const { registryIndex } = await builderModules();
  const generatedRegistry = await import("../catalogue/generated/registry.ts");
  const {
    componentBySlug,
    componentEntries,
    controlsBySlug,
    exportNaming,
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
  assertEquals(layout.options, ["split", "centered", "showcase"]);

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

  const variants = [
    ...componentEntries.flatMap((entry) => entry.variants),
    ...generatedRegistry.sharedModuleVariants,
  ].reduce(
    (byName, variant) =>
      byName.has(variant.typeName)
        ? byName
        : byName.set(variant.typeName, variant),
    new Map<string, (typeof generatedRegistry.sharedModuleVariants)[number]>(),
  );
  const objectTypes = [
    ...componentEntries.flatMap((entry) => entry.objectTypes),
    ...generatedRegistry.sharedModuleObjectTypes,
  ].reduce(
    (byName, objectType) =>
      byName.has(objectType.typeName)
        ? byName
        : byName.set(objectType.typeName, objectType),
    new Map<
      string,
      (typeof generatedRegistry.sharedModuleObjectTypes)[number]
    >(),
  );

  const tableDefault = registryIndex.instantiateComponent("table");
  const tableChildren = tableDefault.props.children;
  assert(
    tableChildren?.kind === "slot" &&
      tableChildren.children[0]?.kind === "text" &&
      tableChildren.children[0].text === "",
    "Table defaults must not put an invalid text node inside <table>",
  );

  for (const entry of componentEntries) {
    const slug = entry.meta.slug;
    const controls = controlsBySlug(slug);
    const sourcePropNames = entry.propDocumentation.status === "available"
      ? entry.propDocumentation.props.map((prop) => prop.name)
      : [];
    assertEquals(
      registryIndex.reservedPropsBySlug.get(slug),
      new Set([
        ...controls.map((control) => control.name),
        ...sourcePropNames,
      ]),
      `${slug} additional-prop reservations drifted from source types`,
    );

    if (entry.propDocumentation.status === "available") {
      const controlNames = new Set(controls.map((control) => control.name));
      const expectedCallbacks = entry.propDocumentation.props.flatMap((prop) =>
        prop.required && !controlNames.has(prop.name)
          ? [{ name: prop.name }]
          : []
      );
      assertEquals(
        registryIndex.requiredFunctionPropsBySlug.get(slug),
        expectedCallbacks,
        `${slug} required callback contract drifted from source types`,
      );
      for (const prop of entry.propDocumentation.props) {
        const control = controls.find(({ name }) => name === prop.name);
        if (prop.required && !controlNames.has(prop.name)) {
          assert(
            prop.type.includes("=>") || /^on[A-Z]/.test(prop.name),
            `${slug} required non-function prop "${prop.name}" was omitted from controls`,
          );
        }
        if (prop.required && !prop.type.includes("=>")) {
          assert(
            controlNames.has(prop.name),
            `${slug} required prop "${prop.name}" has no inspector control`,
          );
        }
        const variant = variants.get(prop.type);
        if (variant !== undefined) {
          assert(control?.control === "select");
          assertEquals(
            control.options,
            variant.values.map((value) =>
              /^-?\d+(?:\.\d+)?$/.test(value) ? Number(value) : value
            ),
          );
        }
        const objectMatch = /^(?:readonly\s+)?([A-Za-z_$][A-Za-z0-9_$]*)\[\]$/
          .exec(prop.type);
        const objectName = objectMatch?.[1] ?? prop.type;
        if (objectTypes.has(objectName)) {
          assert(control?.control === "json");
          assertEquals(control.shape?.typeName, objectName);
        }
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
      parseDocument(
        serializeDocument(document, registryIndex.documentPolicy),
        registryIndex.documentPolicy,
      ),
      document,
    );
    assert(compositionCost([slug]).resolved.includes(slug));
  }
});

Deno.test("every Component class exports formatted, type-correct consumer TSX", async () => {
  const { registryIndex } = await builderModules();
  const chunks: (typeof registryIndex.componentEntries)[] = [];
  for (
    let index = 0;
    index < registryIndex.componentEntries.length;
    index += 70
  ) {
    chunks.push(registryIndex.componentEntries.slice(index, index + 70));
  }
  assertEquals(
    chunks.flat().map((entry) => entry.meta.slug),
    registryIndex.componentEntries.map((entry) => entry.meta.slug),
  );

  const temporary = await Deno.makeTempDir({
    dir: join(PACKAGE_ROOT, "catalogue", "builder"),
    prefix: "builder-export-",
  });
  try {
    for (const [chunkIndex, entries] of chunks.entries()) {
      const children = entries.map((entry) => {
        const instance = registryIndex.instantiateComponent(entry.meta.slug);
        const props = { ...instance.props };
        for (const control of registryIndex.controlsBySlug(entry.meta.slug)) {
          if (
            control.required && control.control === "slot" &&
            control.elementOnly
          ) {
            props[control.name] = {
              kind: "slot",
              children: [registryIndex.instantiateComponent("button")],
            };
          }
        }
        return { ...instance, props };
      });
      const firstExport = entries[0]?.reactExport ?? "Composition";
      const document: BuilderDocument = {
        version: 1,
        name: chunkIndex === 0 ? firstExport : "123 ☃ */ punctuation",
        children,
      };
      const source = documentToTsx(document, registryIndex.exportNaming);
      const file = join(temporary, `composition-${chunkIndex}.tsx`);
      await Deno.writeTextFile(file, source);
      await runDeno([
        "fmt",
        "--config",
        join(PACKAGE_ROOT, "deno.json"),
        file,
      ]);
      await runDeno([
        "check",
        "--config",
        join(PACKAGE_ROOT, "deno.json"),
        file,
      ]);
      const formatted = await Deno.readTextFile(file);
      assert(formatted.endsWith("\n"));
      assertStringIncludes(
        formatted,
        "composed with the Discern interface builder",
      );
    }
  } finally {
    await Deno.remove(temporary, { recursive: true });
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
