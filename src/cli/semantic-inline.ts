/**
 * Package-owned semantic inline content, its hostile-input boundary, one
 * lossless plain-text projection, and Theme-derived terminal rendering.
 *
 * Parser ASTs adapt into this vocabulary before reaching a Component. The
 * vocabulary contains no HTML, React, or caller-authored terminal styling;
 * every emitted control sequence comes from the package ANSI authorities.
 *
 * @module
 */

import {
  renderStyledSpans,
  type StyledSpan,
  styleHyperlink,
  type TerminalTextStyle,
} from "./ansi.ts";
import { validHyperlinkTarget } from "./styled-sequences.ts";
import { wrapStyledText } from "./text.ts";
import {
  type TerminalTheme,
  terminalThemeColor,
  terminalThemes,
  type TerminalThemeVariant,
  terminalToneColor,
} from "./theme.ts";
import type { TerminalCapabilities } from "./capabilities.ts";

/** Maximum semantic-node nesting accepted at the public rendering boundary. */
export const SEMANTIC_INLINE_MAX_DEPTH = 64;

/** Plain semantic text, including decoded entities and escaped punctuation. */
export interface SemanticInlineTextNode {
  readonly kind: "text";
  readonly text: string;
}

/** Text known to have originated as literal escaped or decoded source. */
export interface SemanticInlineLiteralNode {
  readonly kind: "literal";
  readonly text: string;
}

/** Semantically emphasised inline content. */
export interface SemanticInlineEmphasisNode {
  readonly kind: "emphasis";
  readonly content: SemanticInlineContent;
}

/** Semantically strongly emphasised inline content. */
export interface SemanticInlineStrongNode {
  readonly kind: "strong";
  readonly content: SemanticInlineContent;
}

/** Inline content whose deletion or obsolescence remains visible. */
export interface SemanticInlineStrikethroughNode {
  readonly kind: "strikethrough";
  readonly content: SemanticInlineContent;
}

/** Literal inline code whose contents never acquire child semantics. */
export interface SemanticInlineCodeNode {
  readonly kind: "code";
  readonly text: string;
}

/** Safe hyperlink with a semantic label subtree and optional advisory title. */
export interface SemanticInlineLinkNode {
  readonly kind: "link";
  readonly label: SemanticInlineContent;
  readonly destination: string;
  readonly title?: string;
}

/** Image semantics represented in terminals by an explicit textual fallback. */
export interface SemanticInlineImageNode {
  readonly kind: "image";
  readonly alt: string;
  readonly source: string;
  readonly title?: string;
}

/** A source soft break that becomes one reflowable space. */
export interface SemanticInlineSoftBreakNode {
  readonly kind: "soft-break";
}

/** A meaning-bearing hard break that remains a line boundary. */
export interface SemanticInlineHardBreakNode {
  readonly kind: "hard-break";
}

/** Stable reference to a later footnote definition. */
export interface SemanticInlineFootnoteReferenceNode {
  readonly kind: "footnote-reference";
  readonly identifier: string;
  readonly label?: string;
}

/** One package-owned semantic inline node. */
export type SemanticInlineNode =
  | SemanticInlineTextNode
  | SemanticInlineLiteralNode
  | SemanticInlineEmphasisNode
  | SemanticInlineStrongNode
  | SemanticInlineStrikethroughNode
  | SemanticInlineCodeNode
  | SemanticInlineLinkNode
  | SemanticInlineImageNode
  | SemanticInlineSoftBreakNode
  | SemanticInlineHardBreakNode
  | SemanticInlineFootnoteReferenceNode;

/**
 * Recursively immutable semantic inline content. A string is shorthand for
 * one text run, including inside a readonly sequence.
 */
export type SemanticInlineContent =
  | string
  | readonly (string | SemanticInlineNode)[];

/** Theme selection for semantic inline terminal rendering. */
export interface SemanticInlineRenderOptions {
  readonly theme?: TerminalThemeVariant;
  /**
   * Package-owned base typography for otherwise unannotated text. Nested
   * emphasis, strong text, code, links, images, and references still derive
   * from this role through the same semantic renderer. Defaults to `body`.
   */
  readonly baseRole?: SemanticInlineBaseRole;
}

