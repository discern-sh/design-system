import { assert, assertEquals } from "@std/assert";
import * as chartGlyphAuthority from "../../src/cli/glyph-ramps.ts";
import type { TerminalRampGlyph } from "../../src/cli/glyph-ramps.ts";
import { measureText } from "../../src/cli/text.ts";
import { eastAsianWidthKind } from "../../src/unicode/east-asian-width.ts";

interface EnrolledGlyph {
  readonly path: string;
  readonly member: TerminalRampGlyph;
}

function isGlyph(value: unknown): value is TerminalRampGlyph {
  if (value === null || typeof value !== "object") return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.unicode === "string" &&
    typeof candidate.ascii === "string";
}

/** Recursively enroll every glyph table exported by the one authority. */
function enrolledGlyphs(): readonly EnrolledGlyph[] {
  const enrolled: EnrolledGlyph[] = [];
  const seen = new Set<object>();
  const visit = (value: unknown, path: string): void => {
    if (isGlyph(value)) {
      enrolled.push({ path, member: value });
      return;
    }
    if (value === null || typeof value !== "object" || seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const [key, member] of Object.entries(value)) {
      visit(member, `${path}.${key}`);
    }
  };
  visit(chartGlyphAuthority, "glyph-ramps");
  return enrolled;
}

Deno.test("the chart glyph authority recursively enrolls only one-cell Unicode/ASCII pairs", () => {
  const enrolled = enrolledGlyphs();
  assert(enrolled.length > 0, "the glyph authority exposes its members");
  for (const { path, member } of enrolled) {
    assertEquals(
      Array.from(member.unicode).length,
      1,
      `${path}.unicode is one scalar`,
    );
    assertEquals(
      Array.from(member.ascii).length,
      1,
      `${path}.ascii is one scalar`,
    );
    assert(
      /^[\x20-\x7e]$/u.test(member.ascii),
      `${path}.ascii is one printable ASCII cell`,
    );
    assertEquals(measureText(member.unicode), 1, `${path}.unicode width`);
    assertEquals(measureText(member.ascii), 1, `${path}.ascii width`);
    const codePoint = member.unicode.codePointAt(0);
    assert(codePoint !== undefined);
    assert(
      eastAsianWidthKind(codePoint) !== "wide",
      `${path}.unicode must remain one cell under the supported narrow-ambiguous policy`,
    );
  }
});
