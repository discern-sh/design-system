import { assert, assertEquals } from "@std/assert";
import { measureText } from "../../src/cli/text.ts";
import {
  type TerminalTriangle,
  triangleGlyph,
  TRIANGLES,
} from "../../src/cli/triangles.ts";

const FAMILIES = [
  "filled",
  "unfilled",
  "filledSmall",
  "unfilledSmall",
] as const;
const DIRECTIONS = ["up", "right", "down", "left"] as const;

function eachTriangle(): TerminalTriangle[] {
  return FAMILIES.flatMap((family) =>
    DIRECTIONS.map((direction) => TRIANGLES[family][direction])
  );
}

Deno.test("triangle authority pins the canonical sixteen glyphs", () => {
  const table = FAMILIES.map((family) =>
    DIRECTIONS.map((direction) => TRIANGLES[family][direction].unicode).join("")
  );
  assertEquals(table, ["▲▶▼◀", "△▷▽◁", "▴▸▾◂", "▵▹▿◃"]);
});

Deno.test("every triangle is one scalar occupying one terminal cell", () => {
  for (const triangle of eachTriangle()) {
    assertEquals([...triangle.unicode].length, 1);
    assertEquals(measureText(triangle.unicode), 1);
  }
});

Deno.test("ASCII fallbacks encode direction alone, identically per family", () => {
  for (const family of FAMILIES) {
    assertEquals(
      DIRECTIONS.map((direction) => TRIANGLES[family][direction].ascii).join(
        "",
      ),
      "^>v<",
    );
  }
});

Deno.test("all sixteen Unicode glyphs are distinct", () => {
  const glyphs = eachTriangle().map((triangle) => triangle.unicode);
  assertEquals(new Set(glyphs).size, glyphs.length);
});

Deno.test("triangleGlyph resolves by the Unicode capability flag", () => {
  assertEquals(triangleGlyph(TRIANGLES.filled.right, true), "▶");
  assertEquals(triangleGlyph(TRIANGLES.filled.right, false), ">");
  assertEquals(triangleGlyph(TRIANGLES.filledSmall.up, true), "▴");
  assertEquals(triangleGlyph(TRIANGLES.filledSmall.up, false), "^");
});

Deno.test("the authority is deeply frozen", () => {
  assert(Object.isFrozen(TRIANGLES));
  for (const family of FAMILIES) {
    assert(Object.isFrozen(TRIANGLES[family]));
    for (const direction of DIRECTIONS) {
      assert(Object.isFrozen(TRIANGLES[family][direction]));
    }
  }
});
