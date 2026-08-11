import { assertEquals } from "@std/assert";
import { styleText } from "../../src/cli/ansi.ts";
import { badgeCliExamples, renderBadgeCli } from "../../src/cli/mod.ts";
import { terminalThemes, terminalToneColor } from "../../src/cli/theme.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";

Deno.test("Badge renders exact truecolour, 256, 16, and no-colour frames", () => {
  const plaintext = "[● Active]";
  const theme = terminalThemes.dark;
  for (const colorDepth of ["truecolor", "ansi256", "ansi16"] as const) {
    const capabilities = testCapabilities({ colorDepth, columns: 20 });
    assertExactFrame(
      renderBadgeCli({ label: "Active", dot: true }, capabilities),
      styleText(
        plaintext,
        {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        },
        capabilities,
      ),
      capabilities,
    );
  }
  const none = testCapabilities({ columns: 20 });
  assertExactFrame(
    renderBadgeCli({ label: "Active", dot: true }, none),
    plaintext,
    none,
  );
});

Deno.test("Badge truncates at narrow widths and degrades intentionally to ASCII", () => {
  const narrow = testCapabilities({ columns: 8 });
  assertExactFrame(
    renderBadgeCli({ label: "Deployment", dot: true }, narrow),
    "[● Dep…]",
    narrow,
  );
  const ascii = testCapabilities({ columns: 8, unicode: false });
  assertExactFrame(
    renderBadgeCli({ label: "Deployment", dot: true }, ascii),
    "[* Dep.]",
    ascii,
  );
  const bounded = testCapabilities({ columns: 40 });
  assertExactFrame(
    renderBadgeCli({ label: "Deployments", maxWidth: 12 }, bounded),
    "[Deploymen…]",
    bounded,
  );
});

Deno.test("Badge catalogue examples all render through the public CLI export", () => {
  const capabilities = testCapabilities({ columns: 20 });
  assertEquals(
    badgeCliExamples.map((example) =>
      renderBadgeCli(example.props, capabilities)
    ),
    ["[● Active]", "[Queued]", "[● Passed]", "[● Review]", "[● Failed]"],
  );
});