/** Safe base typography profiles available to semantic inline consumers. */
export type SemanticInlineBaseRole =
  | "body"
  | "display"
  | "strong"
  | "muted"
  | "annotation";

type ValidationContext = "content" | "link-label";
type NodeRecord = Record<string, unknown>;

const SAFE_DESTINATION_PROTOCOLS = new Set([
  "http:",
  "https:",
  "mailto:",
  "file:",
]);
const FORMAT_OR_CONTROL = /[\p{Cc}\p{Cf}]/u;
const EXPLICIT_SCHEME = /^([a-z][a-z0-9+.-]*):/iu;
const ENCODED_CONTROL = /%(?:0[0-9a-f]|1[0-9a-f]|7f)/iu;
const FOOTNOTE_IDENTIFIER = /^[A-Za-z0-9][A-Za-z0-9._:-]*$/u;

function validationError(path: string, message: string): never {
  throw new TypeError(`semantic inline content at ${path} ${message}`);
}

function dataRecord(value: unknown, path: string): NodeRecord {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return validationError(path, "must be a package node object");
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return validationError(path, "must be an ordinary data object");
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      return validationError(path, "must not carry symbol properties");
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
      return validationError(path, `must store ${JSON.stringify(key)} as data`);
    }
  }
  return value as NodeRecord;
}

function exactKeys(
  record: NodeRecord,
  required: readonly string[],
  optional: readonly string[],
  path: string,
): void {
  const keys = Object.getOwnPropertyNames(record);
  const accepted = new Set([...required, ...optional]);
  for (const key of keys) {
    if (!accepted.has(key)) {
      validationError(path, `has unexpected key ${JSON.stringify(key)}`);
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(record, key)) {
      validationError(path, `is missing required key ${JSON.stringify(key)}`);
    }
  }
}

function assertDenseDataArray(value: readonly unknown[], path: string): void {
  const indexes: string[] = [];
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      validationError(path, "must not carry symbol properties");
    }
    if (key === "length") continue;
    if (!/^(?:0|[1-9][0-9]*)$/u.test(key)) {
      validationError(path, `has unexpected key ${JSON.stringify(key)}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
      validationError(path, `must store ${JSON.stringify(key)} as data`);
    }
    indexes.push(key);
  }
  if (indexes.length !== value.length) {
    validationError(path, "must be a dense node sequence");
  }
}

function safeText(
  value: unknown,
  path: string,
  options: { readonly meaningful?: boolean } = {},
): string {
  if (typeof value !== "string") {
    return validationError(path, "must be a string");
  }
  if (value === "" || (options.meaningful === true && value.trim() === "")) {
    return validationError(path, "must be non-empty");
  }
  if (FORMAT_OR_CONTROL.test(value)) {
    return validationError(
      path,
      "must be free of control and format characters",
    );
  }
  return value;
}

function safeDestination(value: unknown, path: string): string {
  if (typeof value !== "string" || !validHyperlinkTarget(value)) {
    return validationError(
      path,
      "must be a non-empty printable ASCII URL reference",
    );
  }
  if (value.includes("\\") || ENCODED_CONTROL.test(value)) {
    return validationError(path, "contains an unsafe URL character");
  }
  const scheme = EXPLICIT_SCHEME.exec(value)?.[1]?.toLocaleLowerCase();
  if (scheme !== undefined && !SAFE_DESTINATION_PROTOCOLS.has(`${scheme}:`)) {
    return validationError(
      path,
      `uses unsafe scheme ${JSON.stringify(scheme)}`,
    );
  }
  try {
    new URL(value, "https://semantic-inline.invalid/");
  } catch {
    return validationError(path, "must be a valid URL reference");
  }
  return value;
}

function codeDelimited(text: string): string {
  const longest = Math.max(
    0,
    ...[...text.matchAll(/`+/gu)].map((match) => match[0].length),
  );
  const fence = "`".repeat(longest + 1);
  return text.startsWith("`") || text.endsWith("`")
    ? `${fence} ${text} ${fence}`
    : `${fence}${text}${fence}`;
}

