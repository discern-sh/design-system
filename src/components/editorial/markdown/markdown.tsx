import { forwardRef, Fragment } from "react";
import type { HTMLAttributes, ReactNode } from "react";
import type {
  SemanticInlineContent,
  SemanticInlineNode,
} from "../../../cli/semantic-inline.ts";
import { Divider } from "../../display/divider/divider.tsx";
import { Heading } from "../../display/heading/heading.tsx";
import { Table, tableCellAlignmentProps } from "../../display/table/table.tsx";
import type { DiscernComponent } from "../../component-type.ts";
import { classNames } from "../../class-names.ts";
import { Blockquote } from "../blockquote/blockquote.tsx";
import { Callout } from "../callout/callout.tsx";
import { CodeBlock } from "../code-block/code-block.tsx";
import { Footnotes } from "../footnotes/footnotes.tsx";
import { List } from "../list/list.tsx";
import { Paragraph } from "../paragraph/paragraph.tsx";
import { Prose } from "../prose/prose.tsx";
import type { ProseMeasure } from "../prose/prose.types.ts";
import {
  type MarkdownBlock,
  type MarkdownDocument,
  MarkdownParseError,
  parseMarkdown,
} from "./markdown.model.ts";

export { MarkdownParseError } from "./markdown.model.ts";

/** Props for the {@linkcode Markdown} component. */
export interface MarkdownProps extends
  Omit<
    HTMLAttributes<HTMLDivElement>,
    "children" | "dangerouslySetInnerHTML"
  > {
  /** Untrusted CommonMark/GFM source rendered through the fixed package dialect. */
  readonly source: string;
  /** Browser reading measure inherited from Prose. */
  readonly measure?: ProseMeasure;
}

interface ReactProjectionContext {
  readonly referenceCounts: Map<string, number>;
}

const SOFT_BREAK_TEXT = "\n";

