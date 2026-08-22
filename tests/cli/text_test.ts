import { assert, assertEquals } from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
import { eastAsianWidthKind } from "../../src/unicode/east-asian-width.ts";
import { testTerminalCapabilities } from "../../src/cli/interactive/testing.ts";
import {
  graphemeWidth,
  measureText,
  padText,
  truncateText,
  wrapStyledTextPreservingIndent,
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

Deno.test("terminal width follows emoji presentation rather than pictographic membership", () => {
  const extendedPictographic = /\p{Extended_Pictographic}/u;
  const rgiEmoji = /^\p{RGI_Emoji}$/v;
  let examined = 0;
  let mismatchCount = 0;
  const mismatchSamples: string[] = [];

  for (let codePoint = 0; codePoint <= 0x10ffff; codePoint += 1) {
    if (codePoint >= 0xd800 && codePoint <= 0xdfff) continue;
    const scalar = String.fromCodePoint(codePoint);
    if (!extendedPictographic.test(scalar) || rgiEmoji.test(scalar)) continue;
    examined += 1;
    const expected = eastAsianWidthKind(codePoint) === "wide" ? 2 : 1;
    if (graphemeWidth(scalar) !== expected) {
      mismatchCount += 1;
      if (mismatchSamples.length < 12) {
        mismatchSamples.push(`U+${codePoint.toString(16).toUpperCase()}`);
      }
    }
  }

  assert(examined > 0, "the Unicode pictographic detector must enrol members");
  assertEquals(
    mismatchCount,
    0,
    `text-presentation pictographs measured as emoji: ${
      mismatchSamples.join(
        ", ",
      )
    }`,
  );
  for (
    const emoji of ["☑️", "©️", "😀", "👩‍💻", "1️⃣", "🇬🇧", "🧑🏽"]
  ) {
    assertEquals(graphemeWidth(emoji), 2, emoji);
  }
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

Deno.test("styled indent-preserving wrap keeps style on every continuation", () => {
  const capabilities = testTerminalCapabilities({
    columns: 12,
    colorDepth: "truecolor",
  });
  const lines = wrapStyledTextPreservingIndent(
    styleText("  alpha beta gamma", { bold: true }, capabilities),
    9,
  );
  assertEquals(lines.map(stripAnsi), ["  alpha", "  beta", "  gamma"]);
  assert(lines.every((line) => line.includes(String.fromCharCode(27))));
});

Deno.test("padding aligns by visible cells", () => {
  assertEquals(padText("界", 4), "界  ");
  assertEquals(padText("x", 5, "center"), "  x  ");
  assertEquals(padText("x", 3, "end"), "  x");
});