function validateContent(
  value: unknown,
  path: string,
  depth: number,
  context: ValidationContext,
  active: Set<object>,
): string {
  if (typeof value === "string") return safeText(value, path);
  if (!Array.isArray(value)) {
    return validationError(path, "must be a string or readonly node sequence");
  }
  if (active.has(value)) {
    return validationError(path, "must not contain a cycle");
  }
  assertDenseDataArray(value, path);
  active.add(value);
  try {
    return value.map((item, index) =>
      typeof item === "string"
        ? safeText(item, `${path}[${index}]`)
        : validateNode(item, `${path}[${index}]`, depth + 1, context, active)
    ).join("");
  } finally {
    active.delete(value);
  }
}

function validateNode(
  value: unknown,
  path: string,
  depth: number,
  context: ValidationContext,
  active: Set<object>,
): string {
  if (depth > SEMANTIC_INLINE_MAX_DEPTH) {
    return validationError(
      path,
      `exceeds the ${SEMANTIC_INLINE_MAX_DEPTH}-node nesting limit`,
    );
  }
  const record = dataRecord(value, path);
  if (active.has(record)) {
    return validationError(path, "must not contain a cycle");
  }
  active.add(record);
  try {
    const kind = record.kind;
    if (typeof kind !== "string") {
      return validationError(path, "must have a string kind");
    }
    switch (kind) {
      case "text":
      case "literal": {
        exactKeys(record, ["kind", "text"], [], path);
        return safeText(record.text, `${path}.text`);
      }
      case "emphasis":
      case "strong":
      case "strikethrough": {
        exactKeys(record, ["kind", "content"], [], path);
        const content = validateContent(
          record.content,
          `${path}.content`,
          depth,
          context,
          active,
        );
        if (content.trim() === "") {
          return validationError(`${path}.content`, "must carry visible text");
        }
        return content;
      }
      case "code": {
        exactKeys(record, ["kind", "text"], [], path);
        return codeDelimited(safeText(record.text, `${path}.text`));
      }
      case "link": {
        if (context === "link-label") {
          return validationError(
            path,
            "cannot nest a link inside a link label",
          );
        }
        exactKeys(
          record,
          ["kind", "label", "destination"],
          ["title"],
          path,
        );
        const label = validateContent(
          record.label,
          `${path}.label`,
          depth,
          "link-label",
          active,
        );
        if (label.trim() === "") {
          return validationError(`${path}.label`, "must carry visible text");
        }
        const destination = safeDestination(
          record.destination,
          `${path}.destination`,
        );
        if (Object.hasOwn(record, "title")) {
          safeText(record.title, `${path}.title`, { meaningful: true });
        }
        return label === destination ? label : `${label} (${destination})`;
      }
      case "image": {
        if (context === "link-label") {
          return validationError(
            path,
            "cannot nest an image inside a link label",
          );
        }
        exactKeys(record, ["kind", "alt", "source"], ["title"], path);
        const alt = safeText(record.alt, `${path}.alt`, { meaningful: true });
        const source = safeDestination(record.source, `${path}.source`);
        if (Object.hasOwn(record, "title")) {
          safeText(record.title, `${path}.title`, { meaningful: true });
        }
        return `Image: ${alt} (${source})`;
      }
      case "soft-break": {
        exactKeys(record, ["kind"], [], path);
        return " ";
      }
      case "hard-break": {
        if (context === "link-label") {
          return validationError(
            path,
            "cannot put a hard break inside a link label",
          );
        }
        exactKeys(record, ["kind"], [], path);
        return "\n";
      }
      case "footnote-reference": {
        if (context === "link-label") {
          return validationError(
            path,
            "cannot nest a footnote reference inside a link label",
          );
        }
        exactKeys(record, ["kind", "identifier"], ["label"], path);
        const identifier = safeText(
          record.identifier,
          `${path}.identifier`,
          { meaningful: true },
        );
        if (!FOOTNOTE_IDENTIFIER.test(identifier)) {
          return validationError(
            `${path}.identifier`,
            "must use letters, digits, dots, underscores, colons, or hyphens",
          );
        }
        const label = Object.hasOwn(record, "label")
          ? safeText(record.label, `${path}.label`, { meaningful: true })
          : identifier;
        return `[^${label}]`;
      }
      default:
        return validationError(
          path,
          `has unknown kind ${JSON.stringify(kind)}`,
        );
    }
  } finally {
    active.delete(record);
  }
}

/**
 * Validate runtime input at the semantic boundary. This accepts `unknown` so
 * a parser adapter can prove its output before exposing it as package data.
 */
