/**
 * Pure terminal renderer and deterministic example states for List.
 *
 * @module
 */

import { stripAnsi } from "../../../cli/ansi.ts";
import {
  type CliBlock,
  renderCliBlocks,
} from "../../../cli/block-composition.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { composeCliBlocks } from "../../../cli/rhythm.ts";
import {
  renderSemanticInlineContent,
  type SemanticInlineContent,
  semanticInlineText,
} from "../../../cli/semantic-inline.ts";
import {
  measureText,
  wrapStyledTextPreservingIndent,
} from "../../../cli/text.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import type { ListKind, ListSpacing } from "./list.types.ts";

/** One framework-neutral terminal List item. */
export interface ListCliItem {
  /** Package-owned rich inline semantics that open the item. */
  readonly content?: SemanticInlineContent;
  /** Read-only task state; omit for an ordinary item inside a task list. */
  readonly checked?: boolean;
  /** Re-renderable continuation paragraphs or nested structural Components. */
  readonly blocks?: readonly CliBlock[];
}

/** Inputs accepted by the terminal List renderer. */
export interface ListCliProps {
  /** Semantic list form; defaults to unordered. */
  readonly kind?: ListKind;
  /** First ordinal for an ordered list. */
  readonly start?: number;
  /** Semantic items in document order. */
  readonly items: readonly ListCliItem[];
  /** Vertical rhythm between items and their continuation blocks. */
  readonly spacing?: ListSpacing;
  /** Terminal Theme variant; defaults to dark. */
  readonly theme?: TerminalThemeVariant;
  /** Maximum list measure in cells, bounded by terminal columns. */
  readonly maxWidth?: number;
}

const MINIMUM_LIST_WIDTH = 5;

function assertListShape(props: Readonly<ListCliProps>): void {
  const kind = props.kind ?? "unordered";
  if (kind !== "unordered" && kind !== "ordered" && kind !== "task") {
    throw new TypeError(`unknown list kind: ${kind}`);
  }
  const spacing = props.spacing ?? "tight";
  if (spacing !== "tight" && spacing !== "loose") {
    throw new TypeError(`unknown list spacing: ${spacing}`);
  }
  if (!Array.isArray(props.items) || props.items.length === 0) {
    throw new TypeError("list requires at least one item");
  }
  if (props.start !== undefined) {
    if (kind !== "ordered") {
      throw new TypeError("list start is available only for ordered lists");
    }
    if (!Number.isSafeInteger(props.start)) {
      throw new TypeError(
        `ordered list start must be a safe integer; received ${props.start}`,
      );
    }
  }
  if (
    kind === "ordered" &&
    !Number.isSafeInteger((props.start ?? 1) + (props.items.length - 1))
  ) {
    throw new TypeError("ordered list range must use safe integers");
  }
  for (const [index, item] of props.items.entries()) {
    if (typeof item !== "object" || item === null || Array.isArray(item)) {
      throw new TypeError(`list item ${index + 1} must be an object`);
    }
    if (
      item.checked !== undefined &&
      typeof item.checked !== "boolean"
    ) {
      throw new TypeError(
        `list item ${index + 1} checked state must be boolean`,
      );
    }
    if (kind !== "task" && kind !== "ordered" && item.checked !== undefined) {
      throw new TypeError(
        `list item ${index + 1} carries task state outside a task list`,
      );
    }
    if (item.blocks !== undefined && !Array.isArray(item.blocks)) {
      throw new TypeError(`list item ${index + 1} blocks must be an array`);
    }
    if (
      item.content !== undefined &&
      semanticInlineText(item.content).trim() === ""
    ) {
      throw new TypeError(`list item ${index + 1} content must be non-empty`);
    }
  }
}

function listWidth(
  requested: number | undefined,
  capabilities: { readonly columns: number },
): number {
  const desired = requested ?? capabilities.columns;
  if (!Number.isSafeInteger(desired) || desired < MINIMUM_LIST_WIDTH) {
    throw new TypeError(
      `list width must be a safe integer of at least ${MINIMUM_LIST_WIDTH}; received ${desired}`,
    );
  }
  if (
    !Number.isSafeInteger(capabilities.columns) ||
    capabilities.columns < MINIMUM_LIST_WIDTH
  ) {
    throw new TypeError(
      `terminal columns must be a safe integer of at least ${MINIMUM_LIST_WIDTH}; received ${capabilities.columns}`,
    );
  }
  return Math.min(desired, capabilities.columns);
}

