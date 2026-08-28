import { assert, assertEquals, assertThrows } from "@std/assert";
import type {
  BuilderDocument,
  BuilderNode,
} from "../catalogue/builder/model.ts";
import {
  duplicateChild,
  emptyDocument,
  insertChild,
  moveChild,
  nudgeChild,
  updateNodeExtra,
  updateNodeProp,
  updateTextChild,
  wrapChild,
} from "../catalogue/builder/model.ts";
import {
  preflightInsertion,
  rootInsertionFromPointer,
} from "../catalogue/builder/placement.ts";
import {
  assertBuilderDocument,
  parseBuilderDocument,
} from "../catalogue/builder/policy.ts";
import {
  documentPolicy,
  exportNaming,
  instantiateComponent,
} from "../catalogue/builder/registry-core.ts";
import { documentToTsx } from "../catalogue/builder/export.ts";
import {
  deriveBuilderCompatibilityPolicy,
  preflightBuilderStructure,
} from "../catalogue/builder/tree/compatibility.ts";

const document: BuilderDocument = {
  version: 1,
  name: "Placement",
  children: [
    { kind: "text", id: "first", text: "First" },
    {
      kind: "component",
      id: "middle",
      slug: "stack",
      props: {
        children: {
          kind: "slot",
          children: [{ kind: "text", id: "nested", text: "Nested" }],
        },
      },
    },
    { kind: "text", id: "last", text: "Last" },
  ],
};

Deno.test("placement boundaries and no-op moves preserve exact order and identity", () => {
  const root = { parent: "root" } as const;
  assert(nudgeChild(document, "first", -1) === document);
  assert(nudgeChild(document, "last", 1) === document);
  assert(moveChild(document, "middle", root, 1) === document);
  assert(moveChild(document, "middle", root, 2) === document);
  assert(
    moveChild(
      document,
      "middle",
      { parent: "node", nodeId: "middle", prop: "children" },
      0,
    ) === document,
  );
  assert(
    moveChild(
      document,
      "middle",
      { parent: "node", nodeId: "nested", prop: "children" },
      0,
    ) === document,
  );

  assertEquals(
    moveChild(document, "last", root, 0).children.map((child) => child.id),
    ["last", "first", "middle"],
  );
  assertEquals(
    moveChild(document, "first", root, 2).children.map((child) => child.id),
    ["middle", "first", "last"],
  );
  assertEquals(
    moveChild(document, "first", root, 3).children.map((child) => child.id),
    ["middle", "last", "first"],
  );
  assert(updateTextChild(document, "first", "First") === document);
  assert(updateTextChild(document, "missing", "No") === document);
  assert(updateNodeExtra(document, "middle", "") === document);
  assert(updateNodeProp(document, "middle", "missing", undefined) === document);
});

Deno.test("root insertion geometry covers empty, first, middle, and last", () => {
  const rects = [
    { top: 110, bottom: 150 },
    { top: 170, bottom: 230 },
    { top: 250, bottom: 290 },
  ];
  assertEquals(rootInsertionFromPointer(120, [], 100), {
    index: 0,
    offset: 0,
  });
  assertEquals(rootInsertionFromPointer(100, rects, 100), {
    index: 0,
    offset: 10,
  });
  assertEquals(rootInsertionFromPointer(180, rects, 100), {
    index: 1,
    offset: 60,
  });
  assertEquals(rootInsertionFromPointer(240, rects, 100), {
    index: 2,
    offset: 140,
  });
  assertEquals(rootInsertionFromPointer(400, rects, 100), {
    index: 3,
    offset: 190,
  });
});

Deno.test("typed insertion preflight reports self and descendant cycles", () => {
  const cycle = preflightInsertion(
    document,
    { kind: "existing", id: "middle" },
    {
      kind: "slot",
      relation: "inside",
      location: { parent: "node", nodeId: "middle", prop: "children" },
      index: 0,
      ownerId: "middle",
      prop: "children",
      label: "Stack · children",
    },
    documentPolicy.compatibility,
  );
  assert(!cycle.ok);
  assert(cycle.failure.reason.includes("itself or one of its descendants"));
});

