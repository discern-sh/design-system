/**
 * Pure terminal projection of the package-owned neutral Markdown document.
 *
 * @module
 */

import type { TerminalCapabilities } from "../../../cli/capabilities.ts";
import {
  type CliBlock,
  createCliBlock,
  renderCliBlocks,
} from "../../../cli/block-composition.ts";
import type { CliExample, CliRenderer } from "../../../cli/contracts.ts";
import type { TerminalMotif } from "../../../cli/motif.ts";
import { createCliPresenter } from "../../../cli/presenter.ts";
import {
  type SemanticInlineContent,
  type SemanticInlineNode,
  semanticInlineText,
} from "../../../cli/semantic-inline.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import {
  markdownChartExampleMarkdown,
  markdownChartExampleResource,
} from "../../../chart/markdown.example.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleResource,
} from "../../../diagram/markdown.example.ts";
import { hyperlinkSequence } from "../../../cli/styled-sequences.ts";
import renderDividerCli from "../../display/divider/divider.cli.ts";
import renderHeadingCli from "../../display/heading/heading.cli.ts";
import renderTableCli from "../../display/table/table.cli.ts";
import renderBlockquoteCli from "../blockquote/blockquote.cli.ts";
import renderCalloutCli from "../callout/callout.cli.ts";
import renderChartCli from "../chart/chart.cli.ts";
import type { ChartCliMode } from "../chart/chart.cli.ts";
import renderCodeBlockCli from "../code-block/code-block.cli.ts";
import renderDiagramCli from "../diagram/diagram.cli.ts";
import type { DiagramCliMode } from "../diagram/diagram.cli.ts";
import renderFootnotesCli from "../footnotes/footnotes.cli.ts";
import renderListCli from "../list/list.cli.ts";
import renderParagraphCli from "../paragraph/paragraph.cli.ts";
import {
  type MarkdownBlock,
  type MarkdownDocument,
  MarkdownParseError,
  parseMarkdown,
} from "./markdown.model.ts";
import type { MarkdownChartResource } from "../../../chart/markdown.ts";
import type { MarkdownDiagramResource } from "../../../diagram/markdown.ts";

/** Inputs accepted by the terminal Markdown renderer. */
export interface MarkdownCliProps {
  /** Untrusted CommonMark/GFM source rendered through the fixed package dialect. */
  readonly source: string;
  /** Explicit terminal Theme variant; defaults to dark. */
  readonly theme?: TerminalThemeVariant;
  /** Optional package-validated terminal motif forwarded to child Components. */
  readonly motif?: TerminalMotif;
  /** Maximum document measure in cells, bounded by terminal capabilities. */
  readonly maxWidth?: number;
  /** Explicit ordinary-image resources eligible for Diagram promotion. */
  readonly diagrams?: readonly MarkdownDiagramResource[];
  /** Diagram projection preference; defaults to automatic enhanced fallback. */
  readonly diagramMode?: DiagramCliMode;
  /** Explicit ordinary-image resources eligible for Chart promotion. */
  readonly charts?: readonly MarkdownChartResource[];
  /** Chart projection preference; defaults to automatic exact-frame fallback. */
  readonly chartMode?: ChartCliMode;
}

/** One semantic Markdown link identified before terminal wrapping. */
export interface MarkdownCliProjectedLink {
  readonly id: string;
  readonly destination: string;
  readonly projectionTarget: string;
}

/** One neutral Markdown heading identified in projected terminal output. */
export interface MarkdownCliProjectedHeading {
  readonly id: string;
  readonly projectionTarget: string;
}

/** Browser-specific semantic facts paired with package-rendered Markdown. */
export interface MarkdownCliProjection {
  readonly output: string;
  readonly links: readonly MarkdownCliProjectedLink[];
  readonly headings: readonly MarkdownCliProjectedHeading[];
}

/** Focus decoration selected by the interactive Markdown browser. */
export interface MarkdownCliProjectionOptions {
  readonly focusedLinkId?: string;
  readonly focusOrigin?: "keyboard" | "pointer";
}

/** Closed block registry asserted by Markdown projection tests. */
export const MARKDOWN_CLI_HANDLED_BLOCK_KINDS = {
  paragraph: "rendered",
  heading: "rendered",
  list: "rendered",
  blockquote: "rendered",
  callout: "rendered",
  code: "rendered",
  "thematic-break": "rendered",
  table: "rendered",
  footnotes: "rendered",
  diagram: "rendered",
  chart: "rendered",
} as const satisfies Readonly<Record<MarkdownBlock["kind"], "rendered">>;

