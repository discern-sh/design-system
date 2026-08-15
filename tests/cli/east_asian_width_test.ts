import { assertEquals } from "@std/assert";
import {
  EAST_ASIAN_WIDTH_UNICODE_VERSION,
  eastAsianWidthKind,
} from "../../src/cli/east-asian-width.ts";

Deno.test("terminal glyph safety uses the pinned Unicode width classes", () => {
  assertEquals(EAST_ASIAN_WIDTH_UNICODE_VERSION, "17.0.0");
  assertEquals(eastAsianWidthKind("△".codePointAt(0) ?? 0), "ambiguous");
  assertEquals(eastAsianWidthKind("◴".codePointAt(0) ?? 0), "narrow");
  assertEquals(eastAsianWidthKind("界".codePointAt(0) ?? 0), "wide");
});
