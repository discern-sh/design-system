/**
 * Pure terminal renderer and deterministic example states for Code listing.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import {
  measureText,
  padText,
  truncateText,
  wrapText,
} from "../../../cli/text.ts";
import {
  type TerminalColor,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./code-listing.meta.ts";

/** Inputs accepted by the terminal Code listing renderer. */
export interface CodeListingCliProps {
  readonly title?: string;
  readonly filename?: string;
  readonly language?: string;
  readonly code: string;
  readonly highlightLines?: readonly number[];
  readonly caption?: string;
  /** Visual emphasis matching the browser listing's standard or showcase posture. */
  readonly variant?: "standard" | "showcase";
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Deterministic Code listing states rendered by the CLI catalogue. */
const example = `const brief = {
  question: "What must remain true?",
  evidence: ["tests", "proof"],
};

await prove(brief);`;

export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "standard",
      props: {
        filename: "example.ts",
        language: "TypeScript",
        code: example,
        highlightLines: [2, 3],
        caption:
          "Highlighted lines carry the decision into executable evidence.",
      },
    },
    {
      name: "showcase",
      props: {
        filename: "decision.ts",
        language: "TypeScript",
        code: example,
        highlightLines: [2, 3],
        caption: "A stable emphatic treatment for consequential source.",
        variant: "showcase",
      },
    },
  ] as const satisfies readonly CliExample<CodeListingCliProps>[],
);

function renderListingFrame(
  lines: readonly string[],
  title: string,
  width: number,
  borderColor: TerminalColor,
  capabilities: TerminalCapabilities,
): string {
  const glyphs = capabilities.unicode
    ? {
      topLeft: "┌",
      topRight: "┐",
      bottomLeft: "└",
      bottomRight: "┘",
      horizontal: "─",
      vertical: "│",
    }
    : {
      topLeft: "+",
      topRight: "+",
      bottomLeft: "+",
      bottomRight: "+",
      horizontal: "-",
      vertical: "|",
    };
  const framedTitle = title === "" ? "" : ` ${
    truncateText(
      title,
      Math.max(0, width - 6),
      capabilities.unicode ? "…" : ".",
    )
  } `;
  const border = (value: string): string =>
    styleText(value, { color: borderColor }, capabilities);
  const top = `${border(glyphs.topLeft)}${border(framedTitle)}${
    border(glyphs.horizontal.repeat(width - 2 - measureText(framedTitle)))
  }${border(glyphs.topRight)}`;
  const innerWidth = width - 4;
  const content = lines.map((line) =>
    `${border(glyphs.vertical)} ${padText(line, innerWidth)} ${
      border(glyphs.vertical)
    }`
  );
  const bottom = border(
    `${glyphs.bottomLeft}${
      glyphs.horizontal.repeat(width - 2)
    }${glyphs.bottomRight}`,
  );
  return [top, ...content, bottom].join("\n");
}

/** Render one line-numbered, width-bounded source listing without highlighting. */
const renderCodeListingCli: CliRenderer<CodeListingCliProps> = (
  props,
  capabilities,
) => {
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 9) {
    throw new TypeError(
      `code listing width must be a safe integer of at least 9; received ${requested}`,
    );
  }
  const width = Math.min(requested, capabilities.columns);
  const rawLines = props.code.trimEnd().split("\n");
  const lines = rawLines.length === 0 ? [""] : rawLines;
  const digits = String(lines.length).length;
  const innerWidth = width - 4;
  const prefixWidth = digits + 2;
  const marker = capabilities.unicode ? "›" : ">";
  const highlighted = new Set(props.highlightLines ?? []);
  const body = lines.map((line, index) => {
    const number = index + 1;
    const prefix = `${highlighted.has(number) ? marker : " "}${
      String(number).padStart(digits)
    } `;
    const code = truncateText(
      line.replaceAll("\t", "  "),
      Math.max(1, innerWidth - prefixWidth),
      capabilities.unicode ? "…" : ".",
    );
    return `${prefix}${code}`;
  }).join("\n");
  const context = props.filename ?? props.title;
  const title = [
    context,
    props.language === undefined ? undefined : `[${props.language}]`,
  ]
    .filter((value): value is string => value !== undefined)
    .join(" ");
  const theme = terminalThemes[props.theme ?? "dark"];
  const showcase = props.variant === "showcase";
  const frame = renderListingFrame(
    body.split("\n"),
    title,
    width,
    showcase
      ? terminalToneColor(theme, "accent")
      : terminalThemeColor(theme, "--discern-color-ink-faint"),
    capabilities,
  );
  if (props.caption === undefined) return frame;
  return joinVertical([
    frame,
    styleText(
      wrapText(`Caption: ${props.caption}`, width).join("\n"),
      {
        ...(showcase ? theme.typography.strong : theme.typography.annotation),
        color: showcase
          ? terminalToneColor(theme, "accent")
          : terminalThemeColor(theme, "--discern-color-ink-muted"),
      },
      capabilities,
    ),
  ]);
};

export default renderCodeListingCli;
