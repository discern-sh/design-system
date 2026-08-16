/**
 * Pure terminal renderer and deterministic example states for Paragraph.
 *
 * @module
 */

import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  type SemanticInlineContent,
  wrapSemanticInlineContent,
} from "../../../cli/semantic-inline.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";

/** Inputs accepted by the terminal Paragraph renderer. */
export interface ParagraphCliProps {
  /** Package-owned rich inline semantics; plain text is a shorthand. */
  readonly content: SemanticInlineContent;
  /** Terminal Theme variant; defaults to dark. */
  readonly theme?: TerminalThemeVariant;
  /** Maximum paragraph measure in cells, bounded by terminal columns. */
  readonly maxWidth?: number;
}

/** Deterministic Paragraph states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ParagraphCliProps>[] = [
  {
    name: "rich-inline",
    props: {
      content: [
        "A paragraph can carry ",
        { kind: "strong", content: "clear emphasis" },
        ", ",
        { kind: "emphasis", content: "supporting nuance" },
        ", ",
        { kind: "code", text: "measure: 68" },
        ", and ",
        {
          kind: "link",
          label: "a stable reference",
          destination: "https://example.test/reference",
        },
        ". ",
        {
          kind: "image",
          alt: "Measured line diagram",
          source: "https://example.test/diagram.png",
        },
        " ",
        { kind: "footnote-reference", identifier: "measure" },
      ],
    },
  },
] as const;

/**
 * Render one rich semantic paragraph without owning a surrounding blank-line
 * boundary.
 */
const renderParagraphCli: CliRenderer<ParagraphCliProps> = (
  props,
  capabilities,
) => {
  const requested = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requested) || requested < 1) {
    throw new TypeError(
      `paragraph width must be a positive safe integer; received ${requested}`,
    );
  }
  return wrapSemanticInlineContent(
    props.content,
    requested,
    capabilities,
    props.theme === undefined ? {} : { theme: props.theme },
  ).join("\n");
};

export default renderParagraphCli;
