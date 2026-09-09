import { assertEquals } from "@std/assert";
import { renderSelectCli, type SelectFrameState } from "../../src/cli/mod.ts";
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

Deno.test("described Select fitting does not repeat equivalent form and menu layouts", () => {
  const entries = Array.from(
    { length: 20 },
    (_, i) => ({
      id: String(i),
      label: `Sample choice ${i} with a moderately long label`,
      description:
        "Supporting detail stays near the focused control and wraps at narrow widths.",
    }),
  );
  for (
    const [presentation, columns, viewportRows, expected] of [[
      "form",
      80,
      26,
      4,
    ], ["menu", 40, 13, 9]] as const
  ) {
    const layouts: string[] = [];
    const fitted = fitInteractionFrame<SelectFrameState>({
      viewportRows,
      frame: (v) => ({
        kind: "select",
        label: "Choose",
        lifecycle: { status: "active" },
        options: entries,
        highlightedIndex: 0,
        visibleStart: 0,
        visibleCount: v.controlRows(10),
        ...(presentation === "menu"
          ? { presentation: "menu", menuDetailLineLimit: v.controlRows(3) }
          : {}),
      }),
      render: (state) => {
        const frame = renderSelectCli(state, {
          columns,
          colorDepth: "none",
          unicode: true,
        });
        layouts.push(frame);
        return frame;
      },
    });
    assertEquals(layouts.length, expected);
    assertEquals(new Set(layouts).size, layouts.length);
    assertEquals(fitted.rendered, layouts.at(-1));
  }
});