function withId(node: BuilderNode, id: string): BuilderNode {
  return { ...node, id };
}

function invalidInteractiveDocument(): BuilderDocument {
  const outer = withId(instantiateComponent("button"), "outer-button");
  const inner = withId(instantiateComponent("button"), "inner-button");
  let candidate = insertChild(
    emptyDocument("Invalid nesting"),
    { parent: "root" },
    0,
    outer,
  );
  candidate = insertChild(
    candidate,
    { parent: "node", nodeId: outer.id, prop: "children" },
    1,
    inner,
  );
  return candidate;
}

function assertStructureRefused(
  candidate: BuilderDocument,
  message: string,
): void {
  assertThrows(
    () => assertBuilderDocument(candidate, documentPolicy),
    Error,
    message,
  );
}

Deno.test("one accepted-document boundary refuses invalid rendered structure across mutation routes", () => {
  const nestedButtons = invalidInteractiveDocument();
  assertStructureRefused(
    nestedButtons,
    "interactive controls cannot contain interactive controls",
  );

  const table = withId(instantiateComponent("table"), "table-1");
  let invalidTable = insertChild(
    emptyDocument("Invalid table"),
    { parent: "root" },
    0,
    table,
  );
  invalidTable = insertChild(
    invalidTable,
    { parent: "node", nodeId: table.id, prop: "children" },
    1,
    withId(instantiateComponent("button"), "table-button"),
  );
  assertStructureRefused(invalidTable, "native table content");

  const incompleteTooltipNode = withId(
    instantiateComponent("tooltip"),
    "tooltip-1",
  );
  const incompleteTooltip = insertChild(
    emptyDocument("Incomplete element slot"),
    { parent: "root" },
    0,
    {
      ...incompleteTooltipNode,
      props: {
        ...incompleteTooltipNode.props,
        children: { kind: "slot", children: [] },
      },
    },
  );
  assertStructureRefused(
    incompleteTooltip,
    "requires exactly one component",
  );

  const outer = withId(instantiateComponent("button"), "move-target");
  const stack = withId(instantiateComponent("stack"), "move-source");
  const moving = withId(instantiateComponent("button"), "moving-button");
  let moveSource = insertChild(
    emptyDocument("Move invalidity"),
    { parent: "root" },
    0,
    outer,
  );
  moveSource = insertChild(moveSource, { parent: "root" }, 1, stack);
  moveSource = insertChild(
    moveSource,
    { parent: "node", nodeId: stack.id, prop: "children" },
    1,
    moving,
  );
  assertStructureRefused(
    moveChild(
      moveSource,
      moving.id,
      { parent: "node", nodeId: outer.id, prop: "children" },
      1,
    ),
    "interactive controls cannot contain interactive controls",
  );

  const wrapped = wrapChild(
    insertChild(
      emptyDocument("Wrap invalidity"),
      { parent: "root" },
      0,
      withId(instantiateComponent("button"), "wrapped-button"),
    ),
    "wrapped-button",
    withId(instantiateComponent("button"), "wrapper-button"),
  );
  assertStructureRefused(
    wrapped,
    "interactive controls cannot contain interactive controls",
  );

  const triggerBase = withId(
    instantiateComponent("tooltip"),
    "trigger-owner",
  );
  const trigger: BuilderNode = {
    ...triggerBase,
    props: {
      ...triggerBase.props,
      children: { kind: "slot", children: [] },
    },
  };
  const triggerButton = withId(
    instantiateComponent("button"),
    "trigger-button",
  );
  let validTrigger = insertChild(
    emptyDocument("Duplicate invalidity"),
    { parent: "root" },
    0,
    trigger,
  );
  validTrigger = insertChild(
    validTrigger,
    { parent: "node", nodeId: trigger.id, prop: "children" },
    0,
    triggerButton,
  );
  assertStructureRefused(
    duplicateChild(validTrigger, triggerButton.id),
    "requires exactly one component",
  );

  const serialized = JSON.stringify(nestedButtons);
  assertThrows(
    () => parseBuilderDocument(serialized, documentPolicy),
    Error,
    "interactive controls cannot contain interactive controls",
  );
  assertThrows(
    () => documentToTsx(nestedButtons, exportNaming),
    Error,
    "interactive controls cannot contain interactive controls",
  );
});

