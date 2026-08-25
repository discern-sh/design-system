import { assert, assertEquals, assertThrows } from "@std/assert";
import {
  allocateProportionalBlocks,
  BOX_SUMMARY_GLYPHS,
  DECLARED_GAP_GLYPH,
  HORIZONTAL_EIGHTH_RAMP,
  LINE_PATH_GLYPHS,
  rampGlyph,
  rampStepForFraction,
  SERIES_FILLS,
  SERIES_MARKERS,
  SHADE_RAMP,
  type TerminalRampGlyph,
  VERTICAL_EIGHTH_RAMP,
} from "../../src/cli/glyph-ramps.ts";
import { graphemeWidth } from "../../src/cli/text.ts";
import { allocateDiffstatBlocks } from "../../src/components/display/diffstat/diffstat.shared.ts";
import { minimumChartProportionalUnits } from "../../src/chart/proportions.ts";

const TABLES: readonly {
  readonly name: string;
  readonly glyphs: readonly TerminalRampGlyph[];
}[] = [
  { name: "horizontal eighth ramp", glyphs: HORIZONTAL_EIGHTH_RAMP },
  { name: "vertical eighth ramp", glyphs: VERTICAL_EIGHTH_RAMP },
  { name: "shade ramp", glyphs: SHADE_RAMP },
  { name: "series markers", glyphs: SERIES_MARKERS },
  { name: "series fills", glyphs: SERIES_FILLS },
  {
    name: "line path glyphs",
    glyphs: Object.freeze(Object.values(LINE_PATH_GLYPHS)),
  },
  {
    name: "box summary glyphs",
    glyphs: Object.freeze(Object.values(BOX_SUMMARY_GLYPHS)),
  },
  { name: "declared gap", glyphs: Object.freeze([DECLARED_GAP_GLYPH]) },
];

Deno.test("every ramp glyph occupies exactly one terminal cell in both repertoires", () => {
  for (const { name, glyphs } of TABLES) {
    for (const member of glyphs) {
      assertEquals(
        graphemeWidth(member.unicode),
        1,
        `${name} unicode ${
          JSON.stringify(member.unicode)
        } must measure one cell`,
      );
      assertEquals(
        graphemeWidth(member.ascii),
        1,
        `${name} ascii ${JSON.stringify(member.ascii)} must measure one cell`,
      );
      assert(
        /^[\x20-\x7e]$/u.test(member.ascii),
        `${name} ascii pairing ${
          JSON.stringify(member.ascii)
        } must be one printable ASCII character`,
      );
      assertEquals(rampGlyph(member, true), member.unicode);
      assertEquals(rampGlyph(member, false), member.ascii);
    }
    assert(Object.isFrozen(glyphs), `${name} table must be frozen`);
  }
});

Deno.test("eighth-block ramps are strictly ordered by their encoded fill", () => {
  assertEquals(HORIZONTAL_EIGHTH_RAMP.length, 8);
  HORIZONTAL_EIGHTH_RAMP.forEach((member, index) => {
    assertEquals(
      member.unicode.codePointAt(0),
      0x2590 - (index + 1),
      `horizontal step ${index + 1} must encode ${index + 1}/8 fill`,
    );
    assert(member.ascii !== " ", "a nonzero horizontal fill never blanks");
  });
  assertEquals(VERTICAL_EIGHTH_RAMP.length, 8);
  VERTICAL_EIGHTH_RAMP.forEach((member, index) => {
    assertEquals(
      member.unicode.codePointAt(0),
      0x2580 + index + 1,
      `vertical step ${index + 1} must encode ${index + 1}/8 fill`,
    );
    assert(member.ascii !== " ", "a nonzero vertical fill never blanks");
  });
});

Deno.test("shade bins pair perceptual shading with exact digit identity", () => {
  assertEquals(
    SHADE_RAMP.map((member) => member.unicode),
    [" ", "░", "▒", "▓", "█"],
  );
  SHADE_RAMP.forEach((member, index) => {
    assertEquals(
      member.ascii,
      index === 0 ? " " : String(index),
      "each nonzero shade bin prints its exact bin index in ASCII",
    );
  });
});

Deno.test("series glyph tables keep six pairwise-distinct cues per repertoire", () => {
  for (const glyphs of [SERIES_MARKERS, SERIES_FILLS]) {
    assertEquals(glyphs.length, 6);
    assertEquals(new Set(glyphs.map((member) => member.unicode)).size, 6);
    assertEquals(new Set(glyphs.map((member) => member.ascii)).size, 6);
  }
});

Deno.test("line path glyphs keep the asterisk-with-dot ASCII idiom", () => {
  assert(Object.isFrozen(LINE_PATH_GLYPHS));
  assertEquals(
    Object.keys(LINE_PATH_GLYPHS).toSorted(),
    ["fallFrom", "fallTo", "level", "riseFrom", "riseTo", "run"],
  );
  for (const segment of ["level", "riseTo", "fallTo"] as const) {
    assertEquals(
      LINE_PATH_GLYPHS[segment].ascii,
      "*",
      `${segment} sits on an authored row and pairs with the asterisk`,
    );
  }
  for (const segment of ["riseFrom", "fallFrom", "run"] as const) {
    assertEquals(
      LINE_PATH_GLYPHS[segment].ascii,
      ".",
      `${segment} only interpolates and pairs with the dot`,
    );
  }
  assertEquals(
    new Set(Object.values(LINE_PATH_GLYPHS).map(({ unicode }) => unicode))
      .size,
    6,
    "each path segment draws a distinct Unicode glyph",
  );
});

