/**
 * Pure terminal renderer and deterministic example states for Footnotes.
 *
 * @module
 */

import { styleText } from "../../../cli/ansi.ts";
import {
  type CliBlock,
  createCliBlock,
  renderCliBlocks,
} from "../../../cli/block-composition.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { joinVertical } from "../../../cli/layout.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import {
  renderSemanticInlineContent,
  type SemanticInlineContent,
  type SemanticInlineNode,
  validateSemanticInlineContent,
} from "../../../cli/semantic-inline.ts";
import {
  measureText,
  wrapStyledTextPreservingIndent,
  wrapText,
} from "../../../cli/text.ts";
import {
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import renderBlockquoteCli from "../blockquote/blockquote.cli.ts";
import renderCodeBlockCli from "../code-block/code-block.cli.ts";
import renderListCli from "../list/list.cli.ts";
import renderParagraphCli from "../paragraph/paragraph.cli.ts";
import meta, { componentExampleVocabulary } from "./footnotes.meta.ts";

/** A structural Footnotes body made from re-renderable Component blocks. */
export interface FootnoteCliBlockContent {
  /** Discriminant separating structural content from semantic inline arrays. */
  readonly kind: "blocks";
  /** Paragraph, List, Blockquote, Code block, or other public CLI blocks. */
  readonly children: readonly CliBlock[];
}

/** Package-owned rich inline nodes or a lossless sequence of structural blocks. */
export type FootnoteCliRichContent =
  | readonly (string | SemanticInlineNode)[]
  | FootnoteCliBlockContent;

/** One safe return target for one occurrence of a footnote reference. */
export interface FootnoteCliReturnReference {
  /** Safe URL reference, normally the fragment id of one inline occurrence. */
  readonly href: string;
  /** Visible return label; otherwise the renderer derives an occurrence label. */
  readonly label?: string;
}

/** Original plain-text Footnotes item contract. */
export interface FootnoteCliLegacyItem {
  /** Stable Markdown identity. Legacy plain-string entries may omit it. */
  readonly id?: string;
  /** Plain text rendered through the byte-compatible legacy path. */
  readonly content: string;
  /** Visible unlinked return label retained on the definition line. */
  readonly returnLabel?: string;
  /** Linked returns belong to the rich item contract. */
  readonly returnReferences?: never;
}

/** Plain-text Footnotes item with one or more safe linked returns. */
export interface FootnoteCliLinkedTextItem {
  /** Stable Markdown identity shared with every inline reference. */
  readonly id: string;
  /** Plain definition text rendered through the semantic linked path. */
  readonly content: string;
  /** Default visible label for linked returns. */
  readonly returnLabel?: string;
  /** Ordered return targets, one for each reference occurrence. */
  readonly returnReferences: readonly FootnoteCliReturnReference[];
}

/** Rich Footnotes item with the stable identity a dispatcher can target. */
export interface FootnoteCliRichItem {
  /** Stable Markdown identity shared with every inline reference. */
  readonly id: string;
  /** Package-owned inline nodes or re-renderable Component blocks. */
  readonly content: FootnoteCliRichContent;
  /** Visible unlinked return label, or the default for linked returns. */
  readonly returnLabel?: string;
  /** Ordered return targets, one for each reference occurrence. */
  readonly returnReferences?: readonly FootnoteCliReturnReference[];
}

/** One legacy, linked-text, or additive rich terminal Footnotes entry. */
export type FootnoteCliItem =
  | FootnoteCliLegacyItem
  | FootnoteCliLinkedTextItem
  | FootnoteCliRichItem;

/** Inputs accepted by the terminal Footnotes renderer. */
export interface FootnotesCliProps {
  readonly title?: string;
  readonly items: readonly FootnoteCliItem[];
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
}

const richExampleParagraph = createCliBlock(
  renderParagraphCli,
  {
    content: [
      "The measured result keeps ",
      { kind: "strong", content: "its emphasis" },
      " and ",
      {
        kind: "link",
        label: "source",
        destination: "https://example.test/source",
      },
      ".",
    ],
  } as const,
);

/** Deterministic Footnotes states rendered by the CLI catalogue. */
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      name: "default",
      props: {
        items: [
          { content: "Terminal widths were measured in character cells." },
          {
            content:
              "Source labels remain plain text when links are unavailable.",
            returnLabel: "return",
          },
        ],
      },
    },
    {
      name: "rich-multi-block",
      props: {
        items: [{
          id: "measured-result",
          content: {
            kind: "blocks",
            children: [
              richExampleParagraph,
              createCliBlock(renderListCli, {
                items: [{ content: "One supporting observation." }],
              }),
              createCliBlock(renderBlockquoteCli, {
                children: [createCliBlock(renderParagraphCli, {
                  content: "The qualification remains a quotation.",
                })],
              }),
              createCliBlock(renderCodeBlockCli, {
                language: "text",
                code: "sample = complete",
              }),
            ],
          },
          returnLabel: "return",
          returnReferences: [
            { href: "#measured-result-ref-1" },
            { href: "#measured-result-ref-2" },
          ],
        }],
      },
    },
  ] as const satisfies readonly CliExample<FootnotesCliProps>[],
);

