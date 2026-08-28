import { assert, assertEquals } from "@std/assert";
import type {
  BuilderNode,
  BuilderSlotChild,
} from "../catalogue/builder/model.ts";
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
import { documentPolicy } from "../catalogue/builder/registry-core.ts";
import {
  insertionTargetFromNodePointer,
  projectBuilderSelection,
  projectLayers,
  selectionInsertionTarget,
} from "../catalogue/builder/tree/projection.ts";
import { initialHistory } from "../catalogue/builder/history.ts";
import { commitAcceptedDocument } from "../catalogue/builder/workspace/document-store.ts";
import { reconcileSelection } from "../catalogue/builder/tree/selection.ts";

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

Deno.test("accepted history and insertion projections share one executable authority", () => {
  const initial = emptyDocument("Authority check");
  const transition = commitAcceptedDocument(
    initialHistory(initial),
    (document) =>
      insertChild(
        document,
        { parent: "root" },
        0,
        node("stack-1", "stack", { children: slot(text("text-1", "Child")) }),
      ),
    documentPolicy,
  );
  assert(transition.result.changed);
  assertEquals(transition.result.error, null);
  const document = transition.history.present;
  const selection = projectBuilderSelection(document, "stack-1");
  assertEquals(selection.insertionTarget.kind, "root");
  assertEquals(selection.insertionTarget.relation, "end");
  assertEquals(selection.insertionTarget.location, { parent: "root" });
  assertEquals(projectLayers(document).map(({ child }) => child.id), [
    "stack-1",
    "text-1",
  ]);
  assertEquals(
    selectionInsertionTarget(document, "text-1").kind,
    "root",
  );
  assertEquals(
    insertionTargetFromNodePointer(document, "stack-1", 0.1)?.relation,
    "before",
  );
  assertEquals(
    insertionTargetFromNodePointer(document, "stack-1", 0.5)?.relation,
    "inside",
  );
  assertEquals(
    insertionTargetFromNodePointer(document, "stack-1", 0.9)?.relation,
    "after",
  );
  assertEquals(
    insertionTargetFromNodePointer(document, "text-1", 0.4)?.relation,
    "before",
  );
  assertEquals(
    insertionTargetFromNodePointer(document, "text-1", 0.6)?.relation,
    "after",
  );

  const refused = commitAcceptedDocument(
    transition.history,
    (current) =>
      insertChild(
        current,
        { parent: "root" },
        0,
        node("unknown-1", "not-a-component"),
      ),
    documentPolicy,
  );
  assert(!refused.result.changed);
  assert(refused.result.error !== null);
  assertEquals(refused.history, transition.history);
});

Deno.test("selection reconciliation preserves identity and chooses the nearest survivor", () => {
  const parent = node("parent", "stack", {
    children: slot(
      text("first", "First"),
      text("created", "Created"),
      text("last", "Last"),
    ),
  });
  const before = insertChild(
    emptyDocument("Selection"),
    { parent: "root" },
    0,
    parent,
  );
  const afterDelete = removeChild(before, "created");
  assertEquals(
    reconcileSelection(before, afterDelete, "created"),
    "last",
  );
  assertEquals(reconcileSelection(before, afterDelete, "first"), "first");
  assertEquals(
    reconcileSelection(before, removeChild(before, "last"), "last"),
    "created",
  );

  const onlyChild = insertChild(
    emptyDocument("Only child"),
    { parent: "root" },
    0,
    node("only-parent", "stack", {
      children: slot(text("only", "Only")),
    }),
  );
  assertEquals(
    reconcileSelection(onlyChild, removeChild(onlyChild, "only"), "only"),
    "only-parent",
  );
  assertEquals(
    reconcileSelection(
      onlyChild,
      removeChild(onlyChild, "only-parent"),
      "only-parent",
    ),
    null,
  );
  assertEquals(
    reconcileSelection(before, afterDelete, "created", "first"),
    "first",
  );

  const wrapped = wrapChild(
    before,
    "created",
    node("wrapper", "stack", { children: slot() }),
  );
  assertEquals(reconcileSelection(wrapped, before, "wrapper"), "created");
  assertEquals(reconcileSelection(before, wrapped, "created"), "created");

  const moved = moveChild(
    before,
    "created",
    { parent: "root" },
    before.children.length,
  );
  assertEquals(reconcileSelection(before, moved, "created"), "created");
});