const compactSource = `# A measured document

Use **semantic components** for [safe references](https://example.test/reference).

- Preserve the hierarchy
- Keep every target visible`;

const fullDialectSource = `# Full dialect

Setext heading
--------------

Escapes, &amp; entities, *emphasis*, **strong text**, ~~removed text~~, \`inline code\`, and an autolink: https://example.test.

> [!IMPORTANT]
> Alerts retain nested content.
>
> - [x] Reviewed
> - [ ] Ready to verify

3. Ordered from three
4. Second item

| Surface | Alignment |
| :------ | --------: |
| Browser | Semantic |
| CLI | Deterministic |

---

\`\`\`ts module
const complete = true;
export { complete };
\`\`\`

A repeated note[^proof] remains linked[^proof].

[^proof]: The definition can contain more than one block.

    > Including a quotation.`;

const deepSource = `> Outer quotation
>
> 1. Ordered item
>    - Nested item
>      > Inner quotation
>      >
>      > \`\`\`text
>      > literal *source*
>      > \`\`\``;

const readingHierarchySource = `# Reading foundations

Use \`semanticInlineText()\` when plain output must remain lossless.

## Document boundary

### Section marker

#### Strong subsection

##### Quiet subsection

###### Supporting note`;

const hostileSource = `<script>alert("inert")</script>

[Unsafe link](javascript:alert(1)) and ![unsafe image](data:text/html,boom).

<!-- omitted comment -->

Control notation remains visible: [31mred[0m‮.`;

/** Deterministic Markdown documents rendered by the CLI Catalogue. */
export const cliExamples: readonly CliExample<MarkdownCliProps>[] = [
  {
    name: "compact-document",
    props: { source: compactSource, maxWidth: 68 },
  },
  {
    name: "full-dialect",
    props: { source: fullDialectSource, maxWidth: 72 },
  },
  {
    name: "deep-nesting",
    props: { source: deepSource, maxWidth: 52 },
  },
  {
    name: "reading-hierarchy",
    props: { source: readingHierarchySource, maxWidth: 52 },
  },
  {
    name: "reading-hierarchy-narrow-no-colour",
    props: { source: readingHierarchySource, maxWidth: 24 },
    capabilities: {
      ansiControl: false,
      colorDepth: "none",
      columns: 24,
      hyperlinks: false,
      unicode: false,
    },
  },
  {
    name: "hostile-inert-source",
    props: { source: hostileSource, maxWidth: 52 },
  },
  {
    name: "diagram-resource-auto",
    props: {
      source: markdownDiagramExampleMarkdown,
      diagrams: [markdownDiagramExampleResource],
      maxWidth: 76,
    },
  },
  {
    name: "diagram-resource-description",
    props: {
      source: markdownDiagramExampleMarkdown,
      diagrams: [markdownDiagramExampleResource],
      diagramMode: "description",
      maxWidth: 52,
    },
  },
  {
    name: "chart-resource-auto",
    props: {
      source: markdownChartExampleMarkdown,
      charts: [markdownChartExampleResource],
      maxWidth: 76,
    },
  },
  {
    name: "chart-resource-description",
    props: {
      source: markdownChartExampleMarkdown,
      charts: [markdownChartExampleResource],
      chartMode: "description",
      maxWidth: 52,
    },
  },
  {
    name: "narrow-ascii-no-colour",
    props: { source: compactSource, maxWidth: 24 },
    capabilities: {
      ansiControl: false,
      colorDepth: "none",
      columns: 24,
      hyperlinks: false,
      unicode: false,
    },
  },
] as const;

function assertNever(value: never): never {
  throw new MarkdownParseError(
    `Markdown CLI projection has no handler for ${String(value)}`,
  );
}

interface MarkdownCliTracking {
  readonly links: MarkdownCliProjectedLink[];
  readonly headings: MarkdownCliProjectedHeading[];
  readonly focusedLinkId: string | undefined;
  readonly focusOrigin: "keyboard" | "pointer" | undefined;
  readonly unicode: boolean;
  readonly textualLinkFallback: boolean;
}

interface MarkdownCliContext {
  readonly presentation: MarkdownCliPresentation;
  readonly diagramMode: DiagramCliMode;
  readonly chartMode: ChartCliMode;
  readonly tracking?: MarkdownCliTracking;
}

function trackedTarget(kind: "link" | "heading", index: number): string {
  return `https://discern.invalid/markdown-browser/${kind}/${index}`;
}

