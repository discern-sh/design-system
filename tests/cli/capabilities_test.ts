import { assertEquals } from "@std/assert";
import { detectTerminalCapabilities } from "../../src/cli/capabilities.ts";

Deno.test("terminal detection separates tty, colour, width, and Unicode facts", () => {
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "xterm-256color", LANG: "en_GB.UTF-8" },
      isTty: true,
      columns: 132,
    }),
    {
      ansiControl: true,
      colorDepth: "ansi256",
      columns: 132,
      unicode: true,
    },
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
    {
      ansiControl: true,
      colorDepth: "truecolor",
      columns: 80,
      unicode: true,
    },
  );
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "vt100", LANG: "C" },
      isTty: true,
    }),
    {
      ansiControl: true,
      colorDepth: "ansi16",
      columns: 80,
      unicode: false,
    },
  );
});

Deno.test("terminal control, colour, and Unicode are independent capability facts", () => {
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "xterm-256color", NO_COLOR: "" },
      isTty: true,
    }).colorDepth,
    "none",
  );
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "dumb", NO_COLOR: "1", LC_ALL: "C.UTF-8" },
      isTty: true,
    }),
    {
      ansiControl: false,
      colorDepth: "none",
      columns: 80,
      unicode: true,
    },
  );
  assertEquals(
    detectTerminalCapabilities({
      env: { TERM: "xterm-256color" },
      isTty: false,
      columns: 0,
    }),
    {
      ansiControl: false,
      colorDepth: "none",
      columns: 80,
      unicode: false,
    },
  );
});

Deno.test("locale repertoire matrix preserves UTF-8 and exact C/POSIX ASCII fallbacks", () => {
  const cases = [
    {
      name: "Codex C.UTF-8 tty",
      env: { TERM: "dumb", NO_COLOR: "1", LC_ALL: "C.UTF-8" },
      isTty: true,
      expected: { ansiControl: false, colorDepth: "none", unicode: true },
    },
    {
      name: "Claude-style lowercase C.utf8 tty",
      env: { TERM: "dumb", LANG: "C.utf8" },
      isTty: true,
      expected: { ansiControl: false, colorDepth: "none", unicode: true },
    },
    {
      name: "NO_COLOR UTF-8 tty",
      env: { TERM: "xterm-256color", NO_COLOR: "", LANG: "en_US.UTF-8" },
      isTty: true,
      expected: { ansiControl: true, colorDepth: "none", unicode: true },
    },
    {
      name: "exact C tty",
      env: { TERM: "xterm", LANG: "C" },
      isTty: true,
      expected: { ansiControl: true, colorDepth: "ansi16", unicode: false },
    },
    {
      name: "exact POSIX tty",
      env: { TERM: "xterm", LANG: "POSIX" },
      isTty: true,
      expected: { ansiControl: true, colorDepth: "ansi16", unicode: false },
    },
    {
      name: "UTF-8 pipe",
      env: { TERM: "dumb", LANG: "en_GB.UTF-8" },
      isTty: false,
      expected: { ansiControl: false, colorDepth: "none", unicode: true },
    },
  ] as const;

  for (const testCase of cases) {
    const actual = detectTerminalCapabilities({
      env: testCase.env,
      isTty: testCase.isTty,
    });
    assertEquals(
      { ...actual, columns: undefined },
      { ...testCase.expected, columns: undefined },
      testCase.name,
    );
  }
});
