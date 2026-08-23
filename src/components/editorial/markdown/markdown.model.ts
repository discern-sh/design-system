/**
 * One contained Markdown parser and package-owned neutral document model.
 *
 * Parser nodes never cross this module. React and CLI projections consume the
 * readonly model below and remain presentation-only authorities.
 *
 * @module
 */

import type {
  Definition,
  FootnoteDefinition,
  Html,
  Nodes,
  PhrasingContent,
  Root,
  RootContent,
} from "mdast";
import { fromMarkdown } from "mdast-util-from-markdown";
import { gfmFromMarkdown } from "mdast-util-gfm";
import { gfm } from "micromark-extension-gfm";
import {
  type SemanticInlineContent,
  type SemanticInlineNode,
  validateSemanticInlineContent,
} from "../../../cli/semantic-inline.ts";
import { makeSourceControlsVisible } from "../../../cli/visible-text.ts";
import type { TerminalAlignment } from "../../../cli/text.ts";
import { diagramAltText } from "../../../diagram/accessibility.ts";
import { validateDiagram } from "../../../generated/diagram-dispatch.ts";
import type { DiagramSpec } from "../../../generated/diagram-spec.ts";
import type { HeadingLevel } from "../../display/heading/heading.types.ts";
import type { CalloutTone } from "../callout/callout.types.ts";
import type { ListKind, ListSpacing } from "../list/list.types.ts";
import type { MarkdownDiagramResource } from "../../../diagram/markdown.ts";

/** Maximum UTF-8 source size accepted by the Markdown parser. */
export const MARKDOWN_MAX_SOURCE_BYTES = 524_288;

/** Maximum parser-node count accepted before recursive adaptation begins. */
export const MARKDOWN_MAX_NODES = 100_000;

/** Maximum parser and neutral structural depth accepted by Markdown. */
export const MARKDOWN_MAX_DEPTH = 64;

/** Closed disposition registry for every node in the pinned mdast vocabulary. */
export const MARKDOWN_PARSER_NODE_HANDLING = {
  root: "adapted",
  blockquote: "adapted",
  break: "adapted",
  code: "adapted",
  definition: "inert",
  delete: "adapted",
  emphasis: "adapted",
  footnoteDefinition: "adapted",
  footnoteReference: "adapted",
  heading: "adapted",
  html: "adapted-or-inert",
  image: "adapted",
  imageReference: "adapted",
  inlineCode: "adapted",
  link: "adapted",
  linkReference: "adapted",
  list: "adapted",
  listItem: "adapted",
  paragraph: "adapted",
  strong: "adapted",
  table: "adapted",
  tableCell: "adapted",
  tableRow: "adapted",
  text: "adapted",
  thematicBreak: "adapted",
  yaml: "rejected",
} as const satisfies Readonly<
  Record<Nodes["type"], "adapted" | "adapted-or-inert" | "inert" | "rejected">
>;

/** Deterministic whole-document refusal raised at the Markdown boundary. */
export class MarkdownParseError extends TypeError {
  override readonly name = "MarkdownParseError";
}

/** One neutral Markdown paragraph. */
export interface MarkdownParagraphBlock {
  readonly kind: "paragraph";
  readonly content: SemanticInlineContent;
}

/** One neutral Markdown heading and its resolved repository anchor. */
export interface MarkdownHeadingBlock {
  readonly kind: "heading";
  readonly level: HeadingLevel;
  readonly id: string;
  readonly content: SemanticInlineContent;
}

/** One neutral Markdown list item. */
export interface MarkdownListItem {
  readonly content?: SemanticInlineContent;
  readonly checked?: boolean;
  readonly blocks: readonly MarkdownBlock[];
}

/** One neutral ordered, unordered, or task list. */
export interface MarkdownListBlock {
  readonly kind: "list";
  readonly listKind: ListKind;
  readonly start?: number;
  readonly spacing: ListSpacing;
  readonly items: readonly MarkdownListItem[];
}

/** One ordinary neutral quotation. */
export interface MarkdownBlockquoteBlock {
  readonly kind: "blockquote";
  readonly children: readonly MarkdownBlock[];
}

/** One GitHub alert classified from an ordinary blockquote. */
export interface MarkdownCalloutBlock {
  readonly kind: "callout";
  readonly title: "Note" | "Tip" | "Important" | "Warning" | "Caution";
  readonly tone: CalloutTone;
  readonly children: readonly MarkdownBlock[];
}

