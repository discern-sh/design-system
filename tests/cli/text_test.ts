import { assertEquals } from "@std/assert";
import {
  graphemeWidth,
  measureText,
  padText,
  truncateText,
  wrapText,
  wrapTextPreservingIndent,
} from "../../src/cli/text.ts";

Deno.test("terminal width is grapheme-aware and ignores ANSI", () => {
  assertEquals(graphemeWidth("e\u0301"), 1);
  assertEquals(graphemeWidth("👩‍💻"), 2);
  assertEquals(measureText("abc"), 3);
  assertEquals(measureText("界a"), 3);
  assertEquals(measureText("👨‍👩‍👧‍👦"), 2);
  assertEquals(measureText("\x1b[31mred\x1b[0m"), 3);
  assertEquals(measureText("short\n界界界"), 6);
});

Deno.test("wrapping and truncation never split a grapheme", () => {
  assertEquals(wrapText("alpha beta gamma", 10), ["alpha beta", "gamma"]);
  assertEquals(wrapText("界界界", 4), ["界界", "界"]);
  assertEquals(truncateText("abcdef", 4), "abc…");
  assertEquals(truncateText("👩‍💻tools", 4), "👩‍💻t…");
  assertEquals(truncateText("abcdef", 4, "."), "abc.");
});

Deno.test("indent-preserving wrap hangs continuations under the indentation", () => {
  assertEquals(
    wrapTextPreservingIndent("    at deep.frame (mod.ts:1)", 16),
    ["    at", "    deep.frame", "    (mod.ts:1)"],
  );
  assertEquals(
    wrapTextPreservingIndent("fits  intact", 20),
    ["fits  intact"],
  );
  assertEquals(
    wrapTextPreservingIndent("one\n  two three four", 9),
    ["one", "  two", "  three", "  four"],
  );
  assertEquals(
    wrapTextPreservingIndent("      abc", 4),
    ["   a", "   b", "   c"],
  );
  assertEquals(
    wrapTextPreservingIndent("\x1b[31m    styled words here\x1b[0m", 12),
    ["    styled", "    words", "    here"],
  );
});

Deno.test("padding aligns by visible cells", () => {
  assertEquals(padText("界", 4), "界  ");
  assertEquals(padText("x", 5, "center"), "  x  ");
  assertEquals(padText("x", 3, "end"), "  x");
});
