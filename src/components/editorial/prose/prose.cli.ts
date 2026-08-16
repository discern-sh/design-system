/**
 * Pure terminal renderer and deterministic example states for Prose.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import {
  type CliBlock,
  createCliBlock,
  renderCliBlock,
} from "../../../cli/block-composition.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import type { SemanticInlineContent } from "../../../cli/semantic-inline.ts";
import { wrapText } from "../../../cli/text.ts";
import {
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
} from "../../../cli/theme.ts";
import renderListCli from "../list/list.cli.ts";
import renderParagraphCli from "../paragraph/paragraph.cli.ts";
import type { ProseMeasure } from "./prose.types.ts";

interface ProseCliOptions {
  readonly dropCap?: boolean;
  readonly lead?: boolean;
  readonly measure?: ProseMeasure;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

/** Legacy plain-text input retained byte-for-byte by Prose. */
export interface ProseTextCliProps extends ProseCliOptions {
  readonly text: string;
  readonly children?: never;
}

/** One semantic Paragraph child inside a rich terminal Prose context. */
export interface ProseCliParagraph {
  readonly kind: "paragraph";
  readonly content: SemanticInlineContent;
}

/** One already-semantic structural Component inside terminal Prose. */
export interface ProseCliBlockChild {
  readonly kind: "block";
  readonly block: CliBlock;
}

/** A semantic child accepted by the rich terminal Prose path. */
export type ProseCliChild = ProseCliParagraph | ProseCliBlockChild;

/** Rich semantic input composed at the Prose-owned reading measure. */
export interface ProseSemanticCliProps extends ProseCliOptions {
  readonly text?: never;
  readonly children: readonly ProseCliChild[];
}

/** Inputs accepted by the terminal Prose renderer. */
export type ProseCliProps = ProseTextCliProps | ProseSemanticCliProps;

/** Deterministic Prose states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ProseCliProps>[] = [
  {
    name: "lead",
    props: {
      text:
        "Good long-form design gives the first paragraph enough presence to open the argument.\n\nThe rest settles into a calm reading measure.",
      lead: true,
      dropCap: true,
    },
  },
  {
    name: "rich-blocks",
    props: {
      children: [
        {
          kind: "paragraph",
          content: [
            "A reading context keeps ",
            { kind: "strong", content: "inline meaning" },
            " beside ",
            {
              kind: "link",
              label: "its reference",
              destination: "https://example.test/reference",
            },
            ".",
          ],
        },
        {
          kind: "block",
          block: createCliBlock(renderListCli, {
            items: [
              { content: "Structural children keep their own semantics." },
              { content: "Prose supplies only measure and rhythm." },
            ],
          }),
        },
        {
          kind: "paragraph",
          content: [
            "A hard break remains intentional.",
            { kind: "hard-break" },
            "The next line stays in the same paragraph.",
          ],
        },
      ],
    },
  },
] as const;

const MEASURE_COLUMNS: Readonly<Record<ProseMeasure, number>> = {
  narrow: 48,
  default: 68,
  wide: 88,
};

function proseWidth(
  props: Readonly<ProseCliOptions>,
  capabilities: TerminalCapabilities,
): number {
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 1) {
    throw new TypeError(
      `prose width must be a positive safe integer; received ${requested}`,
    );
  }
  const measure = props.measure ?? "default";
  if (!(measure in MEASURE_COLUMNS)) {
    throw new TypeError(`unknown prose measure: ${measure}`);
  }
  return Math.min(
    requested,
    capabilities.columns,
    MEASURE_COLUMNS[measure],
  );
}

function renderPlainProse(
  text: string,
  props: Readonly<ProseCliOptions>,
  capabilities: TerminalCapabilities,
  width: number,
): string {
  if (text.trim() === "") {
    throw new TypeError("prose text must be non-empty");
  }
  const lines = wrapText(text, width);
  const theme = terminalThemes[props.theme ?? "dark"];
  if (lines.length === 0) return "";
  const first = lines[0] ?? "";
  const renderedFirst = props.dropCap === true && first !== ""
    ? renderStyledSpans([
      {
        text: first[0]?.toLocaleUpperCase() ?? "",
        style: {
          ...theme.typography.display,
          color: terminalThemeColor(theme, "--discern-color-accent-700"),
        },
      },
      {
        text: first.slice(1),
        ...(props.lead === true ? { style: theme.typography.emphasis } : {}),
      },
    ], capabilities)
    : props.lead === true
    ? styleText(first, theme.typography.emphasis, capabilities)
    : first;
  return [renderedFirst, ...lines.slice(1)].join("\n");
}

/**
 * Render plain or semantic prose at a comfortable reading measure. Lead and
 * drop-cap treatments affect the rich path only when its first child is a
 * wholly plain string Paragraph. A structural or rich-inline first child is
 * left untouched, so Prose never repaints or flattens child semantics.
 */
const renderProseCli: CliRenderer<ProseCliProps> = (props, capabilities) => {
  const hasText = typeof props.text === "string";
  const hasChildren = Array.isArray(props.children);
  if (hasText === hasChildren) {
    throw new TypeError(
      "prose requires exactly one of text or semantic children",
    );
  }
  const width = proseWidth(props, capabilities);
  if (hasText) {
    return renderPlainProse(props.text, props, capabilities, width);
  }
  const children = props.children;
  if (children.length === 0) {
    throw new TypeError("prose semantic children must be non-empty");
  }
  const blocks = children.map((child, index) => {
    if (typeof child !== "object" || child === null || Array.isArray(child)) {
      throw new TypeError(`prose child ${index + 1} must be an object`);
    }
    if (child.kind === "paragraph") {
      if (
        index === 0 && typeof child.content === "string" &&
        (props.lead === true || props.dropCap === true)
      ) {
        renderParagraphCli(
          { content: child.content, maxWidth: width },
          capabilities,
        );
        return renderPlainProse(child.content, props, capabilities, width);
      }
      return renderParagraphCli(
        {
          content: child.content,
          maxWidth: width,
          ...(props.theme === undefined ? {} : { theme: props.theme }),
        },
        capabilities,
      );
    }
    if (child.kind === "block") {
      return renderCliBlock(child.block, capabilities, { maxWidth: width });
    }
    throw new TypeError(
      `unknown prose child kind: ${String((child as { kind?: unknown }).kind)}`,
    );
  });
  return composeCliBlocks(blocks);
};

export default renderProseCli;
