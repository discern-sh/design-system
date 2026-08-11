import { renderBox } from "../../src/cli/box.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";

Deno.test("box drawing has exact Unicode and ASCII frames", () => {
  const unicode = testCapabilities({ columns: 12, unicode: true });
  assertExactFrame(
    renderBox({ body: "Hi", title: "Info", width: 12 }, unicode),
    "┌ Info ────┐\n│ Hi       │\n└──────────┘",
    unicode,
  );
  const ascii = testCapabilities({ columns: 12, unicode: false });
  assertExactFrame(
    renderBox({ body: "Hi", title: "Info", width: 12 }, ascii),
    "+ Info ----+\n| Hi       |\n+----------+",
    ascii,
  );
});

Deno.test("box bodies wrap to their derived inner width", () => {
  const capabilities = testCapabilities({ columns: 12 });
  assertExactFrame(
    renderBox({ body: "one two three", width: 12 }, capabilities),
    "┌──────────┐\n│ one two  │\n│ three    │\n└──────────┘",
    capabilities,
  );
});
