import { assert, assertEquals } from "@std/assert";
import type { BuilderDocument } from "../catalogue/builder/model.ts";
import {
  moveChild,
  nudgeChild,
  updateNodeExtra,
  updateNodeProp,
  updateTextChild,
} from "../catalogue/builder/model.ts";
import { rootInsertionFromPointer } from "../catalogue/builder/placement.ts";

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
