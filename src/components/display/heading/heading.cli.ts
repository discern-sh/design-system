/**
 * Pure terminal renderer and deterministic example states for Heading.
 *
 * @module
 */

import { renderStyledSpans, styleText } from "../../../cli/ansi.ts";
import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import { defineCliExamples } from "../../../cli/component-examples.ts";
import {
  type CliExample,
  type CliPresentationOptions,
  cliPresentationPassthrough,
  type CliRenderer,
} from "../../../cli/contracts.ts";
import { withCliHeadingBoundary } from "../../../cli/heading-boundary.ts";
import {
  terminalMotifRegisterRoles,
  terminalMotifRepertoire,
} from "../../../cli/motif.ts";
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
  resolveTerminalTheme,
  type TerminalTheme,
  terminalThemeColor,
  terminalToneColor,
} from "../../../cli/theme.ts";
import meta, { componentExampleVocabulary } from "./heading.meta.ts";
import type { HeadingLevel } from "./heading.types.ts";

/** Width behavior for terminal Heading content. */
export type HeadingCliOverflowPolicy = "truncate" | "wrap";

/** Visual treatments available to terminal Heading callers. */
export type HeadingCliTreatment = "default" | "document";

interface HeadingCliOptions extends CliPresentationOptions {
  readonly accent?: string;
  readonly level?: HeadingLevel;
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

const cliExampleImplementations = [
  { name: "default", props: { text: "Build with confidence", level: 2 } },
  {
    name: "accent",
    props: { text: "Rules that", accent: "travel", level: 2 },
  },
  {
    name: "rich-content",
    props: {
      content: [
        "A ",
        { kind: "strong", content: "complete" },
        " heading keeps ",
        { kind: "code", text: "inline meaning" },
      ],
      level: 3,
      overflow: "wrap",
      maxWidth: 32,
      leadingBlankLines: 0,
    },
  },
] as const satisfies readonly CliExample<HeadingCliProps>[];
defineCliExamples(meta, componentExampleVocabulary, cliExampleImplementations);

/** Deterministic Heading states rendered by `deno task catalogue:cli heading`. */
export const cliExamples: readonly CliExample<HeadingCliProps>[] =
  cliExampleImplementations;

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
  const prefix = level === 1
    ? `${
      terminalMotifRegisterRoles(
        terminalMotifRepertoire(props.motif, capabilities.unicode),
        props.register,
      ).marker
    } `
    : level === 3
    ? "╶─ "
    : "";
  const prefixWidth = measureText(prefix);
  const trailingReserve = level === 3 ? 2 : 0;
  const minimumWidth = prefixWidth + trailingReserve + 1;
  if (width < minimumWidth) {
    throw new TypeError(
      `document heading level ${level} needs at least ${minimumWidth} cells; received ${width}`,
    );
  }
  const contentWidth = width - prefixWidth - trailingReserve;
  const quietRuleStyle = {
    color: terminalThemeColor(theme, "--discern-color-ink-faint"),
    dim: true,
  } as const;
  const prefixRendered = prefix === "" ? "" : renderStyledSpans([{
    text: prefix,
    style: level === 3
      ? quietRuleStyle
      : { color: terminalToneColor(theme, "accent") },
  }], capabilities);
  const richContent = content === "" ||
      (Array.isArray(content) && content.length === 0)
    ? ""
    : renderSemanticInlineContent(content, capabilities, {
      ...cliPresentationPassthrough(props),
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
    heading = headingLines(
      renderedContent,
      prefixRendered,
      prefixWidth,
      contentWidth,
    );
  } else {
    heading = `${prefixRendered}${
      truncateStyledText(
        renderedContent,
        contentWidth,
        capabilities.unicode ? "…" : ".",
      )
    }`;
  }

  if (level === 3) {
    const lines = heading.split("\n");
    const lastIndex = lines.length - 1;
    const last = lines[lastIndex] ?? "";
    const ruleLength = Math.max(1, width - measureText(last) - 1);
    lines[lastIndex] = `${last}${
      styleText(` ${"─".repeat(ruleLength)}`, quietRuleStyle, capabilities)
    }`;
    return lines.join("\n");
  }
  if (level === 1) {
    const rule = styleText(
      "━".repeat(width),
      { color: terminalToneColor(theme, "accent") },
      capabilities,
    );
    return `${heading}\n${rule}`;
  }
  if (level === 2) {
    const rule = styleText(
      "─".repeat(width),
      { color: terminalToneColor(theme, "accent") },
      capabilities,
    );
    return `${heading}\n${rule}`;
  }
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
  const theme = resolveTerminalTheme(props);
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
      ...cliPresentationPassthrough(props),
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
