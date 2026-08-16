/**
 * Pure terminal renderer and deterministic example states for Heading.
 *
 * @module
 */

import { renderStyledSpans } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import { withCliHeadingBoundary } from "../../../cli/heading-boundary.ts";
import {
  motifPassthrough,
  type TerminalMotifOptions,
  terminalMotifRepertoire,
} from "../../../cli/motif.ts";
import { renderMotifPattern } from "../../../cli/motifs.ts";
import {
  renderSemanticInlineContent,
  type SemanticInlineBaseRole,
  type SemanticInlineContent,
} from "../../../cli/semantic-inline.ts";
import {
  measureText,
  truncateStyledText,
  truncateText,
  wrapStyledText,
} from "../../../cli/text.ts";
import {
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "../../../cli/theme.ts";
import type { HeadingLevel } from "./heading.types.ts";

/** Width behavior for terminal Heading content. */
export type HeadingCliOverflowPolicy = "truncate" | "wrap";

/** Visual treatments available to terminal Heading callers. */
export type HeadingCliTreatment = "default" | "document";

interface HeadingCliOptions extends TerminalMotifOptions {
  readonly accent?: string;
  readonly level?: HeadingLevel;
  readonly theme?: TerminalThemeVariant;
  readonly maxWidth?: number;
  /**
   * Keep the legacy single-line allocation or wrap every content cell without
   * loss. Defaults to `truncate`; Markdown and other document compositions
   * choose `wrap` explicitly.
   */
  readonly overflow?: HeadingCliOverflowPolicy;
  /** Blank lines owned before this heading; defaults to one. */
  readonly leadingBlankLines?: number;
  /**
   * Keep source-like level markers or opt into styled document hierarchy.
   * Document treatment degrades to the default markers without colour or
   * Unicode. Defaults to `default`.
   */
  readonly treatment?: HeadingCliTreatment;
}

/** Inputs accepted by the terminal Heading renderer. */
export type HeadingCliProps =
  & HeadingCliOptions
  & (
    | {
      /** Legacy plain heading text. */
      readonly text: string;
      readonly content?: never;
    }
    | {
      /** Package-owned rich inline heading content. */
      readonly content: SemanticInlineContent;
      readonly text?: never;
    }
  );

/** Deterministic Heading states rendered by `deno task catalogue:cli heading`. */
export const cliExamples: readonly CliExample<HeadingCliProps>[] = [
  { name: "primary", props: { text: "Build with confidence", level: 1 } },
  { name: "accent", props: { text: "Rules that", accent: "travel", level: 2 } },
  { name: "minor", props: { text: "Implementation notes", level: 4 } },
  {
    name: "nested-boundary",
    props: { text: "Nested section", level: 3, leadingBlankLines: 0 },
  },
  {
    name: "lossless-rich",
    props: {
      content: [
        "A ",
        { kind: "strong", content: "complete" },
        " heading keeps ",
        {
          kind: "link",
          label: "its reference",
          destination: "#heading-reference",
        },
      ],
      level: 2,
      overflow: "wrap",
      maxWidth: 28,
      leadingBlankLines: 0,
    },
  },
  {
    name: "document-heading",
    props: {
      content: [
        "Reading ",
        { kind: "strong", content: "foundations" },
        " and ",
        { kind: "code", text: "semantic links" },
      ],
      level: 1,
      overflow: "wrap",
      treatment: "document",
      maxWidth: 36,
      leadingBlankLines: 0,
    },
  },
] as const;

function headingLines(
  content: string,
  prefix: string,
  prefixWidth: number,
  contentWidth: number,
): string {
  const lines = wrapStyledText(content, contentWidth);
  const indent = " ".repeat(prefixWidth);
  return lines.map((line, index) => {
    if (index === 0) return `${prefix}${line}`;
    return line === "" ? "" : `${indent}${line}`;
  }).join("\n");
}

function documentBaseRole(level: HeadingLevel): SemanticInlineBaseRole {
  if (level <= 2) return "display";
  if (level <= 4) return "strong";
  return level === 5 ? "emphasis" : "annotation";
}

interface DocumentHeadingOptions {
  readonly content: SemanticInlineContent;
  readonly accent: string;
  readonly level: HeadingLevel;
  readonly overflow: HeadingCliOverflowPolicy;
  readonly width: number;
  readonly theme: TerminalTheme;
}

function renderDocumentHeading(
  props: HeadingCliProps,
  options: DocumentHeadingOptions,
  capabilities: TerminalCapabilities,
): string {
  const { accent, content, level, overflow, theme, width } = options;
  const marker = level === 1 || level === 3
    ? `${terminalMotifRepertoire(props.motif, true).marker} `
    : "";
  const markerWidth = measureText(marker);
  const contentWidth = Math.max(1, width - markerWidth);
  const markerRendered = marker === "" ? "" : renderStyledSpans([{
    text: marker,
    style: { color: terminalToneColor(theme, "accent") },
  }], capabilities);
  const richContent = content === "" ||
      (Array.isArray(content) && content.length === 0)
    ? ""
    : renderSemanticInlineContent(content, capabilities, {
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      baseRole: documentBaseRole(level),
    });
  const accentRendered = accent === "" ? "" : renderStyledSpans([{
    text: accent,
    style: {
      ...theme.typography.emphasis,
      color: terminalToneColor(theme, "accent"),
    },
  }], capabilities);
  const renderedContent = `${richContent}${accentRendered}`;

  let heading: string;
  if (overflow === "wrap") {
    if (width <= markerWidth) {
      throw new TypeError(
        `wrapped document heading level ${level} needs at least ${
          markerWidth + 1
        } cells; received ${width}`,
      );
    }
    heading = headingLines(
      renderedContent,
      markerRendered,
      markerWidth,
      contentWidth,
    );
  } else {
    heading = `${markerRendered}${
      truncateStyledText(
        renderedContent,
        contentWidth,
        capabilities.unicode ? "…" : ".",
      )
    }`;
  }

  const ruleLength = level === 1
    ? theme.spacing["--discern-space-24"] ?? 12
    : theme.spacing["--discern-space-12"] ?? 6;
  const rule = level <= 2
    ? renderMotifPattern(
      {
        length: Math.min(width, ruleLength),
        tone: "accent",
        ...(props.theme === undefined ? {} : { theme: props.theme }),
        ...motifPassthrough(props),
      },
      capabilities,
    )
    : "";
  if (level === 1) return `${rule}\n${heading}`;
  if (level === 2) return `${heading}\n${rule}`;
  return heading;
}

/** Render one semantic terminal heading with an optional accent segment. */
const renderHeadingCli: CliRenderer<HeadingCliProps> = (
  props,
  capabilities,
) => {
  const hasText = props.text !== undefined;
  const hasContent = props.content !== undefined;
  if (hasText === hasContent) {
    throw new TypeError("heading requires exactly one of text or content");
  }
  for (const value of [props.text, props.accent]) {
    if (value !== undefined && /[\p{Cc}\p{Cf}]/u.test(value)) {
      throw new TypeError("heading content must be control-free");
    }
  }
  if (props.text === "") throw new TypeError("heading text must be non-empty");
  const overflow = props.overflow ?? "truncate";
  if (overflow !== "truncate" && overflow !== "wrap") {
    throw new TypeError(`unknown heading overflow policy: ${overflow}`);
  }
  const treatment = props.treatment ?? "default";
  if (treatment !== "default" && treatment !== "document") {
    throw new TypeError(`unknown heading treatment: ${treatment}`);
  }
  const requestedWidth = props.maxWidth ?? capabilities.columns;
  if (!Number.isSafeInteger(requestedWidth) || requestedWidth < 3) {
    throw new TypeError(
      `heading width must be a safe integer of at least 3; received ${requestedWidth}`,
    );
  }
  const width = Math.min(requestedWidth, capabilities.columns);
  const level = props.level ?? 2;
  const prefix = `${"#".repeat(level)} `;
  const prefixWidth = measureText(prefix);
  const contentWidth = Math.max(1, width - prefixWidth);
  const accent = props.accent === undefined || props.accent === ""
    ? ""
    : ` ${props.accent}`;
  const theme = terminalThemes[props.theme ?? "dark"];
  const prefixStyle = {
    ...theme.typography.muted,
    color: terminalThemeColor(theme, "--discern-color-ink-faint"),
  };
  const accentStyle = {
    ...theme.typography.emphasis,
    color: terminalToneColor(theme, "accent"),
  };

  if (
    treatment === "document" && capabilities.colorDepth !== "none" &&
    capabilities.unicode
  ) {
    const content = hasText ? props.text : props.content;
    return withCliHeadingBoundary(
      renderDocumentHeading(
        props,
        { content, accent, level, overflow, width, theme },
        capabilities,
      ),
      props.leadingBlankLines,
    );
  }

  // The compact one-line contract gives the accent first claim on the
  // available cells, preserving its deliberate emphasis at narrow widths.
  if (hasText && overflow === "truncate") {
    const visibleAccent = truncateText(
      accent,
      contentWidth,
      capabilities.unicode ? "…" : ".",
    );
    const textWidth = Math.max(0, contentWidth - measureText(visibleAccent));
    const text = truncateText(
      props.text,
      textWidth,
      capabilities.unicode ? "…" : ".",
    );
    const heading = renderStyledSpans([
      {
        text: prefix,
        style: prefixStyle,
      },
      { text, style: theme.typography.display },
      ...(visibleAccent === "" ? [] : [{
        text: visibleAccent,
        style: accentStyle,
      }]),
    ], capabilities);
    return withCliHeadingBoundary(heading, props.leadingBlankLines);
  }

  const prefixRendered = renderStyledSpans(
    [{ text: prefix, style: prefixStyle }],
    capabilities,
  );
  const richContent = hasText
    ? renderStyledSpans(
      [{ text: props.text, style: theme.typography.display }],
      capabilities,
    )
    : props.content === "" ||
        (Array.isArray(props.content) && props.content.length === 0)
    ? ""
    : renderSemanticInlineContent(props.content, capabilities, {
      ...(props.theme === undefined ? {} : { theme: props.theme }),
      baseRole: "display",
    });
  const renderedContent = accent === ""
    ? richContent
    : `${richContent}${
      renderStyledSpans([{ text: accent, style: accentStyle }], capabilities)
    }`;
  if (overflow === "wrap") {
    if (width <= prefixWidth) {
      throw new TypeError(
        `wrapped heading level ${level} needs at least ${
          prefixWidth + 1
        } cells; received ${width}`,
      );
    }
    return withCliHeadingBoundary(
      headingLines(
        renderedContent,
        prefixRendered,
        prefixWidth,
        contentWidth,
      ),
      props.leadingBlankLines,
    );
  }
  const heading = `${prefixRendered}${
    truncateStyledText(
      renderedContent,
      contentWidth,
      capabilities.unicode ? "…" : ".",
    )
  }`;
  return withCliHeadingBoundary(heading, props.leadingBlankLines);
};

export default renderHeadingCli;