/** One literal fenced or indented code block. */
export interface MarkdownCodeBlock {
  readonly kind: "code";
  readonly code: string;
  readonly language?: string;
  readonly info?: string;
}

/** One quiet thematic break. */
export interface MarkdownThematicBreakBlock {
  readonly kind: "thematic-break";
}

/** One relational table column. */
export interface MarkdownTableColumn {
  readonly header: SemanticInlineContent;
  readonly align?: TerminalAlignment;
}

/** One GFM table with header-derived columns. */
export interface MarkdownTableBlock {
  readonly kind: "table";
  readonly columns: readonly MarkdownTableColumn[];
  readonly rows: readonly (readonly SemanticInlineContent[])[];
}

/** One resolved end-note definition and all of its reference occurrences. */
export interface MarkdownFootnoteItem {
  readonly id: string;
  readonly label: string;
  readonly children: readonly MarkdownBlock[];
  readonly returnIds: readonly string[];
}

/** The document-owned terminal footnote section. */
export interface MarkdownFootnotesBlock {
  readonly kind: "footnotes";
  readonly items: readonly MarkdownFootnoteItem[];
}

/** One admitted ordinary image resolved to package-owned diagram semantics. */
export interface MarkdownDiagramBlock {
  readonly kind: "diagram";
  readonly source: string;
  readonly spec: DiagramSpec;
}

/** One package-owned Markdown block. */
export type MarkdownBlock =
  | MarkdownParagraphBlock
  | MarkdownHeadingBlock
  | MarkdownListBlock
  | MarkdownBlockquoteBlock
  | MarkdownCalloutBlock
  | MarkdownCodeBlock
  | MarkdownThematicBreakBlock
  | MarkdownTableBlock
  | MarkdownFootnotesBlock
  | MarkdownDiagramBlock;

/** One complete package-owned neutral Markdown document. */
export interface MarkdownDocument {
  readonly kind: "document";
  readonly children: readonly MarkdownBlock[];
}

/** Closed registry used by both projections and fixture inventory guards. */
export const MARKDOWN_BLOCK_KINDS = [
  "paragraph",
  "heading",
  "list",
  "blockquote",
  "callout",
  "code",
  "thematic-break",
  "table",
  "footnotes",
  "diagram",
] as const satisfies readonly MarkdownBlock["kind"][];

/** Optional neutral resolution facts applied after Markdown parsing. */
export interface ParseMarkdownOptions {
  /** Explicit image-source to DiagramSpec resources; valid unused entries are allowed. */
  readonly diagrams?: readonly MarkdownDiagramResource[];
}

interface ValidatedMarkdownDiagramResource {
  readonly source: string;
  readonly spec: DiagramSpec;
}

interface FootnoteRecord {
  readonly sourceIdentifier: string;
  readonly id: string;
  readonly label: string;
  readonly node: FootnoteDefinition;
  readonly returnIds: string[];
}

interface AdapterContext {
  readonly definitions: ReadonlyMap<string, Definition>;
  readonly footnotes: ReadonlyMap<string, FootnoteRecord>;
  readonly orderedFootnotes: readonly FootnoteRecord[];
  readonly headingIds: Set<string>;
}

interface AlertMatch {
  readonly marker: keyof typeof ALERTS;
  readonly prefixLength: number;
}

const ALERTS = {
  NOTE: { title: "Note", tone: "note" },
  TIP: { title: "Tip", tone: "success" },
  IMPORTANT: { title: "Important", tone: "insight" },
  WARNING: { title: "Warning", tone: "warning" },
  CAUTION: { title: "Caution", tone: "warning" },
} as const satisfies Readonly<
  Record<
    string,
    {
      readonly title: MarkdownCalloutBlock["title"];
      readonly tone: CalloutTone;
    }
  >
>;

const HTML_COMMENT = /<!--[\s\S]*?-->/gu;
const FORMAT_OR_CONTROL = /[\p{Cc}\p{Cf}]/u;
const textEncoder = new TextEncoder();

function fail(message: string, cause?: unknown): never {
  throw cause === undefined
    ? new MarkdownParseError(message)
    : new MarkdownParseError(message, { cause });
}

function ordinaryDataRecord(
  value: unknown,
  path: string,
): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return fail(`${path} must be an ordinary data object`);
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    return fail(`${path} must be an ordinary data object`);
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== "string") {
      return fail(`${path} must not carry symbol properties`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor?.get !== undefined || descriptor?.set !== undefined) {
      return fail(`${path}.${key} must be an ordinary data property`);
    }
  }
  return value as Record<string, unknown>;
}

