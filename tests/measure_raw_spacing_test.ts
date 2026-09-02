import { assertEquals } from "@std/assert";
import { cssDeclarations } from "../discern/scripts/component-css-metrics.ts";
import { rawSpacingHits } from "../discern/scripts/measure-raw-spacing.ts";

Deno.test("raw spacing counts planted literals and ignores tokens, zero, and hairlines", () => {
  const hits = rawSpacingHits(cssDeclarations(
    `
    .discern-future {
      padding: 12px var(--discern-space-4);
      inset-inline-start: calc(1rem + var(--discern-space-1));
      margin-block: 0rem;
      gap: var(--discern-space-3);
      border: 1px solid var(--discern-color-border);
      inline-size: 42px;
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
      { file: "future.css", line: 3, property: "padding" },
      { file: "future.css", line: 4, property: "inset-inline-start" },
    ],
  );
});
