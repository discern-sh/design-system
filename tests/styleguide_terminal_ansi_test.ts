import { assertEquals, assertThrows } from "@std/assert";
import { parseTerminalAnsi } from "../styleguide/terminal-ansi.ts";

Deno.test("browser terminal projection decodes the emitted truecolour styles", () => {
  assertEquals(
    parseTerminalAnsi(
      "\u001b[1;3;4;9;38;2;12;34;56mDiscern\u001b[0m plain " +
        "\u001b[2mquiet\u001b[0m",
    ),
    [
      {
        text: "Discern",
        style: {
          bold: true,
          italic: true,
          underline: true,
          strikethrough: true,
          color: "rgb(12 34 56)",
        },
      },
      { text: " plain " },
      { text: "quiet", style: { dim: true } },
    ],
  );
});

Deno.test("browser terminal projection fails closed for unsupported controls", () => {
  assertThrows(
    () => parseTerminalAnsi("\u001b[38;5;27mANSI 256\u001b[0m"),
    TypeError,
    "does not support SGR code",
  );
  assertThrows(
    () => parseTerminalAnsi("\u001b[2Jclear"),
    TypeError,
    "unsupported control character",
  );
  assertThrows(
    () => parseTerminalAnsi("\u001b[38;2;300;0;0minvalid\u001b[0m"),
    TypeError,
    "invalid truecolour channel",
  );
});