function exactResourceKeys(
  record: Record<string, unknown>,
  path: string,
): void {
  const keys = Object.getOwnPropertyNames(record).toSorted();
  if (keys.length !== 2 || keys[0] !== "source" || keys[1] !== "spec") {
    fail(`${path} must contain exactly source and spec`);
  }
}

function immutableJsonData(value: unknown): unknown {
  if (Array.isArray(value)) {
    return Object.freeze(value.map(immutableJsonData));
  }
  if (typeof value === "object" && value !== null) {
    return Object.freeze(Object.fromEntries(
      Object.entries(value).map((
        [key, item],
      ) => [key, immutableJsonData(item)]),
    ));
  }
  return value;
}

function assertNever(value: never, context: string): never {
  return fail(`${context} has no Markdown handler: ${String(value)}`);
}

function parserChildren(node: Nodes): readonly Nodes[] {
  return "children" in node ? node.children as readonly Nodes[] : [];
}

function scanParserTree(root: Root): {
  readonly definitions: ReadonlyMap<string, Definition>;
  readonly footnotes: ReadonlyMap<string, FootnoteRecord>;
  readonly orderedFootnotes: readonly FootnoteRecord[];
} {
  const definitions = new Map<string, Definition>();
  const footnotes = new Map<string, FootnoteRecord>();
  const orderedFootnotes: FootnoteRecord[] = [];
  const stack: { readonly node: Nodes; readonly depth: number }[] = [{
    node: root,
    depth: 0,
  }];
  let count = 0;

  while (stack.length > 0) {
    const entry = stack.pop();
    if (entry === undefined) break;
    count += 1;
    if (count > MARKDOWN_MAX_NODES) {
      fail(`Markdown exceeds the ${MARKDOWN_MAX_NODES}-node limit`);
    }
    if (entry.depth > MARKDOWN_MAX_DEPTH) {
      fail(`Markdown exceeds the ${MARKDOWN_MAX_DEPTH}-level depth limit`);
    }
    const disposition = MARKDOWN_PARSER_NODE_HANDLING[
      entry.node.type as Nodes["type"]
    ];
    if (disposition === undefined) {
      fail(`Markdown parser produced unknown node ${entry.node.type}`);
    }
    if (entry.node.type === "definition") {
      if (!definitions.has(entry.node.identifier)) {
        definitions.set(entry.node.identifier, entry.node);
      }
    } else if (entry.node.type === "footnoteDefinition") {
      if (footnotes.has(entry.node.identifier)) {
        fail(
          `Markdown contains duplicate footnote definition ${
            JSON.stringify(entry.node.identifier)
          }`,
        );
      }
      const index = orderedFootnotes.length + 1;
      const record: FootnoteRecord = {
        sourceIdentifier: entry.node.identifier,
        id: `fn-${index}`,
        label: String(index),
        node: entry.node,
        returnIds: [],
      };
      footnotes.set(entry.node.identifier, record);
      orderedFootnotes.push(record);
    }
    const children = parserChildren(entry.node);
    for (let index = children.length - 1; index >= 0; index -= 1) {
      const child = children[index];
      if (child !== undefined) {
        stack.push({ node: child, depth: entry.depth + 1 });
      }
    }
  }

  return { definitions, footnotes, orderedFootnotes };
}

function visibleText(value: string): string {
  return makeSourceControlsVisible(value);
}

function visibleCode(value: string): string {
  return makeSourceControlsVisible(value, {
    preserveLineFeeds: true,
    preserveTabs: true,
  });
}

function optionalVisibleText(
  value: string | null | undefined,
): string | undefined {
  if (value === null || value === undefined) return undefined;
  const visible = visibleText(value).trim();
  return visible === "" ? undefined : visible;
}

function asciiDestination(value: string): string | undefined {
  if (value === "" || FORMAT_OR_CONTROL.test(value)) return undefined;
  let encoded = "";
  try {
    encoded = [...value].map((character) =>
      (character.codePointAt(0) ?? 0) <= 0x7f
        ? character
        : encodeURIComponent(character)
    ).join("");
    validateSemanticInlineContent([{
      kind: "link",
      label: "destination",
      destination: encoded,
    }]);
  } catch {
    return undefined;
  }
  return encoded;
}

