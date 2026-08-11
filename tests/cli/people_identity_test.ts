import { renderStyledSpans, styleText } from "../../src/cli/ansi.ts";
import {
  renderAvatarCli,
  renderAvatarGroupCli,
  renderPersonaCli,
} from "../../src/cli/mod.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";

const avatarProps = { name: "Ada Osei", presence: "online" } as const;

Deno.test("Avatar renders exact width, ASCII, and colour frames", () => {
  for (const columns of [24, 52, 96]) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderAvatarCli(avatarProps, capabilities),
      "(AO) ● online",
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(renderAvatarCli(avatarProps, ascii), "(AO) * online", ascii);
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const expected = renderStyledSpans([
      {
        text: "(AO)",
        style: {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        },
      },
      { text: " " },
      { text: "●", style: { color: terminalToneColor(theme, "success") } },
      { text: " online" },
    ], capabilities);
    assertExactFrame(
      renderAvatarCli(avatarProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const avatarGroupProps = {
  label: "Review team",
  people: [
    { name: "Ada Osei" },
    { name: "June Park" },
    { name: "Tomás Vega" },
    { name: "Iris Chen" },
    { name: "Mina Shah" },
  ],
  max: 4,
} as const;

Deno.test("Avatar group renders exact width, ASCII, and colour frames", () => {
  const plain = "Review team\n[AO] [JP] [TV] [IC] [+1]";
  for (const columns of [24, 52, 96]) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderAvatarGroupCli(avatarGroupProps, capabilities),
      plain,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(renderAvatarGroupCli(avatarGroupProps, ascii), plain, ascii);
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const label = styleText("Review team", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    const chip = (value: string) =>
      styleText(value, {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      }, capabilities);
    const overflow = styleText("[+1]", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    const expected = `${label}\n${chip("[AO]")} ${chip("[JP]")} ${
      chip("[TV]")
    } ${chip("[IC]")} ${overflow}`;
    assertExactFrame(
      renderAvatarGroupCli(avatarGroupProps, capabilities),
      expected,
      capabilities,
    );
  }
});

const personaProps = {
  name: "Ada Osei",
  detail: "Research editor",
  presence: "online",
} as const;

Deno.test("Persona renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [24, "[AO] Ada Osei — Research\n     editor [online]"],
    [52, "[AO] Ada Osei — Research editor [online]"],
    [96, "[AO] Ada Osei — Research editor [online]"],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderPersonaCli(personaProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderPersonaCli(personaProps, ascii),
    "[AO] Ada Osei - Research\n     editor [online]",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const expected = renderStyledSpans([
      {
        text: "[AO]",
        style: {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
        },
      },
      { text: " Ada Osei — Research editor [online]" },
    ], capabilities);
    assertExactFrame(
      renderPersonaCli(personaProps, capabilities),
      expected,
      capabilities,
    );
  }
});
