import { renderStyledSpans, styleText } from "../../src/cli/ansi.ts";
import {
  renderGlossaryTermCli,
  renderKbdCli,
  renderPagerCli,
} from "../../src/cli/mod.ts";
import { measureText } from "../../src/cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import { assertExactFrame, testCapabilities } from "./helpers.ts";

const glossaryTermProps = {
  term: "capability",
  definition: "A terminal feature supplied explicitly to a pure renderer.",
} as const;

Deno.test("Glossary term renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "capability — A terminal\n             feature\n             supplied\n             explicitly\n             to a pure\n             renderer.",
    ],
    [
      52,
      "capability — A terminal feature supplied explicitly\n             to a pure renderer.",
    ],
    [
      96,
      "capability — A terminal feature supplied explicitly to a pure renderer.",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderGlossaryTermCli(glossaryTermProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderGlossaryTermCli(glossaryTermProps, ascii),
    "capability - A terminal\n             feature\n             supplied\n             explicitly\n             to a pure\n             renderer.",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const first = renderStyledSpans([
      {
        text: "capability",
        style: {
          ...theme.typography.strong,
          color: terminalToneColor(theme, "accent"),
          underline: true,
        },
      },
      { text: " — A terminal feature supplied explicitly" },
    ], capabilities);
    const expected = `${first}\n             to a pure renderer.`;
    assertExactFrame(
      renderGlossaryTermCli(glossaryTermProps, capabilities),
      expected,
      capabilities,
    );
  }
});

Deno.test("Kbd renders exact width, ASCII, and colour frames", () => {
  for (const columns of [24, 52, 96]) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderKbdCli({ label: "Ctrl+K" }, capabilities),
      "[ Ctrl+K ]",
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderKbdCli({ label: "Ctrl+K" }, ascii),
    "[ Ctrl+K ]",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const expected = styleText("[ Ctrl+K ]", {
      ...theme.typography.strong,
      color: terminalThemeColor(theme, "--discern-color-ink"),
    }, capabilities);
    assertExactFrame(
      renderKbdCli({ label: "Ctrl+K" }, capabilities),
      expected,
      capabilities,
    );
  }
});

const pagerProps = {
  previous: { label: "Capabilities", href: "/cli/capabilities" },
  next: { label: "Components", href: "/cli/components" },
} as const;

Deno.test("Pager renders exact width, ASCII, and colour frames", () => {
  const previous = "← Previous: Capabilities";
  const next = "Next: Components →";
  for (const columns of [24, 52, 96]) {
    const capabilities = testCapabilities({ columns });
    const gap = columns - measureText(previous) - measureText(next);
    const expected = gap >= 2
      ? `${previous}${" ".repeat(gap)}${next}`
      : `${previous}\n${next}`;
    assertExactFrame(
      renderPagerCli(pagerProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderPagerCli(pagerProps, ascii),
    "<- Previous: Capabiliti.\nNext: Components ->",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    const link = (value: string) =>
      styleText(value, {
        ...theme.typography.strong,
        color: terminalToneColor(theme, "accent"),
      }, capabilities);
    const gap = " ".repeat(52 - measureText(previous) - measureText(next));
    assertExactFrame(
      renderPagerCli(pagerProps, capabilities),
      `${link(previous)}${gap}${link(next)}`,
      capabilities,
    );
  }
});
