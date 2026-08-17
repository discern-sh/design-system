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
import type {
  SemanticInlineContent,
  SemanticInlineNode,
} from "../../../cli/semantic-inline.ts";
import type { TerminalThemeVariant } from "../../../cli/theme.ts";
import renderDividerCli from "../../display/divider/divider.cli.ts";
import renderHeadingCli from "../../display/heading/heading.cli.ts";
import renderTableCli from "../../display/table/table.cli.ts";
import renderBlockquoteCli from "../blockquote/blockquote.cli.ts";
import renderCalloutCli from "../callout/callout.cli.ts";
import renderCodeBlockCli from "../code-block/code-block.cli.ts";
import renderFootnotesCli from "../footnotes/footnotes.cli.ts";
import renderListCli from "../list/list.cli.ts";
import renderParagraphCli from "../paragraph/paragraph.cli.ts";
import {
  type MarkdownBlock,
  MarkdownParseError,
  parseMarkdown,
} from "./markdown.model.ts";

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

function cliInlineNode(node: SemanticInlineNode): SemanticInlineNode {
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
      return { ...node, content: cliInline(node.content) };
    case "link":
      return { ...node, label: cliInline(node.label) };
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

function cliInline(content: SemanticInlineContent): SemanticInlineContent {
  return typeof content === "string"
    ? content
    : content.map((item) =>
      typeof item === "string" ? item : cliInlineNode(item)
    );
}

interface MarkdownCliPresentation {
  readonly theme: TerminalThemeVariant;
  readonly motif: TerminalMotif;
}

function blockToCli(
  block: MarkdownBlock,
  presentation: MarkdownCliPresentation,
): CliBlock {
  switch (block.kind) {
    case "paragraph":
      return createCliBlock(renderParagraphCli, {
        content: cliInline(block.content),
        ...presentation,
      });
    case "heading":
      return createCliBlock(renderHeadingCli, {
        content: cliInline(block.content),
        level: block.level,
        overflow: "wrap",
        treatment: "document",
        leadingBlankLines: 0,
        ...presentation,
      });
    case "list":
      return createCliBlock(renderListCli, {
        kind: block.listKind,
        ...(block.start === undefined ? {} : { start: block.start }),
        spacing: block.spacing,
        items: block.items.map((item) => ({
          ...(item.content === undefined
            ? {}
            : { content: cliInline(item.content) }),
          ...(item.checked === undefined ? {} : { checked: item.checked }),
          ...(item.blocks.length === 0 ? {} : {
            blocks: item.blocks.map((child) => blockToCli(child, presentation)),
          }),
        })),
        ...presentation,
      });
    case "blockquote":
      return createCliBlock(renderBlockquoteCli, {
        children: block.children.map((child) =>
          blockToCli(child, presentation)
        ),
        ...presentation,
      });
    case "callout":
      return createCliBlock(renderCalloutCli, {
        title: block.title,
        tone: block.tone,
        children: block.children.map((child) =>
          blockToCli(child, presentation)
        ),
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
          header: cliInline(column.header),
          ...(column.align === undefined ? {} : { align: column.align }),
        })),
        rows: block.rows.map((row) => row.map(cliInline)),
        ...presentation,
      });
    case "footnotes":
      return createCliBlock(renderFootnotesCli, {
        items: block.items.map((item) => ({
          id: item.id,
          content: item.children.length === 1 &&
              item.children[0]?.kind === "paragraph"
            ? cliInline(item.children[0].content) as readonly (
              | string
              | SemanticInlineNode
            )[]
            : {
              kind: "blocks" as const,
              children: item.children.map((child) =>
                blockToCli(child, presentation)
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
    default:
      return assertNever(block);
  }
}

/** Render one complete Markdown document without I/O or environment reads. */
const renderMarkdownCli: CliRenderer<MarkdownCliProps> = (
  props,
  capabilities: TerminalCapabilities,
) => {
  const document = parseMarkdown(props.source);
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
  return renderCliBlocks(
    document.children.map((block) => blockToCli(block, presentation)),
    presenter.capabilities,
  );
};

export default renderMarkdownCli;
