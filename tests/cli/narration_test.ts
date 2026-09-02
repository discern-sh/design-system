import { assertEquals, assertThrows } from "@std/assert";
import { stripAnsi } from "../../src/cli/ansi.ts";
import { accentAppearance } from "../../src/tokens/tokens.ts";
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
import {
  resolveTerminalTheme,
  type TerminalColor,
  type TerminalTextRole,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const ESC = "\u001b";

function foregroundCode(
  color: TerminalColor,
  depth: "truecolor" | "ansi256" | "ansi16",
): string {
  if (depth === "truecolor") {
    return `${ESC}[38;2;${color.red};${color.green};${color.blue}m`;
  }
  if (depth === "ansi256") return `${ESC}[38;5;${color.ansi256}m`;
  const code = color.ansi16 < 8 ? 30 + color.ansi16 : 90 + color.ansi16 - 8;
  return `${ESC}[${code}m`;
}

Deno.test("narration verbs render exact plain frames with Unicode markers", () => {
  const capabilities = testTerminalCapabilities();
  const cases = [
    [renderSuccessLine, "Saved the draft", "✓ Saved the draft"],
    [renderNoteLine, "Cache already warm", "▸ Cache already warm"],
    [renderWarningLine, "Two checks need review", "! Two checks need review"],
    [renderFailureLine, "The check refused", "✕ The check refused"],
    [renderLeadLine, "Preflight", "▲ PREFLIGHT"],
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
    [renderLeadLine, "Preflight", "^ PREFLIGHT"],
  ] as const;
  for (const [render, text, expected] of cases) {
    assertExactFrame(render({ text }, capabilities), expected, capabilities);
  }
});

Deno.test("narration markers carry exact Token-derived colour at every depth", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  assertEquals(
    renderSuccessLine({ text: "Saved the draft" }, truecolor),
    `${ESC}[38;2;229;229;229m✓${ESC}[0m Saved the draft`,
  );
  assertEquals(
    renderNoteLine({ text: "Cache already warm" }, truecolor),
    `${ESC}[38;2;240;240;240m▸${ESC}[0m Cache already warm`,
  );
  assertEquals(
    renderWarningLine({ text: "Two checks need review" }, truecolor),
    `${ESC}[38;2;219;219;219m!${ESC}[0m Two checks need review`,
  );
  assertEquals(
    renderFailureLine({ text: "The check refused" }, truecolor),
    `${ESC}[38;2;255;255;255m✕${ESC}[0m The check refused`,
  );
  assertEquals(
    renderSuccessLine(
      { text: "Saved the draft" },
      testTerminalCapabilities({ colorDepth: "ansi256" }),
    ),
    `${ESC}[38;5;254m✓${ESC}[0m Saved the draft`,
  );
  const ansi16 = testTerminalCapabilities({ colorDepth: "ansi16" });
  assertEquals(
    renderSuccessLine({ text: "Saved the draft" }, ansi16),
    `${ESC}[97m✓${ESC}[0m Saved the draft`,
  );
  assertEquals(
    renderFailureLine({ text: "The check refused" }, ansi16),
    `${ESC}[97m✕${ESC}[0m The check refused`,
  );
});

Deno.test("narration selects exact Accent semantic codes across poles and depths", () => {
  const cases = [
    [renderSuccessLine, "Saved", "✓", "success"],
    [renderNoteLine, "Noted", "▸", "accent"],
    [renderWarningLine, "Review", "!", "warning"],
    [renderFailureLine, "Refused", "✕", "danger"],
  ] as const;
  for (const hue of [28, 74, 120, 152, 255, 335]) {
    const appearance = accentAppearance(hue);
    for (const theme of ["light", "dark"] as const) {
      const palette = resolveTerminalTheme({ theme, appearance });
      for (
        const colorDepth of ["truecolor", "ansi256", "ansi16"] as const
      ) {
        const capabilities = testTerminalCapabilities({ colorDepth });
        for (const [render, text, marker, tone] of cases) {
          assertEquals(
            render({ text, theme, appearance }, capabilities),
            `${foregroundCode(terminalToneColor(palette, tone), colorDepth)}` +
              `${marker}${ESC}[0m ${text}`,
            `${theme} Accent(${hue}) ${colorDepth} ${tone}`,
          );
        }
      }
    }
  }
});

Deno.test("Accent narration keeps exact witnesses and emits no styling without colour", () => {
  const appearance = accentAppearance(335);
  const cases = [
    [renderSuccessLine, "Saved", "✓ Saved", "+ Saved"],
    [renderNoteLine, "Noted", "▸ Noted", "> Noted"],
    [renderWarningLine, "Review", "! Review", "! Review"],
    [renderFailureLine, "Refused", "✕ Refused", "x Refused"],
  ] as const;
  for (const [render, text, unicode, ascii] of cases) {
    assertEquals(
      render(
        { text, theme: "light", appearance },
        testTerminalCapabilities({ colorDepth: "none", unicode: true }),
      ),
      unicode,
    );
    assertEquals(
      render(
        { text, theme: "dark", appearance },
        testTerminalCapabilities({ colorDepth: "none", unicode: false }),
      ),
      ascii,
    );
  }
});

Deno.test("narration lead lines take the strong uppercase title treatment", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  assertEquals(
    renderLeadLine({ text: "Preflight" }, truecolor),
    `${ESC}[38;2;240;240;240m▲${ESC}[0m ${ESC}[1;38;2;235;235;235mPREFLIGHT${ESC}[0m`,
  );
});

Deno.test("narration themes move only Token colours, never geometry", () => {
  const truecolor = testTerminalCapabilities({ colorDepth: "truecolor" });
  const light = renderSuccessLine(
    { text: "Saved the draft", theme: "light" },
    truecolor,
  );
  assertEquals(light, `${ESC}[38;2;46;46;46m✓${ESC}[0m Saved the draft`);
  assertEquals(
    renderLeadLine({ text: "Preflight", theme: "light" }, truecolor),
    `${ESC}[38;2;18;18;18m▲${ESC}[0m ${ESC}[1;38;2;33;33;33mPREFLIGHT${ESC}[0m`,
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
    "▲ RELEASE\n  CHECKS",
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
    `${ESC}[1;38;2;229;229;229mDone${ESC}[0m`,
  );
  assertEquals(
    styleSemanticText("Done", { tone: "success", theme: "light" }, truecolor),
    `${ESC}[38;2;46;46;46mDone${ESC}[0m`,
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
