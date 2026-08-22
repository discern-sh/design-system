import { assert, assertEquals, assertThrows } from "@std/assert";
import { cliBlockBoundary, composeCliBlocks } from "../../src/cli/rhythm.ts";

const HEADING_BLOCK = "\nRELEASE CHECKS";
const FRAME_BLOCK = "┌────┐\n│ ok │\n└────┘";
const LINE_BLOCK = "✓ Saved the draft";
const TRAILING_BLOCK = "▸ Cache already warm\n\n";

function permutations<T>(items: readonly T[]): readonly (readonly T[])[] {
  if (items.length <= 1) return [items];
  return items.flatMap((item, index) =>
    permutations([...items.slice(0, index), ...items.slice(index + 1)])
      .map((rest) => [item, ...rest])
  );
}

Deno.test("composeCliBlocks joins blocks with exactly one blank line", () => {
  assertEquals(
    composeCliBlocks([LINE_BLOCK, FRAME_BLOCK]),
    "✓ Saved the draft\n\n┌────┐\n│ ok │\n└────┘",
  );
  assertEquals(composeCliBlocks([]), "");
  assertEquals(composeCliBlocks([LINE_BLOCK]), LINE_BLOCK);
});

Deno.test("composeCliBlocks normalises boundary-owning and trailing edges", () => {
  assertEquals(
    composeCliBlocks([HEADING_BLOCK, LINE_BLOCK]),
    "RELEASE CHECKS\n\n✓ Saved the draft",
  );
  assertEquals(
    composeCliBlocks([TRAILING_BLOCK, LINE_BLOCK]),
    "▸ Cache already warm\n\n✓ Saved the draft",
  );
  assertEquals(
    composeCliBlocks(["", "   ", "\n \u001b[2m \u001b[0m\n", LINE_BLOCK]),
    LINE_BLOCK,
  );
});

Deno.test("composeCliBlocks preserves deliberate interior blank lines", () => {
  const interior = "first paragraph\n\nsecond paragraph";
  assertEquals(composeCliBlocks([interior]), interior);
  assertEquals(
    composeCliBlocks([interior, LINE_BLOCK]),
    `${interior}\n\n${LINE_BLOCK}`,
  );
});

Deno.test("composed rhythm never doubles or drops a blank line in any order", () => {
  const blocks = [HEADING_BLOCK, FRAME_BLOCK, LINE_BLOCK, TRAILING_BLOCK];
  for (const ordering of permutations(blocks)) {
    const composed = composeCliBlocks(ordering);
    assert(!composed.includes("\n\n\n"), "a boundary doubled");
    assert(!composed.startsWith("\n"), "composed output led with a blank");
    assert(!composed.endsWith("\n"), "composed output trailed a newline");
    const boundaries = composed.split("\n\n");
    assertEquals(boundaries.length, ordering.length, "a boundary went missing");
  }
});

Deno.test("composing composed blocks changes nothing", () => {
  const nested = composeCliBlocks([
    composeCliBlocks([HEADING_BLOCK, FRAME_BLOCK]),
    LINE_BLOCK,
  ]);
  assertEquals(
    nested,
    composeCliBlocks([HEADING_BLOCK, FRAME_BLOCK, LINE_BLOCK]),
  );
});

Deno.test("cliBlockBoundary tops a stream tail up to one blank line", () => {
  assertEquals(cliBlockBoundary(0), "\n\n");
  assertEquals(cliBlockBoundary(1), "\n");
  assertEquals(cliBlockBoundary(2), "");
  assertEquals(cliBlockBoundary(7), "");
  for (const count of [-1, 1.5, Number.NaN, Number.MAX_SAFE_INTEGER + 1]) {
    assertThrows(
      () => cliBlockBoundary(count),
      TypeError,
      "trailing newline count must be a non-negative safe integer",
    );
  }
});

Deno.test("a conforming sink reproduces composeCliBlocks byte-for-byte", () => {
  const blocks = [HEADING_BLOCK, FRAME_BLOCK, LINE_BLOCK, TRAILING_BLOCK];
  for (const ordering of permutations(blocks)) {
    let stream = "";
    let trailing = 0;
    const write = (text: string): void => {
      if (text === "") return;
      stream += text;
      const suffix = text.match(/\n+$/u)?.[0] ?? "";
      trailing = suffix.length === text.length
        ? Math.min(2, trailing + suffix.length)
        : Math.min(2, suffix.length);
    };
    for (const block of ordering) {
      const clean = composeCliBlocks([block]);
      if (clean === "") continue;
      if (stream !== "") write(cliBlockBoundary(trailing));
      write(clean);
      write("\n");
    }
    assertEquals(stream, `${composeCliBlocks(ordering)}\n`);
  }
});
