import { assertEquals } from "@std/assert";
import { detectTerminalCapabilities } from "../../src/cli/capabilities.ts";

Deno.test("terminal detection separates tty, colour, width, and Unicode facts", () => {
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "xterm-256color", LANG: "en_GB.UTF-8" },
      isTty: true,
      columns: 132,
    }),
    { colorDepth: "ansi256", columns: 132, unicode: true },
  );
  assertEquals(
    detectTerminalCapabilities({
      env: {
        TERM: "screen-256color",
        COLORTERM: "truecolor",
        LANG: "en_GB.UTF-8",
      },
      isTty: true,
    }),
    { colorDepth: "truecolor", columns: 80, unicode: true },
  );
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "vt100", LANG: "C" },
      isTty: true,
    }),
    { colorDepth: "ansi16", columns: 80, unicode: false },
  );
});

Deno.test("NO_COLOR, dumb terminals, and non-ttys disable ANSI colour", () => {
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "xterm-256color", NO_COLOR: "" },
      isTty: true,
    }).colorDepth,
    "none",
  );
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "dumb" },
      isTty: true,
    }),
    { colorDepth: "none", columns: 80, unicode: false },
  );
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "xterm-256color" },
      isTty: false,
      columns: 0,
    }),
    { colorDepth: "none", columns: 80, unicode: false },
  );
});
