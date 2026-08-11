import { styleText } from "../../src/cli/ansi.ts";
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
import { assertExactFrame, testCapabilities } from "./helpers.ts";

const anchorHeadingProps = {
  id: "renderer-contract",
  text: "Renderer contract",
  level: 2,
} as const;

Deno.test("Anchor heading renders exact width, ASCII, and colour frames", () => {
  const frames = [
    [24, "## Renderer contr…"],
    [52, "## Renderer contract"],
    [96, "## Renderer contract"],
  ] as const;
  for (const [columns, label] of frames) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderAnchorHeadingCli(anchorHeadingProps, capabilities),
      renderTriangleSectionRule(label, { width: columns }, capabilities),
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderAnchorHeadingCli(anchorHeadingProps, ascii),
    ">v ## Renderer contr. v>",
    ascii,
  );
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
    assertExactFrame(
      renderAnchorHeadingCli(anchorHeadingProps, capabilities),
      renderTriangleSectionRule(
        "## Renderer contract",
        { width: 52 },
        capabilities,
      ),
      capabilities,
    );
  }
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
      "◮⧩◭⧨◮ discern docs ◮⧨◭⧩◮\nDesign system / CLI\nrendering\nActions: Search · Theme",
    ],
    [
      52,
      "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭ discern docs ◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮\nDesign system / CLI rendering\nActions: Search · Theme",
    ],
    [
      96,
      "◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮⧩◭⧨◮ discern docs ◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮⧨◭⧩◮\nDesign system / CLI rendering\nActions: Search · Theme",
    ],
  ] as const;
  for (const [columns, expected] of frames) {
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderDocsHeaderCli(docsHeaderProps, capabilities),
      expected,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderDocsHeaderCli(docsHeaderProps, ascii),
    ">v^<> discern docs ><^v>\nDesign system / CLI\nrendering\nActions: Search | Theme",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
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
    const capabilities = testCapabilities({ columns });
    assertExactFrame(
      renderDocsNavCli(docsNavProps, capabilities),
      unicode,
      capabilities,
    );
  }
  const ascii = testCapabilities({ columns: 24, unicode: false });
  assertExactFrame(
    renderDocsNavCli(docsNavProps, ascii),
    "Section navigation\n\nFOUNDATIONS\n  +- Capabilities\n> \\- Text layout\n\nCOMPONENTS\n  \\- Editorial",
    ascii,
  );
  const theme = terminalThemes.dark;
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16", "none"] as const
  ) {
    const capabilities = testCapabilities({ columns: 52, colorDepth });
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