const PERCENT_ESCAPE = /%([0-9a-f]{2})/giu;
const URI_UNRESERVED = /^[A-Za-z0-9._~-]$/u;

function canonicalSource(value: string): string | undefined {
  const safe = asciiDestination(value);
  if (safe === undefined) return undefined;
  return safe.replace(PERCENT_ESCAPE, (_escape, hexadecimal: string) => {
    const character = String.fromCharCode(Number.parseInt(hexadecimal, 16));
    return URI_UNRESERVED.test(character)
      ? character
      : `%${hexadecimal.toUpperCase()}`;
  });
}

/**
 * Validate, normalise, and freeze diagram resources before document matching.
 * Valid unused resources are intentionally accepted for corpus-level reuse.
 */
export function validateMarkdownDiagramResources(
  resources: readonly MarkdownDiagramResource[] | undefined,
): readonly ValidatedMarkdownDiagramResource[] {
  if (resources === undefined) return Object.freeze([]);
  if (!Array.isArray(resources)) {
    return fail("Markdown diagram resources must be an array");
  }
  const indexes = Reflect.ownKeys(resources).filter((key) => key !== "length");
  if (
    indexes.length !== resources.length ||
    indexes.some((key, index) => key !== String(index))
  ) {
    fail("Markdown diagram resources must be a dense data array");
  }
  for (let index = 0; index < resources.length; index += 1) {
    const descriptor = Object.getOwnPropertyDescriptor(
      resources,
      String(index),
    );
    if (
      descriptor === undefined || !("value" in descriptor) ||
      descriptor.enumerable !== true
    ) {
      fail("Markdown diagram resources must be a dense data array");
    }
  }
  const normalized: ValidatedMarkdownDiagramResource[] = [];
  const sources = new Set<string>();
  for (const [index, value] of resources.entries()) {
    const path = `Markdown diagram resource ${index + 1}`;
    const record = ordinaryDataRecord(value, path);
    exactResourceKeys(record, path);
    if (typeof record.source !== "string") {
      fail(`${path} source must be a string`);
    }
    const source = canonicalSource(record.source);
    if (source === undefined) {
      fail(`${path} source must be a safe Markdown image URL reference`);
    }
    if (sources.has(source)) {
      fail(
        `Markdown diagram resources contain duplicate source ${
          JSON.stringify(source)
        }`,
      );
    }
    sources.add(source);
    try {
      validateDiagram(record.spec);
    } catch (cause) {
      fail(`${path} contains an invalid DiagramSpec`, cause);
    }
    const spec = immutableJsonData(record.spec) as DiagramSpec;
    normalized.push(Object.freeze({ source, spec }));
  }
  return Object.freeze(normalized);
}

function appendInline(
  target: (string | SemanticInlineNode)[],
  value: string | SemanticInlineNode,
): void {
  if (typeof value === "string") {
    if (value === "") return;
    const previous = target.at(-1);
    if (typeof previous === "string") {
      target[target.length - 1] = previous + value;
    } else {
      target.push(value);
    }
    return;
  }
  target.push(value);
}

function appendTextWithSoftBreaks(
  target: (string | SemanticInlineNode)[],
  value: string,
  literal = false,
): void {
  const parts = value.split("\n");
  for (const [index, part] of parts.entries()) {
    if (index > 0) appendInline(target, { kind: "soft-break" });
    const safe = visibleText(part);
    if (safe !== "") {
      appendInline(target, literal ? { kind: "literal", text: safe } : safe);
    }
  }
}

function htmlWithoutComments(node: Html): string {
  return node.value.replaceAll(HTML_COMMENT, "");
}

function inlineArray(
  content: SemanticInlineContent,
): readonly (string | SemanticInlineNode)[] {
  return typeof content === "string" ? [content] : content;
}

function inlineHasMeaning(content: SemanticInlineContent): boolean {
  if (typeof content === "string") return content.trim() !== "";
  return content.some((item) => {
    if (typeof item === "string") return item.trim() !== "";
    if (item.kind === "soft-break" || item.kind === "hard-break") return false;
    if (item.kind === "text" || item.kind === "literal") {
      return item.text.trim() !== "";
    }
    return true;
  });
}

function semanticLinkLabelCompatible(content: SemanticInlineContent): boolean {
  return inlineArray(content).every((item) => {
    if (typeof item === "string") return true;
    switch (item.kind) {
      case "text":
      case "literal":
      case "code":
      case "soft-break":
        return true;
      case "emphasis":
      case "strong":
      case "strikethrough":
        return semanticLinkLabelCompatible(item.content);
      case "link":
      case "image":
      case "hard-break":
      case "footnote-reference":
        return false;
    }
  });
}

