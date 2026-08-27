/**
 * Pure terminal renderer and deterministic example states for Paragraph.
 *
 * @module
 */

import { defineCliExamples } from "../../../cli/component-examples.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import {
  type SemanticInlineContent,
  wrapSemanticInlineContent,
} from "../../../cli/semantic-inline.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./paragraph.meta.ts";

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
export const cliExamples = defineCliExamples(
  meta,
  componentExampleVocabulary,
  [{
    name: "default",
    props: {
      content: [
        "A useful paragraph can combine ",
        { kind: "strong", content: "clear emphasis" },
        ", ",
        { kind: "emphasis", content: "supporting nuance" },
        ", ",
        { kind: "strikethrough", content: "superseded wording" },
        ", inline detail such as ",
        { kind: "code", text: "measure: 68" },
        ", and ",
        {
          kind: "link",
          label: "a stable reference",
          destination: "#paragraph-reference",
        },
        ".",
        {
          kind: "footnote-reference",
          identifier: "paragraph-reference",
          label: "1",
        },
      ],
    },
  }] as const satisfies readonly CliExample<ParagraphCliProps>[],
);

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
