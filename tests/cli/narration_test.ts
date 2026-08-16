import { assertEquals, assertThrows } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import {
  type NarrationLineKind,
  narrationLineRenderers,
  renderFailureLine,
  renderLeadLine,
  renderNoteLine,
  renderSuccessLine,
  renderWarningLine,
  styleSemanticText,
} from "../../src/cli/narration.ts";
import type { TerminalTextRole } from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const ESC = "\u001b";

Deno.test("narration verbs render exact plain frames with Unicode markers", () => {
  const capabilities = testTerminalCapabilities();
  const cases = [
    [renderSuccessLine, "Saved the draft", "✓ Saved the draft"],
    [renderNoteLine, "Cache already warm", "▸ Cache already warm"],
    [renderWarningLine, "Two checks need review", "! Two checks need review"],
    [renderFailureLine, "The check refused", "✕ The check refused"],
    [renderLeadLine, "Preflight", "◮ PREFLIGHT"],
  ] as const;
  for (const [render, text, expected] of cases) {
    assertExactFrame(render({ text }, capabilities), expected, capabilities);
  }
});

Deno.test("narration verbs keep their meaning through ASCII markers", () => {
  const capabilities = testTerminalCapabilities({ unicode: false });
  const cases = [
    [renderSuccessLine, "Saved the draft", "+ Saved the draft"],
    [renderNoteLine, "Cache already warm", "> Cache already warm"],
    [renderWarningLine, "Two checks need review", "! Two checks need review"],
    [renderFailureLine, "The check refused", "x The check refused"],
    [renderLeadLine, "Preflight", "> PREFLIGHT"],
  ] as const;
  for (const [render, text, expected] of cases) {
    assertExactFrame(render({ text }, capabilities), expected, capabilities);
  }
});

Deno.test("narration markers carry exact Token-derived colour at every depth", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  assertEquals(
    renderSuccessLine({ text: "Saved the draft" }, truecolor),
    `${ESC}[38;2;165;235;183m✓${ESC}[0m Saved the draft`,
  );
  assertEquals(
    renderNoteLine({ text: "Cache already warm" }, truecolor),
    `${ESC}[38;2;150;199;255m▸${ESC}[0m Cache already warm`,
  );
  assertEquals(
    renderWarningLine({ text: "Two checks need review" }, truecolor),
    `${ESC}[38;2;242;203;131m!${ESC}[0m Two checks need review`,
  );
  assertEquals(
    renderFailureLine({ text: "The check refused" }, truecolor),
    `${ESC}[38;2;246;110;96m✕${ESC}[0m The check refused`,
  );
  assertEquals(
    renderSuccessLine(
      { text: "Saved the draft" },
      testTerminalCapabilities({ colorDepth: "ansi256" }),
    ),
    `${ESC}[38;5;151m✓${ESC}[0m Saved the draft`,
  );
  const ansi16 = testTerminalCapabilities({ colorDepth: "ansi16" });
  assertEquals(
    renderSuccessLine({ text: "Saved the draft" }, ansi16),
    `${ESC}[37m✓${ESC}[0m Saved the draft`,
  );
  assertEquals(
    renderFailureLine({ text: "The check refused" }, ansi16),
    `${ESC}[90m✕${ESC}[0m The check refused`,
  );
});

Deno.test("narration lead lines take the strong uppercase title treatment", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  assertEquals(
    renderLeadLine({ text: "Preflight" }, truecolor),
    `${ESC}[38;2;150;199;255m◮${ESC}[0m ${ESC}[1;38;2;231;231;240mPREFLIGHT${ESC}[0m`,
  );
});

Deno.test("narration themes move only Token colours, never geometry", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  const light = renderSuccessLine(
    { text: "Saved the draft", theme: "light" },
    truecolor,
  );
  assertEquals(light, `${ESC}[38;2;12;77;38m✓${ESC}[0m Saved the draft`);
  assertEquals(
    renderLeadLine({ text: "Preflight", theme: "light" }, truecolor),
    `${ESC}[38;2;0;76;180m◮${ESC}[0m ${ESC}[1;38;2;30;29;45mPREFLIGHT${ESC}[0m`,
  );
  const dark = renderSuccessLine({ text: "Saved the draft" }, truecolor);
  assertEquals(stripAnsi(light), stripAnsi(dark));
});

Deno.test("narration lines wrap inside maxWidth with a hanging indent", () => {
  const capabilities = testTerminalCapabilities();
  assertExactFrame(
    renderSuccessLine({ text: "alpha beta gamma", maxWidth: 12 }, capabilities),
    "✓ alpha beta\n  gamma",
    { ...capabilities, columns: 12 },
  );
  assertExactFrame(
    renderLeadLine({ text: "release checks", maxWidth: 10 }, capabilities),
    "◮ RELEASE\n  CHECKS",
    { ...capabilities, columns: 10 },
  );
  const narrow = testTerminalCapabilities({ columns: 12 });
  assertExactFrame(
    renderSuccessLine({ text: "alpha beta gamma", maxWidth: 80 }, narrow),
    "✓ alpha beta\n  gamma",
    narrow,
  );
});

Deno.test("narration validates its text and width requests", () => {
  const capabilities = testTerminalCapabilities();
  for (const text of ["", " padded", "padded ", "two\nlines", "zw\u200dj"]) {
    assertThrows(
      () => renderNoteLine({ text }, capabilities),
      TypeError,
      "narration text must be non-empty, trimmed, and control-free",
    );
  }
  assertThrows(
    () => renderNoteLine({ text: "fact", maxWidth: 2 }, capabilities),
    TypeError,
    "narration width must be a safe integer of at least 3; received 2",
  );
  assertThrows(
    () =>
      renderNoteLine(
        { text: "fact", maxWidth: 20 },
        testTerminalCapabilities({ columns: 2 }),
      ),
    TypeError,
    "terminal width 2 cannot hold a narration line",
  );
});

Deno.test("the narration renderer record maps every kind to its verb", () => {
  const verbs: Readonly<
    Record<NarrationLineKind, typeof renderSuccessLine>
  > = {
    success: renderSuccessLine,
    note: renderNoteLine,
    warning: renderWarningLine,
    failure: renderFailureLine,
    lead: renderLeadLine,
  };
  for (const [kind, verb] of Object.entries(verbs)) {
    assertEquals(
      narrationLineRenderers[kind as NarrationLineKind],
      verb,
      `record entry ${kind} is not its standalone verb`,
    );
  }
});

Deno.test("styleSemanticText resolves roles and tones from the theme bridge", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  assertEquals(
    styleSemanticText("quiet", { role: "muted" }, truecolor),
    `${ESC}[2mquiet${ESC}[0m`,
  );
  assertEquals(
    styleSemanticText("Done", { role: "strong", tone: "success" }, truecolor),
    `${ESC}[1;38;2;165;235;183mDone${ESC}[0m`,
  );
  assertEquals(
    styleSemanticText("Done", { tone: "success", theme: "light" }, truecolor),
    `${ESC}[38;2;12;77;38mDone${ESC}[0m`,
  );
  assertEquals(styleSemanticText("bare", {}, truecolor), "bare");
  assertEquals(
    styleSemanticText("quiet", { role: "muted", tone: "danger" }, {
      ...truecolor,
      colorDepth: "none",
    }),
    "quiet",
  );
  assertThrows(
    () =>
      styleSemanticText(
        "loud",
        { role: "shout" as TerminalTextRole },
        truecolor,
      ),
    TypeError,
    "unknown terminal text role shout",
  );
});