function unsafeLinkFallback(
  label: SemanticInlineContent,
  destination: string,
): readonly (string | SemanticInlineNode)[] {
  const visibleDestination = visibleText(destination);
  const result = [...inlineArray(label)];
  appendInline(
    result,
    { kind: "literal", text: ` (${visibleDestination})` },
  );
  return result;
}

function imageNode(
  alt: string | null | undefined,
  source: string,
  title: string | null | undefined,
): SemanticInlineNode {
  const safeSource = asciiDestination(source);
  const visibleAlt = visibleText(alt ?? "");
  if (safeSource === undefined) {
    return {
      kind: "literal",
      text: `Image${visibleAlt === "" ? "" : `: ${visibleAlt}`} (${
        visibleText(source)
      })`,
    };
  }
  const safeTitle = optionalVisibleText(title);
  return {
    kind: "image",
    alt: visibleAlt,
    source: safeSource,
    ...(safeTitle === undefined ? {} : { title: safeTitle }),
  };
}

function referenceDefinition(
  identifier: string,
  context: AdapterContext,
): Definition {
  const definition = context.definitions.get(identifier);
  if (definition === undefined) {
    return fail(
      `Markdown reference ${JSON.stringify(identifier)} has no definition`,
    );
  }
  return definition;
}

function adaptInlineChildren(
  children: readonly PhrasingContent[],
  context: AdapterContext,
  depth: number,
  firstTextPrefixLength = 0,
): SemanticInlineContent {
  if (depth > MARKDOWN_MAX_DEPTH) {
    return fail(`Markdown exceeds the ${MARKDOWN_MAX_DEPTH}-level depth limit`);
  }
  const result: (string | SemanticInlineNode)[] = [];
  for (const [index, node] of children.entries()) {
    const strip = index === 0 ? firstTextPrefixLength : 0;
    switch (node.type) {
      case "text":
        appendTextWithSoftBreaks(result, node.value.slice(strip));
        break;
      case "html":
        {
          const html = htmlWithoutComments(node);
          if (html !== "") appendTextWithSoftBreaks(result, html, true);
        }
        break;
      case "break":
        appendInline(result, { kind: "hard-break" });
        break;
      case "inlineCode": {
        const text = visibleText(node.value);
        if (text !== "") appendInline(result, { kind: "code", text });
        break;
      }
      case "emphasis":
      case "strong":
      case "delete": {
        const content = adaptInlineChildren(
          node.children,
          context,
          depth + 1,
        );
        if (inlineHasMeaning(content)) {
          appendInline(result, {
            kind: node.type === "delete" ? "strikethrough" : node.type,
            content,
          });
        }
        break;
      }
      case "link":
      case "linkReference": {
        const label = adaptInlineChildren(node.children, context, depth + 1);
        const resource = node.type === "link"
          ? node
          : referenceDefinition(node.identifier, context);
        const destination = asciiDestination(resource.url);
        const effectiveLabel = inlineHasMeaning(label)
          ? label
          : visibleText(resource.url);
        if (
          destination === undefined ||
          !semanticLinkLabelCompatible(effectiveLabel)
        ) {
          for (const item of unsafeLinkFallback(effectiveLabel, resource.url)) {
            appendInline(result, item);
          }
          break;
        }
        const title = optionalVisibleText(resource.title);
        appendInline(result, {
          kind: "link",
          label: effectiveLabel,
          destination,
          ...(title === undefined ? {} : { title }),
        });
        break;
      }
      case "image":
        appendInline(result, imageNode(node.alt, node.url, node.title));
        break;
      case "imageReference": {
        const definition = referenceDefinition(node.identifier, context);
        appendInline(
          result,
          imageNode(node.alt, definition.url, definition.title),
        );
        break;
      }
      case "footnoteReference": {
        const footnote = context.footnotes.get(node.identifier);
        if (footnote === undefined) {
          return fail(
            `Markdown footnote reference ${
              JSON.stringify(node.identifier)
            } has no definition`,
          );
        }
        const occurrence = footnote.returnIds.length + 1;
        const returnId = occurrence === 1
          ? `fnref-${footnote.label}`
          : `fnref-${footnote.label}-${occurrence}`;
        footnote.returnIds.push(returnId);
        appendInline(result, {
          kind: "footnote-reference",
          identifier: footnote.id,
          label: footnote.label,
        });
        break;
      }
      default:
        assertNever(node, "Markdown inline node");
    }
  }
  return result;
}