function decoratedLinkLabel(
  label: SemanticInlineContent,
  origin: "keyboard" | "pointer",
  unicode: boolean,
): SemanticInlineContent {
  const [before, after] = origin === "pointer"
    ? unicode ? ["◆", "◆"] : ["*", "*"]
    : unicode
    ? ["›", "‹"]
    : [">", "<"];
  return typeof label === "string"
    ? [before, label, after]
    : [before, ...label, after];
}

function fallbackLinkLabel(
  label: SemanticInlineContent,
  destination: string,
): SemanticInlineContent {
  return semanticInlineText(label) === destination
    ? label
    : typeof label === "string"
    ? [label, ` (${destination})`]
    : [...label, ` (${destination})`];
}

function cliInlineNode(
  node: SemanticInlineNode,
  context: MarkdownCliContext,
): SemanticInlineNode {
  switch (node.kind) {
    case "text":
    case "literal":
    case "code":
    case "soft-break":
    case "hard-break":
    case "footnote-reference":
      return node;
    case "emphasis":
    case "strong":
    case "strikethrough":
      return { ...node, content: cliInline(node.content, context) };
    case "link": {
      const label = cliInline(node.label, context);
      const tracking = context.tracking;
      if (tracking === undefined) return { ...node, label };
      const id = `link-${tracking.links.length}`;
      const projectionTarget = trackedTarget("link", tracking.links.length);
      tracking.links.push({
        id,
        destination: node.destination,
        projectionTarget,
      });
      const focused = tracking.focusedLinkId === id;
      const projectedLabel = tracking.textualLinkFallback
        ? fallbackLinkLabel(label, node.destination)
        : label;
      return {
        ...node,
        label: focused
          ? decoratedLinkLabel(
            projectedLabel,
            tracking.focusOrigin ?? "keyboard",
            tracking.unicode,
          )
          : projectedLabel,
        destination: projectionTarget,
      };
    }
    case "image":
      return node.alt === ""
        ? {
          kind: "literal",
          text: `Image (${node.source})`,
        }
        : node;
    default:
      return assertNever(node);
  }
}

function cliInline(
  content: SemanticInlineContent,
  context: MarkdownCliContext,
): SemanticInlineContent {
  return typeof content === "string"
    ? content
    : content.map((item) =>
      typeof item === "string" ? item : cliInlineNode(item, context)
    );
}

interface MarkdownCliPresentation {
  readonly theme: TerminalThemeVariant;
  readonly motif: TerminalMotif;
}

function blockToCli(
  block: MarkdownBlock,
  context: MarkdownCliContext,
): CliBlock {
  const { presentation } = context;
  switch (block.kind) {
    case "paragraph":
      return createCliBlock(renderParagraphCli, {
        content: cliInline(block.content, context),
        ...presentation,
      });
    case "heading": {
      const props = {
        content: cliInline(block.content, context),
        level: block.level,
        overflow: "wrap",
        treatment: "document",
        leadingBlankLines: 0,
        ...presentation,
      } as const;
      const tracking = context.tracking;
      if (tracking === undefined) {
        return createCliBlock(renderHeadingCli, props);
      }
      const projectionTarget = trackedTarget(
        "heading",
        tracking.headings.length,
      );
      tracking.headings.push({ id: block.id, projectionTarget });
      return createCliBlock(
        (value, capabilities) =>
          `${hyperlinkSequence(projectionTarget)}${
            renderHeadingCli(value, capabilities)
          }${hyperlinkSequence("")}`,
        props,
      );
    }
    case "list":
      return createCliBlock(renderListCli, {
        kind: block.listKind,
        ...(block.start === undefined ? {} : { start: block.start }),
        spacing: block.spacing,
        items: block.items.map((item) => ({
          ...(item.content === undefined
            ? {}
            : { content: cliInline(item.content, context) }),
          ...(item.checked === undefined ? {} : { checked: item.checked }),
          ...(item.blocks.length === 0 ? {} : {
            blocks: item.blocks.map((child) => blockToCli(child, context)),
          }),
        })),
        ...presentation,
      });
    case "blockquote":
      return createCliBlock(renderBlockquoteCli, {
        children: block.children.map((child) => blockToCli(child, context)),
        ...presentation,
      });
    case "callout":
      return createCliBlock(renderCalloutCli, {
        title: block.title,
        tone: block.tone,
        children: block.children.map((child) => blockToCli(child, context)),
        ...presentation,
      });
    case "code":
      return createCliBlock(renderCodeBlockCli, {
        code: block.code,
        ...(block.language === undefined ? {} : { language: block.language }),
        ...(block.info === undefined ? {} : { info: block.info }),
        widthPolicy: "wrap",
        ...presentation,
      });
    case "thematic-break":
      return createCliBlock(renderDividerCli, {
        treatment: "plain",
        tone: "neutral",
        ...presentation,
      });
    case "table":
      return createCliBlock(renderTableCli, {
        layout: "responsive",
        columns: block.columns.map((column) => ({
          header: cliInline(column.header, context),
          ...(column.align === undefined ? {} : { align: column.align }),
        })),
        rows: block.rows.map((row) =>
          row.map((content) => cliInline(content, context))
        ),
        ...presentation,
      });
    case "footnotes":
      return createCliBlock(renderFootnotesCli, {
        items: block.items.map((item) => ({
          id: item.id,
          content: item.children.length === 1 &&
              item.children[0]?.kind === "paragraph"
            ? cliInline(item.children[0].content, context) as readonly (
              | string
              | SemanticInlineNode
            )[]
            : {
              kind: "blocks" as const,
              children: item.children.map((child) =>
                blockToCli(child, context)
              ),
            },
          ...(item.returnIds.length === 0 ? {} : {
            returnReferences: item.returnIds.map((id, index) => ({
              href: `#${id}`,
              label: String(index + 1),
            })),
          }),
        })),
        ...presentation,
      });
    case "diagram":
      return createCliBlock(renderDiagramCli, {
        spec: block.spec,
        mode: context.diagramMode,
        theme: presentation.theme,
      });
    case "chart":
      return createCliBlock(renderChartCli, {
        spec: block.spec,
        mode: context.chartMode,
        theme: presentation.theme,
      });
    default:
      return assertNever(block);
  }
}