/** Closed block registry asserted by Markdown projection tests. */
export const MARKDOWN_REACT_HANDLED_BLOCK_KINDS = {
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

function assertNever(value: never): never {
  throw new MarkdownParseError(
    `Markdown React projection has no handler for ${String(value)}`,
  );
}

function renderInlineNode(
  node: SemanticInlineNode,
  context: ReactProjectionContext,
  key: string,
): ReactNode {
  switch (node.kind) {
    case "text":
    case "literal":
      return <Fragment key={key}>{node.text}</Fragment>;
    case "emphasis":
      return <em key={key}>{renderInline(node.content, context, key)}</em>;
    case "strong":
      return (
        <strong key={key}>{renderInline(node.content, context, key)}</strong>
      );
    case "strikethrough":
      return <del key={key}>{renderInline(node.content, context, key)}</del>;
    case "code":
      return <code key={key}>{node.text}</code>;
    case "link":
      return (
        <a href={node.destination} title={node.title} key={key}>
          {renderInline(node.label, context, key)}
        </a>
      );
    case "image":
      return (
        <img
          src={node.source}
          alt={node.alt}
          title={node.title}
          key={key}
        />
      );
    case "soft-break":
      return <Fragment key={key}>{SOFT_BREAK_TEXT}</Fragment>;
    case "hard-break":
      return <br key={key} />;
    case "footnote-reference": {
      const occurrence = (context.referenceCounts.get(node.identifier) ?? 0) +
        1;
      context.referenceCounts.set(node.identifier, occurrence);
      const label = node.label ?? node.identifier;
      const referenceId = occurrence === 1
        ? `fnref-${label}`
        : `fnref-${label}-${occurrence}`;
      return (
        <sup
          className="discern-markdown__footnote-reference"
          id={referenceId}
          key={key}
        >
          <a
            href={`#${node.identifier}`}
            aria-label={`See note ${label}, reference ${occurrence}`}
          >
            [{label}]
          </a>
        </sup>
      );
    }
    default:
      return assertNever(node);
  }
}

function renderInline(
  content: SemanticInlineContent,
  context: ReactProjectionContext,
  keyPrefix: string,
): ReactNode {
  if (typeof content === "string") return content;
  return content.map((item, index) =>
    typeof item === "string"
      ? <Fragment key={`${keyPrefix}-${index}`}>{item}</Fragment>
      : renderInlineNode(item, context, `${keyPrefix}-${index}`)
  );
}

function renderBlock(
  block: MarkdownBlock,
  context: ReactProjectionContext,
  key: string,
): ReactNode {
  switch (block.kind) {
    case "paragraph":
      return (
        <Paragraph key={key}>
          {renderInline(block.content, context, `${key}-inline`)}
        </Paragraph>
      );
    case "heading":
      return (
        <Heading level={block.level} id={block.id} key={key}>
          {renderInline(block.content, context, `${key}-inline`)}
        </Heading>
      );
    case "list":
      return (
        <List
          kind={block.listKind}
          {...(block.start === undefined ? {} : { start: block.start })}
          spacing={block.spacing}
          items={block.items.map((item, itemIndex) => ({
            ...(item.content === undefined ? {} : {
              content: renderInline(
                item.content,
                context,
                `${key}-item-${itemIndex}`,
              ),
            }),
            ...(item.checked === undefined ? {} : { checked: item.checked }),
            ...(item.blocks.length === 0 ? {} : {
              blocks: item.blocks.map((child, childIndex) =>
                renderBlock(
                  child,
                  context,
                  `${key}-item-${itemIndex}-block-${childIndex}`,
                )
              ),
            }),
          }))}
          key={key}
        />
      );
    case "blockquote":
      return (
        <Blockquote key={key}>
          {block.children.map((child, index) =>
            renderBlock(child, context, `${key}-${index}`)
          )}
        </Blockquote>
      );
    case "callout":
      return (
        <Callout title={block.title} tone={block.tone} key={key}>
          {block.children.map((child, index) =>
            renderBlock(child, context, `${key}-${index}`)
          )}
        </Callout>
      );
    case "code":
      return (
        <CodeBlock
          code={block.code}
          {...(block.language === undefined
            ? {}
            : { language: block.language })}
          {...(block.info === undefined ? {} : { info: block.info })}
          key={key}
        />
      );
    case "thematic-break":
      return <Divider key={key} />;
    case "table":
      return (
        <Table key={key}>
          <thead>
            <tr>
              {block.columns.map((column, index) => (
                <th
                  scope="col"
                  {...tableCellAlignmentProps(column.align)}
                  key={`${key}-header-${index}`}
                >
                  {renderInline(
                    column.header,
                    context,
                    `${key}-header-${index}`,
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.map((row, rowIndex) => (
              <tr key={`${key}-row-${rowIndex}`}>
                {row.map((cell, columnIndex) => (
                  <td
                    {...tableCellAlignmentProps(
                      block.columns[columnIndex]?.align,
                    )}
                    key={`${key}-row-${rowIndex}-cell-${columnIndex}`}
                  >
                    {renderInline(
                      cell,
                      context,
                      `${key}-row-${rowIndex}-cell-${columnIndex}`,
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>
      );
    case "footnotes":
      return (
        <Footnotes
          items={block.items.map((item, itemIndex) => ({
            id: item.id,
            content: item.children.map((child, childIndex) =>
              renderBlock(
                child,
                context,
                `${key}-item-${itemIndex}-block-${childIndex}`,
              )
            ),
            ...(item.returnIds.length === 0 ? {} : {
              backReferences: item.returnIds.map((id, index) => ({
                href: `#${id}`,
                label: String(index + 1),
              })),
            }),
          }))}
          key={key}
        />
      );
    default:
      return assertNever(block);
  }
}

function renderDocument(document: MarkdownDocument): readonly ReactNode[] {
  const context: ReactProjectionContext = { referenceCounts: new Map() };
  return document.children.map((block, index) =>
    renderBlock(block, context, `markdown-block-${index}`)
  );
}

/**
 * Safe semantic Markdown document composed from the package's real browser
 * Components. Empty source renders no wrapper or placeholder.
 */
export const Markdown: DiscernComponent<HTMLDivElement, MarkdownProps> =
  forwardRef<HTMLDivElement, MarkdownProps>(function Markdown(
    { source, measure = "default", className, ...props },
    ref,
  ) {
    const document = parseMarkdown(source);
    if (document.children.length === 0) return null;
    return (
      <Prose
        ref={ref}
        className={classNames("discern-markdown", className)}
        measure={measure}
        {...props}
      >
        {renderDocument(document)}
      </Prose>
    );
  });