function githubHeadingSlug(
  content: SemanticInlineContent,
  taken: Set<string>,
): string {
  const plain = semanticInlineTextForHeading(content);
  const base = plain.toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .trim()
    .replace(/\s/gu, "-") || "section";
  let slug = base;
  for (let suffix = 1; taken.has(slug); suffix += 1) {
    slug = `${base}-${suffix}`;
  }
  taken.add(slug);
  return slug;
}

/** Plain visible heading text without Markdown fallback punctuation. */
export function semanticInlineTextForHeading(
  content: SemanticInlineContent,
): string {
  const nodes = inlineArray(content);
  return nodes.map((node): string => {
    if (typeof node === "string") return node;
    switch (node.kind) {
      case "text":
      case "literal":
        return node.text;
      case "emphasis":
      case "strong":
      case "strikethrough":
        return semanticInlineTextForHeading(node.content);
      case "code":
        return node.text;
      case "link":
        return semanticInlineTextForHeading(node.label);
      case "image":
        return node.alt;
      case "soft-break":
      case "hard-break":
        return " ";
      case "footnote-reference":
        return node.label ?? node.identifier;
    }
  }).join("");
}

function alertMatch(node: RootContent): AlertMatch | undefined {
  if (node.type !== "blockquote") return undefined;
  const firstBlock = node.children[0];
  if (firstBlock?.type !== "paragraph") return undefined;
  const firstInline = firstBlock.children[0];
  if (firstInline?.type !== "text") return undefined;
  const match = /^\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\](?:\n|$)/u.exec(
    firstInline.value,
  );
  if (match === null) return undefined;
  const marker = match[1];
  if (marker === undefined || !(marker in ALERTS)) return undefined;
  return {
    marker: marker as keyof typeof ALERTS,
    prefixLength: match[0].length,
  };
}

function adaptBlocks(
  nodes: readonly RootContent[],
  context: AdapterContext,
  depth: number,
): readonly MarkdownBlock[] {
  const blocks: MarkdownBlock[] = [];
  for (const node of nodes) {
    const block = adaptBlock(node, context, depth);
    if (block !== null) blocks.push(block);
  }
  return blocks;
}

function adaptAlert(
  node: Extract<RootContent, { readonly type: "blockquote" }>,
  match: AlertMatch,
  context: AdapterContext,
  depth: number,
): MarkdownCalloutBlock {
  const first = node.children[0];
  if (first?.type !== "paragraph") {
    return fail("Markdown alert classification lost its opening paragraph");
  }
  const opening = adaptInlineChildren(
    first.children,
    context,
    depth + 1,
    match.prefixLength,
  );
  const children: MarkdownBlock[] = [];
  if (inlineHasMeaning(opening)) {
    children.push({ kind: "paragraph", content: opening });
  }
  children.push(...adaptBlocks(node.children.slice(1), context, depth + 1));
  const alert = ALERTS[match.marker];
  return {
    kind: "callout",
    title: alert.title,
    tone: alert.tone,
    children,
  };
}

function adaptList(
  node: Extract<RootContent, { readonly type: "list" }>,
  context: AdapterContext,
  depth: number,
): MarkdownListBlock {
  const ordered = node.ordered === true;
  const hasTasks = node.children.some((item) =>
    item.checked !== null && item.checked !== undefined
  );
  const items = node.children.map((item): MarkdownListItem => {
    const first = item.children[0];
    const content = first?.type === "paragraph"
      ? adaptInlineChildren(first.children, context, depth + 1)
      : undefined;
    const blocks = adaptBlocks(
      first?.type === "paragraph" ? item.children.slice(1) : item.children,
      context,
      depth + 1,
    );
    return {
      ...(content === undefined || !inlineHasMeaning(content)
        ? {}
        : { content }),
      ...(item.checked === null || item.checked === undefined
        ? {}
        : { checked: item.checked }),
      blocks,
    };
  });
  return {
    kind: "list",
    listKind: ordered ? "ordered" : hasTasks ? "task" : "unordered",
    ...(ordered && node.start !== null && node.start !== undefined
      ? { start: node.start }
      : {}),
    spacing:
      node.spread === true || node.children.some((item) => item.spread === true)
        ? "loose"
        : "tight",
    items,
  };
}