const MINIMUM_FOOTNOTES_WIDTH = 8;

function hanging(prefix: string, value: string, width: number): string {
  const lines = wrapText(value, Math.max(1, width - measureText(prefix)));
  return lines.map((line, index) =>
    `${index === 0 ? prefix : " ".repeat(measureText(prefix))}${line}`
  ).join("\n");
}

function safePlainText(
  value: string,
  context: string,
  allowLineBreaks = false,
): void {
  try {
    validateSemanticInlineContent(
      allowLineBreaks ? value.replaceAll("\n", " ") : value,
    );
  } catch (cause) {
    throw new TypeError(`${context} must be non-empty and control-free`, {
      cause,
    });
  }
}

function safeIdentifier(value: string, context: string): void {
  try {
    validateSemanticInlineContent([{
      kind: "footnote-reference",
      identifier: value,
    }]);
  } catch (cause) {
    throw new TypeError(`${context} must be a valid footnote identifier`, {
      cause,
    });
  }
}

function isBlockContent(
  content: string | FootnoteCliRichContent,
): content is FootnoteCliBlockContent {
  return typeof content === "object" && content !== null &&
    !Array.isArray(content);
}

function isRichItem(
  item: FootnoteCliItem,
): item is FootnoteCliLinkedTextItem | FootnoteCliRichItem {
  return typeof item.content !== "string" ||
    item.returnReferences !== undefined;
}

function assertItems(items: readonly FootnoteCliItem[]): void {
  if (!Array.isArray(items) || items.length === 0) {
    throw new TypeError("footnotes items must be non-empty");
  }
  const identifiers = new Set<string>();
  for (const [index, item] of items.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new TypeError(`footnotes item ${index + 1} must be an object`);
    }
    if (item.id === undefined) {
      if (isRichItem(item)) {
        throw new TypeError(
          `footnotes item ${
            index + 1
          } requires a stable id for rich content or linked returns`,
        );
      }
    } else {
      safeIdentifier(item.id, `footnotes item ${index + 1} id`);
      if (identifiers.has(item.id)) {
        throw new TypeError(
          `duplicate footnotes id ${JSON.stringify(item.id)}`,
        );
      }
      identifiers.add(item.id);
    }
    if (typeof item.content === "string") {
      safePlainText(
        item.content,
        `footnotes item ${index + 1} content`,
        true,
      );
    } else if (isBlockContent(item.content)) {
      if (
        item.content.kind !== "blocks" ||
        !Array.isArray(item.content.children) ||
        item.content.children.length === 0
      ) {
        throw new TypeError(
          `footnotes item ${
            index + 1
          } block content requires one or more CLI block children`,
        );
      }
    } else {
      validateSemanticInlineContent(item.content);
    }
    if (item.returnLabel !== undefined) {
      safePlainText(
        item.returnLabel,
        `footnotes item ${index + 1} return label`,
      );
    }
    if (
      item.returnReferences !== undefined &&
      (!Array.isArray(item.returnReferences) ||
        item.returnReferences.length === 0)
    ) {
      throw new TypeError(
        `footnotes item ${
          index + 1
        } return references must be a non-empty array`,
      );
    }
  }
}

function footnotesWidth(
  requested: number | undefined,
  capabilities: { readonly columns: number },
): number {
  const desired = requested ?? capabilities.columns;
  if (!Number.isSafeInteger(desired) || desired < MINIMUM_FOOTNOTES_WIDTH) {
    throw new TypeError(
      `footnotes width must be a safe integer of at least ${MINIMUM_FOOTNOTES_WIDTH}; received ${desired}`,
    );
  }
  if (
    !Number.isSafeInteger(capabilities.columns) ||
    capabilities.columns < MINIMUM_FOOTNOTES_WIDTH
  ) {
    throw new TypeError(
      `terminal columns must be a safe integer of at least ${MINIMUM_FOOTNOTES_WIDTH}; received ${capabilities.columns}`,
    );
  }
  return Math.min(desired, capabilities.columns);
}

function indentBlock(value: string, indent: number): string {
  const padding = " ".repeat(indent);
  return value.split("\n").map((line) => line === "" ? "" : `${padding}${line}`)
    .join("\n");
}