Deno.test("valid layout, Hero slots, text, and interactive siblings remain composable", () => {
  const stack = withId(instantiateComponent("stack"), "valid-stack");
  const nativeButton = withId(
    instantiateComponent("button"),
    "native-button",
  );
  const linkedButton = withId(
    updateNodeProp(
      insertChild(
        emptyDocument("Linked posture"),
        { parent: "root" },
        0,
        withId(instantiateComponent("button"), "linked-button"),
      ),
      "linked-button",
      "href",
      { kind: "string", value: "/next" },
    ).children[0] as BuilderNode,
    "linked-button",
  );
  const hero = withId(instantiateComponent("hero-block"), "valid-hero");
  let valid = insertChild(
    emptyDocument("Valid composition"),
    { parent: "root" },
    0,
    stack,
  );
  valid = insertChild(
    valid,
    { parent: "node", nodeId: stack.id, prop: "children" },
    1,
    nativeButton,
  );
  valid = insertChild(
    valid,
    { parent: "node", nodeId: stack.id, prop: "children" },
    2,
    linkedButton,
  );
  valid = insertChild(valid, { parent: "root" }, 1, hero);
  valid = insertChild(
    valid,
    { parent: "node", nodeId: hero.id, prop: "actions" },
    0,
    withId(instantiateComponent("button"), "hero-action"),
  );
  valid = insertChild(
    valid,
    { parent: "node", nodeId: hero.id, prop: "visual" },
    0,
    withId(instantiateComponent("container"), "hero-visual"),
  );
  for (
    const slug of [
      "cluster",
      "section",
      "container",
      "list",
      "table",
      "tabs",
    ]
  ) {
    valid = insertChild(
      valid,
      { parent: "root" },
      valid.children.length,
      withId(instantiateComponent(slug), `valid-${slug}`),
    );
  }
  assertBuilderDocument(valid, documentPolicy);
});

Deno.test("synthetic future Components enroll through derived and declarative compatibility facts", () => {
  const slotControl = {
    name: "children",
    label: "Children",
    required: true,
    typeText: "ReactNode",
    control: "slot",
    elementOnly: false,
  } as const;
  const elementControl = {
    ...slotControl,
    typeText: "ReactElement",
    elementOnly: true,
  } as const;
  const compatibility = deriveBuilderCompatibilityPolicy([
    {
      slug: "future-control",
      name: "Future control",
      inheritedTypes: ["ButtonHTMLAttributes"],
      propNames: new Set(["children"]),
      controls: [slotControl],
    },
    {
      slug: "future-clone",
      name: "Future clone",
      inheritedTypes: [],
      propNames: new Set(["children"]),
      controls: [elementControl],
      override: { rootContent: "flow", interactive: "never" },
    },
  ]);
  const nestedFuture: BuilderDocument = {
    version: 1,
    name: "Future enrollment",
    children: [{
      kind: "component",
      id: "future-outer",
      slug: "future-control",
      props: {
        children: {
          kind: "slot",
          children: [{
            kind: "component",
            id: "future-inner",
            slug: "future-control",
            props: {
              children: {
                kind: "slot",
                children: [{ kind: "text", id: "future-text", text: "Go" }],
              },
            },
          }],
        },
      },
    }],
  };
  const nesting = preflightBuilderStructure(nestedFuture, compatibility);
  assert(!nesting.ok);
  assert(
    nesting.failure.reason.includes(
      "interactive controls cannot contain interactive controls",
    ),
  );

  const emptyClone: BuilderDocument = {
    version: 1,
    name: "Future clone",
    children: [{
      kind: "component",
      id: "future-clone",
      slug: "future-clone",
      props: { children: { kind: "slot", children: [] } },
    }],
  };
  const clone = preflightBuilderStructure(emptyClone, compatibility);
  assert(!clone.ok);
  assert(clone.failure.reason.includes("requires exactly one component"));
});
