import { renderStyledSpans, styleText } from "../../src/cli/ansi.ts";
import {
  renderArticleHeaderCli,
  renderArticleLayoutCli,
  renderProseCli,
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

const articleHeaderProps = {
  eyebrow: "Field notes",
  title: "Designing for the reading path",
  standfirst: "A calm hierarchy keeps evidence close to the argument.",
  authors: [{ name: "Ada Osei", role: "Research" }],
  meta: ["8 min read", "11 August 2026"],
} as const;

Deno.test("Article header renders exact narrow, standard, and wide frames", () => {
  const frames = [
    [
      24,
      "FIELD NOTES\n\nDesigning for the\nreading path\n\nA calm hierarchy keeps\nevidence close to the\nargument.\n\n[AO] Ada Osei — Research\n\n8 min read · 11 August\n2026",
    ],
    [
      52,
      "FIELD NOTES\n\nDesigning for the reading path\n\nA calm hierarchy keeps evidence close to the\nargument.\n\n[AO] Ada Osei — Research\n\n8 min read · 11 August 2026",
    ],
    [
      96,
      "FIELD NOTES\n\nDesigning for the reading path\n\nA calm hierarchy keeps evidence close to the argument.\n\n[AO] Ada Osei — Research\n\n8 min read · 11 August 2026",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderArticleHeaderCli(articleHeaderProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderArticleHeaderCli(articleHeaderProps, ascii),
    "FIELD NOTES\n\nDesigning for the\nreading path\n\nA calm hierarchy keeps\nevidence close to the\nargument.\n\n[AO] Ada Osei - Research\n\n8 min read | 11 August\n2026",
    ascii,
  );
});

Deno.test("Article header degrades exactly across terminal colour levels", () => {
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const expected = [
      styleText("FIELD NOTES", {
        ...theme.typography.annotation,
        color: terminalToneColor(theme, "accent"),
      }, capabilities),
      styleText("Designing for the reading path", {
        ...theme.typography.display,
        color: terminalThemeColor(theme, "--discern-color-ink"),
      }, capabilities),
      styleText("A calm hierarchy keeps evidence close to the\nargument.", {
        ...theme.typography.emphasis,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities),
      "[AO] Ada Osei — Research",
      styleText("8 min read · 11 August 2026", {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities),
    ].join("\n\n");
    assertExactFrame(
      renderArticleHeaderCli(articleHeaderProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const articleLayoutProps = {
  navigation: "01 Context\n02 Decision",
  body: "The main reading column stays first in the terminal flow.",
  rail: "Updated 11 August",
} as const;

Deno.test("Article layout renders exact width and capability frames", () => {
  const frames = [
    [
      24,
      "[Article navigation]\n01 Context\n02 Decision\n\nThe main reading column\nstays first in the\nterminal flow.\n\n[Article context]\nUpdated 11 August",
    ],
    [
      52,
      "[Article navigation]\n01 Context\n02 Decision\n\nThe main reading column stays first in the terminal\nflow.\n\n[Article context]\nUpdated 11 August",
    ],
    [
      96,
      "[Article navigation]\n01 Context\n02 Decision\n\nThe main reading column stays first in the terminal flow.\n\n[Article context]\nUpdated 11 August",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderArticleLayoutCli(articleLayoutProps, capabilities),
      expected,
      capabilities,
    );
  }
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const label = (value: string) =>
      styleText(value, {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      }, capabilities);
    const expected = `${
      label("[Article navigation]")
    }\n01 Context\n02 Decision\n\nThe main reading column stays first in the terminal\nflow.\n\n${
      label("[Article context]")
    }\nUpdated 11 August`;
    assertExactFrame(
      renderArticleLayoutCli(articleLayoutProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const proseProps = {
  text:
    "Good long-form design gives the first paragraph enough presence to open the argument.\n\nThe rest settles into a calm reading measure.",
  lead: true,
  dropCap: true,
} as const;

Deno.test("Prose renders exact measured width and capability frames", () => {
  const frames = [
    [
      24,
      "Good long-form design\ngives the first\nparagraph enough\npresence to open the\nargument.\n\nThe rest settles into a\ncalm reading measure.",
    ],
    [
      52,
      "Good long-form design gives the first paragraph\nenough presence to open the argument.\n\nThe rest settles into a calm reading measure.",
    ],
    [
      96,
      "Good long-form design gives the first paragraph enough presence to\nopen the argument.\n\nThe rest settles into a calm reading measure.",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderProseCli(proseProps, capabilities),
      expected,
      capabilities,
    );
  }
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const first = renderStyledSpans([
      {
        text: "G",
        style: {
          ...theme.typography.display,
          color: terminalThemeColor(theme, "--discern-color-accent-700"),
        },
      },
      {
        text: "ood long-form design gives the first paragraph",
        style: theme.typography.emphasis,
      },
    ], capabilities);
    const expected =
      `${first}\nenough presence to open the argument.\n\nThe rest settles into a calm reading measure.`;
    assertExactFrame(
      renderProseCli(proseProps, capabilities),
      expected,
      capabilities,
    );
  }
});