function hangRendered(prefix: string, value: string): string {
  const indent = measureText(prefix);
  return value.split("\n").map((line, index) =>
    line === "" ? "" : `${index === 0 ? prefix : " ".repeat(indent)}${line}`
  ).join("\n");
}

function renderRichBody(
  content: string | FootnoteCliRichContent,
  contentWidth: number,
  capabilities: Parameters<CliRenderer<FootnotesCliProps>>[1],
  theme: TerminalThemeVariant | undefined,
): string {
  if (isBlockContent(content)) {
    return renderCliBlocks(content.children, capabilities, {
      maxWidth: contentWidth,
    });
  }
  const rendered = renderSemanticInlineContent(content, capabilities, {
    baseRole: "annotation",
    ...(theme === undefined ? {} : { theme }),
  });
  return wrapStyledTextPreservingIndent(rendered, contentWidth).join("\n");
}

function renderLinkedReturns(
  item: FootnoteCliLinkedTextItem | FootnoteCliRichItem,
  contentWidth: number,
  capabilities: Parameters<CliRenderer<FootnotesCliProps>>[1],
  theme: TerminalThemeVariant | undefined,
): string {
  const references = item.returnReferences;
  const marker = capabilities.unicode ? "↩" : "<-";
  if (references === undefined) {
    if (item.returnLabel === undefined) return "";
    const content = [marker + " ", item.returnLabel] as const;
    const rendered = renderSemanticInlineContent(content, capabilities, {
      baseRole: "annotation",
      ...(theme === undefined ? {} : { theme }),
    });
    return wrapStyledTextPreservingIndent(rendered, contentWidth).join("\n");
  }
  const baseLabel = item.returnLabel ?? "return";
  return references.flatMap((reference, index) => {
    if (
      typeof reference !== "object" || reference === null ||
      Array.isArray(reference)
    ) {
      throw new TypeError(
        `footnotes return reference ${index + 1} must be an object`,
      );
    }
    const label = reference.label ??
      (references.length === 1 ? baseLabel : `${baseLabel} ${index + 1}`);
    const content = [
      `${marker} `,
      { kind: "link", label, destination: reference.href },
    ] as const satisfies SemanticInlineContent;
    const rendered = renderSemanticInlineContent(content, capabilities, {
      baseRole: "annotation",
      ...(theme === undefined ? {} : { theme }),
    });
    return wrapStyledTextPreservingIndent(rendered, contentWidth);
  }).join("\n");
}

/**
 * Render a numbered end-note section with stable hanging indentation.
 *
 * Plain-string entries without linked returns retain the original frame and
 * may omit `id`. Rich inline, structural, and linked-return entries require a
 * valid unique `id`; repeated references remain in caller order and point
 * back independently. Missing definitions are intentionally a document-level
 * concern for the future dispatcher, which owns the complete reference set.
 */
const renderFootnotesCli: CliRenderer<FootnotesCliProps> = (
  props,
  capabilities,
) => {
  assertItems(props.items);
  if (props.title !== undefined) {
    safePlainText(props.title, "footnotes title");
  }
  const width = footnotesWidth(props.maxWidth, capabilities);
  const theme = terminalThemes[props.theme ?? "dark"];
  const mark = capabilities.unicode ? "†" : "+";
  const heading = styleText(`${mark} ${props.title ?? "Notes & sources"}`, {
    ...theme.typography.strong,
    color: terminalToneColor(theme, "accent"),
  }, capabilities);
  const digits = Math.max(2, String(props.items.length).length);
  const notes = props.items.map((item, index) => {
    const prefix = `[${String(index + 1).padStart(digits, "0")}] `;
    const prefixWidth = measureText(prefix);
    if (prefixWidth >= width) {
      throw new TypeError(
        `footnotes label needs ${prefixWidth + 1} cells at width ${width}`,
      );
    }
    if (!isRichItem(item)) {
      const suffix = item.returnLabel === undefined
        ? ""
        : ` ${capabilities.unicode ? "↩" : "<-"} ${item.returnLabel}`;
      return hanging(prefix, `${item.content as string}${suffix}`, width);
    }

    const contentWidth = width - prefixWidth;
    const body = hangRendered(
      prefix,
      renderRichBody(item.content, contentWidth, capabilities, props.theme),
    );
    const returns = renderLinkedReturns(
      item,
      contentWidth,
      capabilities,
      props.theme,
    );
    return returns === ""
      ? body
      : composeCliBlocks([body, indentBlock(returns, prefixWidth)]);
  });
  return joinVertical([heading, ...notes], { spacing: 1 });
};

export default renderFootnotesCli;