function renderMarkdownDocument(
  document: MarkdownDocument,
  props: MarkdownCliProps,
  capabilities: TerminalCapabilities,
  tracking?: MarkdownCliTracking,
): string {
  if (document.children.length === 0) return "";
  const presenter = createCliPresenter(capabilities, {
    ...(props.theme === undefined ? {} : { theme: props.theme }),
    ...(props.motif === undefined ? {} : { motif: props.motif }),
    ...(props.maxWidth === undefined ? {} : { width: props.maxWidth }),
  });
  const presentation = {
    theme: presenter.theme,
    motif: presenter.motif,
  } satisfies MarkdownCliPresentation;
  const context: MarkdownCliContext = {
    presentation,
    diagramMode: props.diagramMode ?? "auto",
    chartMode: props.chartMode ?? "auto",
    ...(tracking === undefined ? {} : { tracking }),
  };
  return renderCliBlocks(
    document.children.map((block) => blockToCli(block, context)),
    presenter.capabilities,
  );
}

/**
 * Render Markdown with browser-only synthetic link and heading identities.
 * The identities travel through the normal Component wrapping path as OSC 8
 * targets, then the browser's projection authority remaps or removes them
 * before terminal output. They never reach a caller's terminal unchanged.
 */
export function renderMarkdownCliProjection(
  props: MarkdownCliProps,
  capabilities: TerminalCapabilities,
  options: MarkdownCliProjectionOptions = {},
): MarkdownCliProjection {
  const document = parseMarkdown(props.source, {
    ...(props.diagrams === undefined ? {} : { diagrams: props.diagrams }),
    ...(props.charts === undefined ? {} : { charts: props.charts }),
  });
  const links: MarkdownCliProjectedLink[] = [];
  const headings: MarkdownCliProjectedHeading[] = [];
  const tracking: MarkdownCliTracking = {
    links,
    headings,
    focusedLinkId: options.focusedLinkId,
    focusOrigin: options.focusOrigin,
    unicode: capabilities.unicode,
    textualLinkFallback: !(capabilities.hyperlinks ??
      capabilities.colorDepth !== "none"),
  };
  const output = renderMarkdownDocument(
    document,
    props,
    { ...capabilities, hyperlinks: true },
    tracking,
  );
  return Object.freeze({
    output,
    links: Object.freeze(links),
    headings: Object.freeze(headings),
  });
}

/** Render one complete Markdown document without I/O or environment reads. */
const renderMarkdownCli: CliRenderer<MarkdownCliProps> = (
  props,
  capabilities: TerminalCapabilities,
) => {
  const document = parseMarkdown(props.source, {
    ...(props.diagrams === undefined ? {} : { diagrams: props.diagrams }),
    ...(props.charts === undefined ? {} : { charts: props.charts }),
  });
  return renderMarkdownDocument(document, props, capabilities);
};

export default renderMarkdownCli;
