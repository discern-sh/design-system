import { styleText } from "../../src/cli/ansi.ts";
import { renderBox } from "../../src/cli/box.ts";
import {
  renderBylineCli,
  renderMentionCli,
  renderProfileCardCli,
} from "../../src/cli/mod.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const bylineProps = {
  authors: [{ name: "Ada Osei" }, { name: "June Park" }],
  meta: ["11 August 2026", "8 min read"],
} as const;

Deno.test("Byline renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [24, "By [AO] Ada Osei & [JP]\nJune Park\n11 August 2026 · 8 min\nread"],
    [52, "By [AO] Ada Osei & [JP] June Park\n11 August 2026 · 8 min read"],
    [96, "By [AO] Ada Osei & [JP] June Park · 11 August 2026 · 8 min read"],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderBylineCli(bylineProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderBylineCli(bylineProps, ascii),
    "By [AO] Ada Osei & [JP]\nJune Park\n11 August 2026 | 8 min\nread",
    ascii,
  );
  const theme = terminalThemes.dark;
  const plain =
    "By [AO] Ada Osei & [JP] June Park\n11 August 2026 · 8 min read";
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = styleText(plain, {
      ...theme.typography.strong,
      color: terminalThemeColor(theme, "--discern-color-ink"),
    }, capabilities);
    assertExactFrame(
      renderBylineCli(bylineProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const mentionProps = {
  name: "Ada Osei",
  avatar: true,
  href: "/people/ada",
} as const;

Deno.test("Mention renders exact width, ASCII, and colour frames", () => {
  for (const columns of [24, 52, 96]) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderMentionCli(mentionProps, capabilities),
      "[AO] Ada Osei",
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderMentionCli(mentionProps, ascii),
    "[AO] Ada Osei",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = styleText("[AO] Ada Osei", {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
      underline: true,
    }, capabilities);
    assertExactFrame(
      renderMentionCli(mentionProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const profileCardProps = {
  name: "Ada Osei",
  detail: "Research",
  bio: "Turns field evidence into the questions a roadmap has to answer.",
  links: [{ label: "Field notes", href: "/people/ada/notes" }],
} as const;

const profileBody =
  "[AO] Ada Osei\nResearch\n\nTurns field evidence into the questions a roadmap has to answer.\n\nField notes: /people/ada/notes";

Deno.test("Profile card renders exact width, ASCII, and colour frames", () => {
  const theme = terminalThemes.dark;
  for (const columns of [24, 52, 96]) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderProfileCardCli(profileCardProps, capabilities),
      renderBox({
        title: "Profile",
        body: profileBody,
        width: columns,
        borderStyle: {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        },
      }, capabilities),
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderProfileCardCli(profileCardProps, ascii),
    "+ Profile -------------+\n| [AO] Ada Osei        |\n| Research             |\n|                      |\n| Turns field evidence |\n| into the questions a |\n| roadmap has to       |\n| answer.              |\n|                      |\n| Field notes:         |\n| /people/ada/notes    |\n+----------------------+",
    ascii,
  );
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = renderBox({
      title: "Profile",
      body: profileBody,
      width: 52,
      borderStyle: {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      },
    }, capabilities);
    assertExactFrame(
      renderProfileCardCli(profileCardProps, capabilities),
      expected,
      capabilities,
    );
  }
});
