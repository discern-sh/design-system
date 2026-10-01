import { assertEquals } from "@std/assert";
import { measureText } from "../../src/cli/mod.ts";
import {
  type ApplicationEpilogueLine,
  releasedLines,
} from "../../src/cli/interactive/application/released-lines.ts";

const COMMAND: ApplicationEpilogueLine = [
  { text: "Ran: " },
  { text: "deploy --target production", role: "code" },
  { text: " · done" },
];

Deno.test("a released line that fits prints exactly as given", () => {
  assertEquals(releasedLines("Ran  2 jobs", 40, true), ["Ran  2 jobs"]);
  assertEquals(releasedLines(COMMAND, 40, true), [
    "Ran: deploy --target production · done",
  ]);
  assertEquals(
    releasedLines([{ text: "✓ ", ascii: "v " }, { text: "Done" }], 40, false),
    ["v Done"],
  );
});

Deno.test("a longer line wraps at words and hangs under its own indentation", () => {
  assertEquals(
    releasedLines("A sentence of plain prose that wraps.", 20, true),
    ["A sentence of plain", "  prose that wraps."],
  );
  assertEquals(
    releasedLines("  - an indented note that wraps", 20, true),
    ["  - an indented note", "    that wraps"],
  );
});

Deno.test("a code run never breaks, and one wider than the terminal stays whole", () => {
  assertEquals(releasedLines(COMMAND, 30, true), [
    "Ran:",
    "  deploy --target production ·",
    "  done",
  ]);
  assertEquals(releasedLines(COMMAND, 20, true), [
    "Ran:",
    "  deploy --target production",
    "  · done",
  ]);
  // A code run joins what touches it without a space.
  assertEquals(
    releasedLines(
      [{ text: "See (" }, { text: "a b c", role: "code" }, { text: ")." }],
      6,
      true,
    ),
    ["See", "  (a b c)."],
  );
});

Deno.test("every wrapped row fits unless it holds one unbreakable word", () => {
  const prose = "The quick brown fox jumps over the lazy dog again and again";
  for (let columns = 1; columns <= 64; columns += 1) {
    for (const line of [prose, `   ${prose}`, COMMAND]) {
      const rows = releasedLines(line, columns, true);
      const words = rows.join(" ").split(/\s+/u).filter((word) => word !== "");
      for (const row of rows) {
        if (measureText(row) <= columns) continue;
        // Only a row that is one word, or one code run, may overflow.
        assertEquals(
          row.trim() === "deploy --target production" ||
            !row.trim().includes(" "),
          true,
          `${JSON.stringify(row)} at ${columns}`,
        );
      }
      // Wrapping never loses or reorders a word.
      const source = typeof line === "string"
        ? line
        : line.map((run) => run.text).join("");
      assertEquals(words, source.split(/\s+/u).filter((word) => word !== ""));
    }
  }
});
