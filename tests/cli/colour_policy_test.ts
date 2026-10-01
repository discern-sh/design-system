import { assert, assertEquals } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import {
  applicationTerminalCapabilities,
  detectTerminalCapabilities,
} from "../../src/cli/capabilities.ts";
import { renderSemanticInlineContent } from "../../src/cli/semantic-inline.ts";
import { deriveTerminalTheme } from "../../src/cli/theme.ts";
import { runTerminalApplication } from "../../src/cli/interactive/mod.ts";
import { testView } from "../fixtures/application-views.ts";
import {
  FakeTerminalIO,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const theme = deriveTerminalTheme("dark", { accent: 255 });
const accent = theme.colors["--discern-color-accent-700"];

Deno.test("plain output without colour stays bare text", () => {
  const detected = detectTerminalCapabilities({
    env: { NO_COLOR: "1", TERM: "xterm-256color" },
    isTty: true,
  });
  assertEquals(detected.colorDepth, "none");
  assertEquals(detected.emphasisWithoutColor, undefined);
  assertEquals(
    styleText("x", { bold: true, underline: true }, detected),
    "x",
  );
});

Deno.test("applications keep bold and underline and strip only colour", () => {
  const plain = testTerminalCapabilities({ colorDepth: "none" });
  const owned = applicationTerminalCapabilities(plain);
  assertEquals(owned.emphasisWithoutColor, true);
  assertEquals(
    applicationTerminalCapabilities({ ...plain, emphasisWithoutColor: false })
      .emphasisWithoutColor,
    false,
    "an explicit refusal stands",
  );
  assert(accent !== undefined);
  assertEquals(
    styleText("x", {
      bold: true,
      dim: true,
      italic: true,
      underline: true,
      strikethrough: true,
      color: accent,
      background: theme.surfaces.selection,
    }, owned),
    "\x1b[1;4mx\x1b[0m",
  );
  assertEquals(styleText("x", { color: accent, dim: true }, owned), "x");
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  assertEquals(
    styleText("x", { bold: true }, applicationTerminalCapabilities(truecolor)),
    styleText("x", { bold: true }, truecolor),
    "colour depths are untouched",
  );
});

Deno.test("inline emphasis spells markers only where attributes cannot draw it", () => {
  const content = [
    { kind: "strong", content: [{ kind: "text", text: "firm" }] },
    { kind: "text", text: " and " },
    { kind: "emphasis", content: [{ kind: "text", text: "soft" }] },
  ] as const;
  const plain = testTerminalCapabilities({ colorDepth: "none" });
  assertEquals(
    renderSemanticInlineContent(content, plain),
    "**firm** and _soft_",
  );
  assertEquals(
    renderSemanticInlineContent(
      content,
      applicationTerminalCapabilities(plain),
    ),
    "\x1b[1mfirm\x1b[0m and _soft_",
  );
});

Deno.test("the application runtime paints emphasis on a colourless terminal", async () => {
  const io = new FakeTerminalIO(["q"], { colorDepth: "none" });
  await runTerminalApplication({
    view: testView(["a"], { body: "list" }),
    keymap: [{ key: "q", action: "quit" }],
    onAction: (action) => action === "quit" ? { kind: "exit" } : undefined,
  }, { io });
  const output = io.output();
  assert(output.includes("\x1b[1m"), "bold reaches the colourless terminal");
  const sgr = new RegExp(`${String.fromCharCode(27)}\\[([0-9;]*)m`, "gu");
  const codes = [...output.matchAll(sgr)].flatMap((match) =>
    (match[1] ?? "").split(";").filter((code) => code !== "").map(Number)
  );
  assert(
    codes.every((code) => code === 0 || code === 1 || code === 4),
    `only bold, underline, and resets reach the terminal: ${codes}`,
  );
});