export function validateSemanticInlineContent(
  value: unknown,
): asserts value is SemanticInlineContent {
  const projected = validateContent(value, "$", 0, "content", new Set());
  if (projected.trim() === "") {
    validationError("$", "must carry visible text");
  }
}

function projectContent(content: SemanticInlineContent): string {
  if (typeof content === "string") return content;
  return content.map((item) =>
    typeof item === "string" ? item : projectNode(item)
  ).join("");
}

function projectNode(node: SemanticInlineNode): string {
  switch (node.kind) {
    case "text":
    case "literal":
      return node.text;
    case "emphasis":
      return `_${projectContent(node.content)}_`;
    case "strong":
      return `**${projectContent(node.content)}**`;
    case "strikethrough":
      return `~~${projectContent(node.content)}~~`;
    case "code":
      return codeDelimited(node.text);
    case "link": {
      const label = projectContent(node.label);
      return label === node.destination
        ? label
        : `${label} (${node.destination})`;
    }
    case "image":
      return `Image: ${node.alt} (${node.source})`;
    case "soft-break":
      return " ";
    case "hard-break":
      return "\n";
    case "footnote-reference":
      return `[^${node.label ?? node.identifier}]`;
  }
}

/**
 * Project semantic inline content to its single lossless plain-text form.
 * This is also the exact no-colour degradation rendered by the package.
 */
export function semanticInlineText(content: SemanticInlineContent): string {
  validateSemanticInlineContent(content);
  return projectContent(content);
}

function mergedStyle(
  inherited: TerminalTextStyle,
  added: TerminalTextStyle,
): TerminalTextStyle {
  return { ...inherited, ...added };
}

function baseStyle(
  theme: TerminalTheme,
  role: SemanticInlineBaseRole,
): TerminalTextStyle {
  switch (role) {
    case "body":
      return {
        ...theme.typography.body,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      };
    case "display":
      return {
        ...theme.typography.display,
        color: terminalThemeColor(theme, "--discern-color-ink"),
      };
    case "strong":
      return {
        ...theme.typography.strong,
        color: terminalThemeColor(theme, "--discern-color-ink"),
      };
    case "muted":
      return {
        ...theme.typography.muted,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      };
    case "annotation":
      return {
        ...theme.typography.annotation,
        color: terminalThemeColor(theme, "--discern-color-ink-muted"),
      };
  }
}

function markerSpan(text: string, style: TerminalTextStyle): StyledSpan {
  return { text, style };
}

function labelSpans(
  content: SemanticInlineContent,
  inherited: TerminalTextStyle,
  capabilities: TerminalCapabilities,
  theme: TerminalTheme,
): readonly StyledSpan[] {
  if (typeof content === "string") return [{ text: content, style: inherited }];
  return content.flatMap((item): readonly StyledSpan[] => {
    if (typeof item === "string") return [{ text: item, style: inherited }];
    switch (item.kind) {
      case "text":
      case "literal":
        return [{ text: item.text, style: inherited }];
      case "emphasis":
      case "strong":
      case "strikethrough": {
        const fallback = item.kind === "emphasis"
          ? "_"
          : item.kind === "strong"
          ? "**"
          : "~~";
        const added = item.kind === "emphasis"
          ? theme.typography.emphasis
          : item.kind === "strong"
          ? theme.typography.strong
          : { strikethrough: true } as const;
        if (capabilities.colorDepth === "none") {
          return [
            markerSpan(fallback, inherited),
            ...labelSpans(item.content, inherited, capabilities, theme),
            markerSpan(fallback, inherited),
          ];
        }
        return labelSpans(
          item.content,
          mergedStyle(inherited, added),
          capabilities,
          theme,
        );
      }
      case "code":
        return [{
          text: codeDelimited(item.text),
          style: mergedStyle(inherited, {
            ...theme.typography.strong,
            color: terminalThemeColor(theme, "--discern-color-ink"),
          }),
        }];
      case "soft-break":
        return [{ text: " ", style: inherited }];
      case "link":
      case "image":
      case "hard-break":
      case "footnote-reference":
        throw new Error(
          `validated link label reached impossible ${item.kind} node`,
        );
    }
  });
}