function tableAlignment(
  value: "left" | "right" | "center" | null | undefined,
): TerminalAlignment | undefined {
  if (value === null || value === undefined) return undefined;
  return value === "left" ? "start" : value === "right" ? "end" : "center";
}

function adaptTable(
  node: Extract<RootContent, { readonly type: "table" }>,
  context: AdapterContext,
  depth: number,
): MarkdownTableBlock {
  const header = node.children[0];
  if (header === undefined) return fail("Markdown table has no header row");
  const columns = header.children.map((cell, index): MarkdownTableColumn => {
    const align = tableAlignment(node.align?.[index]);
    return {
      header: adaptInlineChildren(cell.children, context, depth + 1),
      ...(align === undefined ? {} : { align }),
    };
  });
  const rows = node.children.slice(1).map((row) =>
    columns.map((_, index) => {
      const cell = row.children[index];
      return cell === undefined
        ? ""
        : adaptInlineChildren(cell.children, context, depth + 1);
    })
  );
  return { kind: "table", columns, rows };
}

function adaptBlock(
  node: RootContent,
  context: AdapterContext,
  depth: number,
): MarkdownBlock | null {
  if (depth > MARKDOWN_MAX_DEPTH) {
    return fail(`Markdown exceeds the ${MARKDOWN_MAX_DEPTH}-level depth limit`);
  }
  switch (node.type) {
    case "paragraph": {
      const content = adaptInlineChildren(node.children, context, depth + 1);
      return inlineHasMeaning(content) ? { kind: "paragraph", content } : null;
    }
    case "heading": {
      const content = adaptInlineChildren(node.children, context, depth + 1);
      return {
        kind: "heading",
        level: node.depth,
        id: githubHeadingSlug(content, context.headingIds),
        content,
      };
    }
    case "list":
      return adaptList(node, context, depth);
    case "blockquote": {
      const alert = alertMatch(node);
      if (alert !== undefined) {
        return adaptAlert(node, alert, context, depth);
      }
      const children = adaptBlocks(node.children, context, depth + 1);
      return children.length === 0 ? null : { kind: "blockquote", children };
    }
    case "code": {
      const language = optionalVisibleText(node.lang);
      const info = optionalVisibleText(node.meta);
      return {
        kind: "code",
        code: visibleCode(node.value),
        ...(language === undefined ? {} : { language }),
        ...(info === undefined ? {} : { info }),
      };
    }
    case "thematicBreak":
      return { kind: "thematic-break" };
    case "table":
      return adaptTable(node, context, depth);
    case "html": {
      const html = visibleText(htmlWithoutComments(node));
      return html.trim() === "" ? null : {
        kind: "paragraph",
        content: [{ kind: "literal", text: html }],
      };
    }
    case "definition":
    case "footnoteDefinition":
      return null;
    case "yaml":
      return fail("Markdown frontmatter is not part of the supported dialect");
    case "break":
    case "delete":
    case "emphasis":
    case "footnoteReference":
    case "image":
    case "imageReference":
    case "inlineCode":
    case "link":
    case "linkReference":
    case "listItem":
    case "strong":
    case "tableCell":
    case "tableRow":
    case "text":
      return fail(`Markdown parser placed ${node.type} at block level`);
    default:
      return assertNever(node, "Markdown block node");
  }
}

function adaptFootnotes(
  context: AdapterContext,
): MarkdownFootnotesBlock | null {
  if (context.orderedFootnotes.length === 0) return null;
  const pending = context.orderedFootnotes.map((footnote) => ({
    footnote,
    children: adaptBlocks(footnote.node.children, context, 1),
  }));
  return {
    kind: "footnotes",
    items: pending.map(({ footnote, children }) => ({
      id: footnote.id,
      label: footnote.label,
      children,
      returnIds: [...footnote.returnIds],
    })),
  };
}

function isolatedImage(
  content: SemanticInlineContent,
): Extract<SemanticInlineNode, { readonly kind: "image" }> | undefined {
  const items = inlineArray(content);
  let image:
    | Extract<SemanticInlineNode, { readonly kind: "image" }>
    | undefined;
  for (const item of items) {
    if (typeof item === "string") {
      if (item.trim() !== "") return undefined;
      continue;
    }
    if (item.kind === "soft-break" || item.kind === "hard-break") continue;
    if (item.kind !== "image" || image !== undefined) return undefined;
    image = item;
  }
  return image;
}