Deno.test("box summary glyphs keep the median readable against the body", () => {
  assert(Object.isFrozen(BOX_SUMMARY_GLYPHS));
  const { body, median, whisker, capStart, capEnd } = BOX_SUMMARY_GLYPHS;
  assert(body.unicode !== median.unicode && body.ascii !== median.ascii);
  assert(whisker.unicode !== body.unicode && whisker.ascii !== body.ascii);
  assertEquals(capStart.ascii, capEnd.ascii);
  assert(capStart.unicode !== capEnd.unicode);
});

Deno.test("the declared gap stays distinct from every vertical ramp step", () => {
  for (const member of VERTICAL_EIGHTH_RAMP) {
    assert(member.unicode !== DECLARED_GAP_GLYPH.unicode);
    assert(member.ascii !== DECLARED_GAP_GLYPH.ascii);
  }
  assert(DECLARED_GAP_GLYPH.unicode !== " ");
  assert(DECLARED_GAP_GLYPH.ascii !== " ");
});

Deno.test("fraction quantization never hides a nonzero value", () => {
  assertEquals(rampStepForFraction(0, 8), 0);
  assertEquals(rampStepForFraction(0.001, 8), 1);
  assertEquals(rampStepForFraction(1, 8), 8);
  assertEquals(rampStepForFraction(0.5, 8), 4);
  assertEquals(rampStepForFraction(0.5625, 8), 5);
  assertEquals(rampStepForFraction(0.4, 5), 2);
  assertThrows(() => rampStepForFraction(1.2, 8), TypeError, "0..1");
  assertThrows(
    () => rampStepForFraction(0.5, 0),
    TypeError,
    "positive integer",
  );
});

Deno.test("proportional allocation preserves totals and every nonzero share", () => {
  assertEquals(allocateProportionalBlocks([0, 5, 5], 10), [0, 5, 5]);
  assertEquals(allocateProportionalBlocks([0, 0, 0], 6), [0, 0, 0]);
  assertEquals(allocateProportionalBlocks([2, 1, 1], 8), [4, 2, 2]);
  assertEquals(
    allocateProportionalBlocks(
      [Number.MAX_VALUE, Number.MAX_VALUE],
      20,
    ),
    [10, 10],
  );
  assertEquals(
    allocateProportionalBlocks([Number.MIN_VALUE, Number.MIN_VALUE], 20),
    [10, 10],
  );
  for (
    const [shares, blocks] of [
      [[3, 1, 6], 12],
      [[1, 1, 1, 1], 8],
      [[5, 2, 2, 1], 10],
      [[0.5, 0.25, 0.25], 9],
    ] as const
  ) {
    const counts = allocateProportionalBlocks(shares, blocks);
    assertEquals(
      counts.reduce((sum, count) => sum + count, 0),
      blocks,
      "allocated blocks must sum to the requested width",
    );
    shares.forEach((share, index) => {
      if (share > 0) {
        assert(
          (counts[index] ?? 0) >= 1,
          `nonzero share ${index} must keep at least one block`,
        );
      } else {
        assertEquals(counts[index], 0, "a zero share receives nothing");
      }
    });
    assertEquals(
      allocateProportionalBlocks(shares, blocks),
      counts,
      "allocation is deterministic",
    );
  }
});

Deno.test("allocation refuses widths that would hide a nonzero share", () => {
  assertThrows(
    () => allocateProportionalBlocks([1, 1, 1], 2),
    TypeError,
    "cannot render the smallest nonzero share truthfully",
  );
  assertThrows(
    () => allocateProportionalBlocks([1, 1, 98], 48),
    TypeError,
    "allocate at least 100",
  );
  assertThrows(
    () => allocateProportionalBlocks([1, 1000, 1000], 10),
    TypeError,
    "allocate at least 2001",
  );
  assertThrows(
    () => allocateProportionalBlocks([1, -1], 4),
    TypeError,
    "non-negative",
  );
  assertThrows(
    () => allocateProportionalBlocks([1, 1], -1),
    TypeError,
    "non-negative safe integer",
  );
});

Deno.test("resolved two-share allocations retain the pinned Diffstat tie rules", () => {
  for (const added of [0, 1, 2, 5, 9, 50]) {
    for (const removed of [0, 1, 3, 7, 41]) {
      for (const blocks of [2, 3, 8, 10]) {
        const legacy = allocateDiffstatBlocks(added, removed, blocks);
        const required = minimumChartProportionalUnits([added, removed]);
        if (blocks < required) {
          assertThrows(
            () => allocateProportionalBlocks([added, removed], blocks),
            TypeError,
            `allocate at least ${required}`,
          );
          continue;
        }
        const counts = allocateProportionalBlocks([added, removed], blocks);
        assertEquals(
          counts[0],
          legacy.filter((share) => share === "added").length,
          `added share diverges for ${added}/${removed} over ${blocks}`,
        );
        assertEquals(
          counts[1],
          legacy.filter((share) => share === "removed").length,
          `removed share diverges for ${added}/${removed} over ${blocks}`,
        );
      }
    }
  }
});