function markerFor(
  kind: ListKind,
  item: ListCliItem,
  ordinal: number,
  unicode: boolean,
): string {
  if (kind === "ordered") {
    if (item.checked === undefined) return `${ordinal}.`;
    const task = item.checked ? unicode ? "☑" : "[x]" : unicode ? "☐" : "[ ]";
    return `${ordinal}. ${task}`;
  }
  if (kind === "task" && item.checked !== undefined) {
    if (item.checked) return unicode ? "☑" : "[x]";
    return unicode ? "☐" : "[ ]";
  }
  return unicode ? "•" : "*";
}

function indentBlock(value: string, indent: number): string {
  const padding = " ".repeat(indent);
  return value.split("\n").map((line) => line === "" ? "" : `${padding}${line}`)
    .join("\n");
}

/** Render a width-bounded semantic list with stable hanging indentation. */
const renderListCli: CliRenderer<ListCliProps> = (props, capabilities) => {
  assertListShape(props);
  const kind = props.kind ?? "unordered";
  const spacing = props.spacing ?? "tight";
  const width = listWidth(props.maxWidth, capabilities);
  const start = props.start ?? 1;
  const markers = props.items.map((item, index) =>
    markerFor(kind, item, start + index, capabilities.unicode)
  );
  const markerWidth = Math.max(...markers.map(measureText));
  const contentIndent = markerWidth + 1;
  if (contentIndent >= width) {
    throw new TypeError(
      `list marker needs ${contentIndent + 1} cells at width ${width}`,
    );
  }
  const contentWidth = width - contentIndent;
  const items = props.items.map((item, index) => {
    const marker = markers[index];
    if (marker === undefined) {
      throw new Error("list marker alignment desynchronised from its items");
    }
    const prefix = `${marker}${
      " ".repeat(markerWidth - measureText(marker) + 1)
    }`;
    const introduction = item.content === undefined
      ? prefix.trimEnd()
      : (() => {
        const rendered = renderSemanticInlineContent(
          item.content,
          capabilities,
          props.theme === undefined ? {} : { theme: props.theme },
        );
        if (stripAnsi(rendered).trim() === "") {
          throw new TypeError(
            `list item ${index + 1} content must be non-empty`,
          );
        }
        return wrapStyledTextPreservingIndent(rendered, contentWidth).map(
          (line, lineIndex) =>
            line === ""
              ? ""
              : `${
                lineIndex === 0 ? prefix : " ".repeat(contentIndent)
              }${line}`,
        ).join("\n");
      })();
    if (item.blocks === undefined || item.blocks.length === 0) {
      return introduction;
    }
    const continuations = indentBlock(
      renderCliBlocks(item.blocks, capabilities, { maxWidth: contentWidth }),
      contentIndent,
    );
    return spacing === "loose"
      ? composeCliBlocks([introduction, continuations])
      : `${introduction}\n${continuations}`;
  });
  return spacing === "loose" ? composeCliBlocks(items) : items.join("\n");
};

/** Deterministic List states rendered by the CLI catalogue. */
export const cliExamples: readonly CliExample<ListCliProps>[] = [
  {
    name: "ordered-rich",
    props: {
      kind: "ordered",
      start: 9,
      spacing: "loose",
      items: [
        {
          content: [
            "Keep ",
            { kind: "strong", content: "meaning" },
            " with the item.",
          ],
        },
        {
          content: [
            "Retain ",
            { kind: "link", label: "the reference", destination: "#list" },
            ".",
          ],
        },
      ],
    },
  },
  {
    name: "task-mixed",
    props: {
      kind: "task",
      items: [
        { content: "Reviewed source material", checked: true },
        { content: "Verify the final frame", checked: false },
        { content: "Context without task state" },
      ],
    },
  },
] as const;

export default renderListCli;
