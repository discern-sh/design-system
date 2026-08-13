import { assert } from "@std/assert";
import { stripAnsi, styleText } from "../../src/cli/ansi.ts";
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

Deno.test("box bodies preserve meaningful leading indentation while fitting and wrapping", () => {
  const capabilities = testCapabilities({ columns: 12 });
  assertExactFrame(
    renderBox({
      body: "  Alpha\n  one two three",
      width: 12,
      padding: 0,
    }, capabilities),
    "┌──────────┐\n│  Alpha   │\n│  one two │\n│  three   │\n└──────────┘",
    capabilities,
  );
});

Deno.test("box bodies preserve fitting Token-styled structural lines", () => {
  const capabilities = testCapabilities({
    colorDepth: "truecolor",
    columns: 12,
  });
  const frame = renderBox({
    body: styleText("Section", { bold: true }, capabilities),
    width: 12,
  }, capabilities);
  assert(frame.includes(String.fromCharCode(27)));
  assertExactFrame(
    stripAnsi(frame),
    "┌──────────┐\n│ Section  │\n└──────────┘",
    capabilities,
  );
});