function renderContent(
  content: SemanticInlineContent,
  inherited: TerminalTextStyle,
  capabilities: TerminalCapabilities,
  theme: TerminalTheme,
): string {
  if (typeof content === "string") {
    return renderStyledSpans(
      [{ text: content, style: inherited }],
      capabilities,
    );
  }
  return content.map((item) => {
    if (typeof item === "string") {
      return renderStyledSpans(
        [{ text: item, style: inherited }],
        capabilities,
      );
    }
    switch (item.kind) {
      case "text":
      case "literal":
        return renderStyledSpans(
          [{ text: item.text, style: inherited }],
          capabilities,
        );
      case "emphasis":
      case "strong":
      case "strikethrough": {
        const marker = item.kind === "emphasis"
          ? "_"
          : item.kind === "strong"
          ? "**"
          : "~~";
        const added = item.kind === "emphasis"
          ? theme.typography.emphasis
          : item.kind === "strong"
          ? theme.typography.strong
          : { strikethrough: true } as const;
        if (capabilities.colorDepth === "none") {
          return marker +
            renderContent(item.content, inherited, capabilities, theme) +
            marker;
        }
        return renderContent(
          item.content,
          mergedStyle(inherited, added),
          capabilities,
          theme,
        );
      }
      case "code":
        return renderStyledSpans([{
          text: codeDelimited(item.text),
          style: mergedStyle(inherited, {
            ...theme.typography.strong,
            color: terminalThemeColor(theme, "--discern-color-ink"),
          }),
        }], capabilities);
      case "link": {
        const style = mergedStyle(inherited, {
          underline: true,
          color: terminalToneColor(theme, "accent"),
        });
        return styleHyperlink(
          labelSpans(item.label, style, capabilities, theme),
          item.destination,
          capabilities,
        );
      }
      case "image": {
        const annotation = mergedStyle(inherited, {
          ...theme.typography.annotation,
          color: terminalThemeColor(theme, "--discern-color-ink-faint"),
        });
        const linkStyle = mergedStyle(inherited, {
          underline: true,
          color: terminalToneColor(theme, "accent"),
        });
        return renderStyledSpans([
          { text: "Image: ", style: annotation },
          { text: item.alt, style: inherited },
        ], capabilities) +
          ` (${
            styleHyperlink(item.source, item.source, capabilities, linkStyle)
          })`;
      }
      case "soft-break":
        return " ";
      case "hard-break":
        return "\n";
      case "footnote-reference":
        return renderStyledSpans([{
          text: `[^${item.label ?? item.identifier}]`,
          style: mergedStyle(inherited, {
            ...theme.typography.annotation,
            color: terminalToneColor(theme, "accent"),
          }),
        }], capabilities);
    }
  }).join("");
}

/** Render validated semantic inline content to unwrapped package-styled text. */
export function renderSemanticInlineContent(
  content: SemanticInlineContent,
  capabilities: TerminalCapabilities,
  options: SemanticInlineRenderOptions = {},
): string {
  validateSemanticInlineContent(content);
  const theme = terminalThemes[options.theme ?? "dark"];
  const role = options.baseRole ?? "body";
  if (
    role !== "body" && role !== "display" && role !== "strong" &&
    role !== "muted" && role !== "annotation"
  ) {
    throw new TypeError(`unknown semantic inline base role: ${role}`);
  }
  return renderContent(content, baseStyle(theme, role), capabilities, theme);
}

/**
 * Render and wrap semantic inline content into independently valid lines. The
 * requested width can narrow but never widen the supplied terminal facts.
 */
export function wrapSemanticInlineContent(
  content: SemanticInlineContent,
  columns: number,
  capabilities: TerminalCapabilities,
  options: SemanticInlineRenderOptions = {},
): readonly string[] {
  if (!Number.isSafeInteger(columns) || columns < 1) {
    throw new TypeError(
      `semantic inline width must be a positive safe integer; received ${columns}`,
    );
  }
  const width = Math.min(columns, capabilities.columns);
  if (!Number.isSafeInteger(width) || width < 1) {
    throw new TypeError(
      `terminal columns must be a positive safe integer; received ${capabilities.columns}`,
    );
  }
  return wrapStyledText(
    renderSemanticInlineContent(content, capabilities, options),
    width,
  );
}
