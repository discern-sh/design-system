import { assertEquals } from "@std/assert";
import { cssDeclarations } from "../discern/scripts/component-css-metrics.ts";
import { untokenisedStructureHits } from "../discern/scripts/measure-untokenised-structure.ts";

Deno.test("untokenised structure counts planted ink and ignores role-driven edges", () => {
  const hits = untokenisedStructureHits(cssDeclarations(
    `
    .discern-future {
      border: 1px solid #ddd;
      outline-color: currentColor;
      box-shadow: 0 2px 4px rgb(0 0 0 / 20%);
      border-block-start: 1px solid var(--discern-color-border);
      border-block-end: 0 !important;
      border-width: 1px;
      outline: none;
      box-shadow: var(--discern-shadow-card);
      box-shadow: 0 2px 0 color-mix(in oklab, var(--discern-shadow-color) 20%, transparent);
    }
  `,
    "future.css",
  ));

  assertEquals(
    hits.map(({ file, line, property }) => ({
      file,
      line,
      property,
    })),
    [
      { file: "future.css", line: 3, property: "border" },
      { file: "future.css", line: 4, property: "outline-color" },
      { file: "future.css", line: 5, property: "box-shadow" },
    ],
  );
});
