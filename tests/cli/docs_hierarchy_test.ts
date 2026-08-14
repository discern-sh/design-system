import { styleText } from "../../src/cli/ansi.ts";
import { assertEquals, assertThrows } from "@std/assert";
import type { TerminalCapabilities } from "../../src/cli/capabilities.ts";
import {
  renderAnchorHeadingCli,
  renderDocsHeaderCli,
  renderDocsNavCli,
} from "../../src/cli/mod.ts";
import {
  terminalThemeColor,
  terminalThemes,
  terminalToneColor,
} from "../../src/cli/theme.ts";
import { renderTriangleSectionRule } from "../../src/cli/triangles.ts";
import {
  assertExactFrame,
  testTerminalCapabilities,
} from "../../src/cli/interactive/testing.ts";

const anchorHeadingProps = {
  id: "renderer-contract",
  text: "Renderer contract",
  level: 2,
} as const;

Deno.test("Anchor heading renders exact width, ASCII, and colour frames", () => {
  for (const columns of [24, 52, 96]) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderAnchorHeadingCli(anchorHeadingProps, capabilities),
      `\n${
        renderTriangleSectionRule(
          "## Renderer contract",
          { width: columns },
          capabilities,
        )
      }`,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderAnchorHeadingCli(anchorHeadingProps, ascii),
    `\n${
      renderTriangleSectionRule(
        "## Renderer contract",
        { width: 24 },
        ascii,
      )
    }`,
    ascii,
  );
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    assertExactFrame(
      renderAnchorHeadingCli(anchorHeadingProps, capabilities),
      `\n${
        renderTriangleSectionRule(
          "## Renderer contract",
          { width: 52 },
          capabilities,
        )
      }`,
      capabilities,
    );
  }
});

Deno.test("Anchor heading exposes every public section-boundary treatment", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  for (const treatment of ["embedded", "underline", "sandwich"] as const) {
    assertEquals(
      renderAnchorHeadingCli(
        {
          ...anchorHeadingProps,
          treatment,
          leadingBlankLines: 0,
        },
        capabilities,
      ),
      renderTriangleSectionRule(
        "## Renderer contract",
        { width: 32, treatment },
        capabilities,
      ),
    );
  }
});

Deno.test("Anchor heading shares the validated default heading boundary", () => {
  const capabilities = testTerminalCapabilities({ columns: 32 });
  const render = renderAnchorHeadingCli as unknown as (
    props: {
      readonly id: string;
      readonly text: string;
      readonly leadingBlankLines?: number;
    },
    capabilities: TerminalCapabilities,
  ) => string;
  const defaults = render({ id: "boundary", text: "Boundary" }, capabilities);
  assertEquals(defaults[0], "\n");
  assertEquals(
    render({
      id: "boundary",
      text: "Boundary",
      leadingBlankLines: 0,
    }, capabilities)[0],
    "━",
  );
  assertThrows(
    () =>
      render({
        id: "boundary",
        text: "Boundary",
        leadingBlankLines: -1,
      }, capabilities),
    TypeError,
    "leading blank lines",
  );
});

const docsHeaderProps = {
  brand: "discern docs",
  middle: "Design system / CLI rendering",
  actions: ["Search", "Theme"],
} as const;

Deno.test("Docs header renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [
      24,
      "Design system / CLI\nrendering\nActions: Search · Theme",
    ],
    [
      52,
      "Design system / CLI rendering\nActions: Search · Theme",
    ],
    [
      96,
      "Design system / CLI rendering\nActions: Search · Theme",
    ],
  ] as const;
  for (const [columns, context] of frames) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderDocsHeaderCli(docsHeaderProps, capabilities),
      `${
        renderTriangleSectionRule(
          "discern docs",
          { width: columns },
          capabilities,
        )
      }\n${context}`,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderDocsHeaderCli(docsHeaderProps, ascii),
    `${
      renderTriangleSectionRule(
        "discern docs",
        { width: 24 },
        ascii,
      )
    }\nDesign system / CLI\nrendering\nActions: Search | Theme`,
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const rule = renderTriangleSectionRule(
      "discern docs",
      { width: 52 },
      capabilities,
    );
    const actions = styleText("Actions: Search · Theme", {
      ...theme.typography.annotation,
      color: terminalThemeColor(theme, "--discern-color-ink-muted"),
    }, capabilities);
    assertExactFrame(
      renderDocsHeaderCli(docsHeaderProps, capabilities),
      `${rule}\nDesign system / CLI rendering\n${actions}`,
      capabilities,
    );
  }
});

const docsNavProps = {
  sections: [
    {
      title: "Foundations",
      items: [
        { label: "Capabilities", href: "/cli/capabilities" },
        { label: "Text layout", href: "/cli/text", current: true },
      ],
    },
    {
      title: "Components",
      items: [{ label: "Editorial", href: "/cli/editorial" }],
    },
  ],
} as const;

Deno.test("Docs nav renders exact width, ASCII, and colour frames", () => {
  const unicode =
    "Section navigation\n\nFOUNDATIONS\n  ├─ Capabilities\n▶ └─ Text layout\n\nCOMPONENTS\n  └─ Editorial";
  for (const columns of [24, 52, 96]) {
    const capabilities = testTerminalCapabilities({ columns });
    assertExactFrame(
      renderDocsNavCli(docsNavProps, capabilities),
      unicode,
      capabilities,
    );
  }
  const ascii = testTerminalCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderDocsNavCli(docsNavProps, ascii),
    "Section navigation\n\nFOUNDATIONS\n  +- Capabilities\n> \\- Text layout\n\nCOMPONENTS\n  \\- Editorial",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testTerminalCapabilities({ columns: 52, colorDepth });
    const heading = styleText("Section navigation", {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
    const section = (label: string) =>
      styleText(label, {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      }, capabilities);
    const current = styleText("▶ └─ Text layout", {
      ...theme.typography.strong,
      color: terminalToneColor(theme, "accent"),
    }, capabilities);
    const expected = `${heading}\n\n${
      section("FOUNDATIONS")
    }\n  ├─ Capabilities\n${current}\n\n${
      section("COMPONENTS")
    }\n  └─ Editorial`;
    assertExactFrame(
      renderDocsNavCli(docsNavProps, capabilities),
      expected,
      capabilities,
    );
  }
});