function resolvedDiagram(
  content: SemanticInlineContent,
  resources: ReadonlyMap<string, ValidatedMarkdownDiagramResource>,
): MarkdownDiagramBlock | undefined {
  const image = isolatedImage(content);
  if (image === undefined) return undefined;
  const source = canonicalSource(image.source);
  if (source === undefined) return undefined;
  const resource = resources.get(source);
  if (resource === undefined) return undefined;
  const alternative = diagramAltText(resource.spec);
  if (image.alt !== alternative) {
    fail(
      `Markdown diagram image ${JSON.stringify(source)} alt must equal ${
        JSON.stringify(alternative)
      }`,
    );
  }
  if (image.title !== undefined && image.title !== resource.spec.summary) {
    fail(
      `Markdown diagram image ${JSON.stringify(source)} title must equal ${
        JSON.stringify(resource.spec.summary)
      }`,
    );
  }
  return Object.freeze({
    kind: "diagram",
    source: resource.source,
    spec: resource.spec,
  });
}

function resolveDiagramBlocks(
  blocks: readonly MarkdownBlock[],
  resources: ReadonlyMap<string, ValidatedMarkdownDiagramResource>,
): readonly MarkdownBlock[] {
  return Object.freeze(blocks.map((block): MarkdownBlock => {
    switch (block.kind) {
      case "paragraph":
        return resolvedDiagram(block.content, resources) ?? block;
      case "list":
        return Object.freeze({
          ...block,
          items: Object.freeze(block.items.map((item) => {
            const diagram = item.content === undefined
              ? undefined
              : resolvedDiagram(item.content, resources);
            const nested = resolveDiagramBlocks(item.blocks, resources);
            return Object.freeze({
              ...(diagram === undefined && item.content !== undefined
                ? { content: item.content }
                : {}),
              ...(item.checked === undefined ? {} : { checked: item.checked }),
              blocks: diagram === undefined
                ? nested
                : Object.freeze([diagram, ...nested]),
            });
          })),
        });
      case "blockquote":
      case "callout":
        return Object.freeze({
          ...block,
          children: resolveDiagramBlocks(block.children, resources),
        });
      case "footnotes":
        return Object.freeze({
          ...block,
          items: Object.freeze(block.items.map((item) =>
            Object.freeze({
              ...item,
              children: resolveDiagramBlocks(item.children, resources),
            })
          )),
        });
      case "heading":
      case "code":
      case "thematic-break":
      case "table":
      case "diagram":
        return block;
      default:
        return assertNever(block, "Markdown diagram resolver block");
    }
  }));
}

function resolveMarkdownDiagrams(
  document: MarkdownDocument,
  resources: readonly ValidatedMarkdownDiagramResource[],
): MarkdownDocument {
  if (resources.length === 0 || document.children.length === 0) return document;
  const bySource = new Map(
    resources.map((resource) => [resource.source, resource]),
  );
  return Object.freeze({
    kind: "document",
    children: resolveDiagramBlocks(document.children, bySource),
  });
}

/** Parse untrusted source into the one internal document consumed by both projections. */
export function parseMarkdown(
  source: string,
  options: ParseMarkdownOptions = {},
): MarkdownDocument {
  if (typeof source !== "string") {
    return fail("Markdown source must be a string");
  }
  const diagramResources = validateMarkdownDiagramResources(options.diagrams);
  const bytes = textEncoder.encode(source).byteLength;
  if (bytes > MARKDOWN_MAX_SOURCE_BYTES) {
    return fail(
      `Markdown source exceeds the ${MARKDOWN_MAX_SOURCE_BYTES}-byte limit`,
    );
  }
  if (source.trim() === "") return { kind: "document", children: [] };

  let root: Root;
  try {
    root = fromMarkdown(source, {
      extensions: [gfm()],
      mdastExtensions: [gfmFromMarkdown()],
    });
  } catch (cause) {
    return fail("Markdown source could not be parsed", cause);
  }

  try {
    const scanned = scanParserTree(root);
    const context: AdapterContext = {
      ...scanned,
      headingIds: new Set(),
    };
    const children = [...adaptBlocks(root.children, context, 1)];
    const footnotes = adaptFootnotes(context);
    if (footnotes !== null) children.push(footnotes);
    return resolveMarkdownDiagrams(
      { kind: "document", children },
      diagramResources,
    );
  } catch (cause) {
    if (cause instanceof MarkdownParseError) throw cause;
    return fail("Markdown parser output could not be adapted safely", cause);
  }
}
