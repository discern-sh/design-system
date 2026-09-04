import { assert, assertEquals, assertStringIncludes } from "@std/assert";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { stripAnsi, styleText } from "../src/cli/ansi.ts";
import type {
  TerminalCapabilities,
  TerminalColorDepth,
} from "../src/cli/capabilities.ts";
import { projectTerminalSpans } from "../src/cli/projection.ts";
import {
  resolveTerminalTheme,
  type TerminalSemanticTone,
  terminalToneColor,
} from "../src/cli/theme.ts";
import {
  projectTerminalAppearanceScope,
  terminalAppearanceScopeBadges,
  terminalAppearanceScopeCases,
  TerminalAppearanceScopes,
} from "../catalogue/pages/foundations/terminal-appearance-scopes.tsx";

function capabilities(
  colorDepth: TerminalColorDepth,
  unicode = true,
): TerminalCapabilities {
  return {
    ansiControl: true,
    colorDepth,
    columns: 80,
    hyperlinks: false,
    unicode,
  };
}

Deno.test("terminal scope diagnostic mirrors all three browser directions", () => {
  assertEquals(
    terminalAppearanceScopeCases.map((definition) => ({
      id: definition.id,
      parent: definition.parentAppearance,
      local: definition.localAppearance,
    })),
    [
      {
        id: "mono-to-accent-255",
        parent: {},
        local: { accent: 255 },
      },
      {
        id: "accent-120-to-mono",
        parent: { accent: 120 },
        local: {},
      },
      {
        id: "accent-245-to-accent-335",
        parent: { accent: 245 },
        local: { accent: 335 },
      },
    ],
  );
});

Deno.test("terminal local appearance overrides preserve every text and glyph witness", () => {
  for (const theme of ["light", "dark"] as const) {
    for (const unicode of [true, false]) {
      for (const definition of terminalAppearanceScopeCases) {
        const projection = projectTerminalAppearanceScope(
          definition,
          theme,
          capabilities("none", unicode),
        );
        assertEquals(projection.parentOutput, projection.localOutput);
        assertEquals(stripAnsi(projection.localOutput), projection.localOutput);
        assertStringIncludes(projection.localOutput, "Changed:");
        assertStringIncludes(projection.localOutput, unicode ? "◇" : "*");
        for (const { label } of terminalAppearanceScopeBadges) {
          assertStringIncludes(projection.localOutput, label);
        }
      }
    }
  }
});

function projectedTone(
  tone: TerminalSemanticTone,
  presentation: Parameters<typeof resolveTerminalTheme>[0],
  terminal: TerminalCapabilities,
) {
  const palette = resolveTerminalTheme(presentation);
  const expected = projectTerminalSpans(
    styleText("witness", { color: terminalToneColor(palette, tone) }, terminal),
  )[0];
  assert(expected?.style?.color !== undefined);
  return expected.style.color;
}

Deno.test("terminal scope frames use the public palette at every colour depth", () => {
  for (
    const colorDepth of ["truecolor", "ansi256", "ansi16"] as const
  ) {
    for (const unicode of [true, false]) {
      const terminal = capabilities(colorDepth, unicode);
      for (const theme of ["light", "dark"] as const) {
        for (const definition of terminalAppearanceScopeCases) {
          const projection = projectTerminalAppearanceScope(
            definition,
            theme,
            terminal,
          );
          for (
            const [output, presentation] of [
              [projection.parentOutput, projection.parentPresentation],
              [projection.localOutput, projection.localPresentation],
            ] as const
          ) {
            const spans = projectTerminalSpans(output);
            for (const { label, tone } of terminalAppearanceScopeBadges) {
              const actual = spans.find((span) => span.text.includes(label));
              assert(
                actual?.style?.color !== undefined,
                `${label}/${colorDepth}/${unicode ? "unicode" : "ascii"}`,
              );
              assertEquals(
                actual.style.color,
                projectedTone(tone, presentation, terminal),
                `${definition.id}/${theme}/${colorDepth}/${label}/${
                  unicode ? "unicode" : "ascii"
                }`,
              );
            }
          }
        }
      }
    }
  }
});

Deno.test("Appearance page diagnostic exposes the resolved ground and local boundaries", () => {
  const markup = renderToStaticMarkup(
    createElement(TerminalAppearanceScopes, { theme: "light" }),
  );
  assertStringIncludes(markup, 'id="terminal-appearance-scopes"');
  for (const definition of terminalAppearanceScopeCases) {
    assertStringIncludes(
      markup,
      `data-discern-terminal-scope-demo="${definition.id}"`,
    );
  }
  assertEquals(
    [...markup.matchAll(/data-discern-terminal-ground="light"/g)].length,
    terminalAppearanceScopeCases.length * 2,
  );
});
