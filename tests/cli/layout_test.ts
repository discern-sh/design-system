import { assertEquals, assertThrows } from "@std/assert";
import {
  joinVertical,
  layoutColumns,
  wrapInlineCluster,
} from "../../src/cli/layout.ts";

Deno.test("vertical joins and inline clusters keep deterministic spacing", () => {
  assertEquals(joinVertical(["one", "", "two"], { spacing: 1 }), "one\n\ntwo");
  assertEquals(
    wrapInlineCluster(["alpha", "beta", "gamma"], { columns: 11, gap: 1 }),
    "alpha beta\ngamma",
  );
});

Deno.test("column layout wraps each column inside the total width", () => {
  assertEquals(
    layoutColumns(["alpha beta", "one two"], { columns: 20, gap: 2 }),
    "alpha      one two\nbeta",
  );
  assertThrows(
    () => layoutColumns(["a", "b"], { columns: 2, gap: 2 }),
    TypeError,
  );
});
