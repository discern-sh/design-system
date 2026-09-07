import { assertEquals } from "@std/assert";
import { fitInteractionFrame } from "../../src/cli/interactive/viewport-budget.ts";

Deno.test("fitting renders each requested control layout once, including future controls", () => {
  const rendered: number[] = [];
  const result = fitInteractionFrame({
    viewportRows: 26,
    frame: (viewport) => ({ rows: viewport.controlRows(10) }),
    render: ({ rows }) => {
      rendered.push(rows);
      return Array(19 + rows).fill("row").join("\n");
    },
  });
  assertEquals(rendered, [10, 9, 8, 7]);
  assertEquals(result.frameRows, 26);
});

Deno.test("fitting accounts for independent variable regions without assuming monotonic height", () => {
  const rendered: string[] = [];
  const fitted = fitInteractionFrame({
    viewportRows: 20,
    frame: (v) => ({ choices: v.controlRows(2), detail: v.controlRows(3) }),
    render: (s) => {
      rendered.push(JSON.stringify(s));
      return Array(s.detail === 2 ? 20 : 21).fill("x").join("\n");
    },
  });
  assertEquals(rendered.length, 2);
  assertEquals(fitted.state, { choices: 2, detail: 2 });
});
