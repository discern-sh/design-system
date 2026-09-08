import { useId } from "react";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { Blockquote } from "../blockquote/blockquote.tsx";
import { CodeBlock } from "../code-block/code-block.tsx";
import { List } from "../list/list.tsx";
import { Paragraph } from "../paragraph/paragraph.tsx";
import meta, { componentExampleVocabulary } from "./footnotes.meta.ts";
import { Footnotes } from "./footnotes.tsx";

function SourceNotesExample() {
  const prefix = `example-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <>
      <Paragraph>
        A claim can point to a source{" "}
        <sup>
          <a
            id={id("example-source-note-ref")}
            href={`#${id("example-source-note")}`}
          >
            [1]
          </a>
        </sup>.
      </Paragraph>
      <Footnotes
        items={[{
          id: id("example-source-note"),
          content: (
            <Paragraph>
              The source remains a distinct, addressable definition.
            </Paragraph>
          ),
          backReferences: [{ href: `#${id("example-source-note-ref")}` }],
        }]}
      />
    </>
  );
}

function RichMultiBlockNotesExample() {
  const prefix = `example-${useId()}`;
  const id = (name: string) => `${prefix}-${name}`;
  return (
    <>
      <Paragraph>
        The same note can be cited{" "}
        <sup>
          <a
            id={id("example-rich-note-ref-1")}
            href={`#${id("example-rich-note")}`}
          >
            [1]
          </a>
        </sup>{" "}
        from more than one place{" "}
        <sup>
          <a
            id={id("example-rich-note-ref-2")}
            href={`#${id("example-rich-note")}`}
          >
            [1]
          </a>
        </sup>.
      </Paragraph>
      <Footnotes
        items={[{
          id: id("example-rich-note"),
          content: (
            <>
              <Paragraph>
                Rich note bodies retain <strong>phrasing</strong> and{" "}
                <a href="https://example.test/source">source links</a>.
              </Paragraph>
              <List items={[{ content: <>One supporting observation.</> }]} />
              <Blockquote>
                <Paragraph>A qualification remains a quotation.</Paragraph>
              </Blockquote>
              <CodeBlock code="sample = complete" language="text" />
            </>
          ),
          backReferences: [
            { href: `#${id("example-rich-note-ref-1")}`, label: "1" },
            { href: `#${id("example-rich-note-ref-2")}`, label: "2" },
          ],
        }]}
      />
    </>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "default",
      Example: SourceNotesExample,
      capture: {
        selectors: [
          ":scope > .discern-paragraph",
          ":scope > .discern-footnotes",
        ],
      },
    },
    {
      id: "rich-multi-block",
      Example: RichMultiBlockNotesExample,
      capture: {
        selectors: [
          ":scope > .discern-paragraph",
          ":scope > .discern-footnotes",
        ],
      },
    },
  ],
);

export default function FootnotesExamples() {
  return (
    <div className="discern-example-stack">
      <SourceNotesExample />
      <RichMultiBlockNotesExample />
    </div>
  );
}

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "second-reference-return",
    label: "Return to the second reference",
    example: "rich-multi-block",
    category: "interaction",
    sequence: [
      {
        action: "focus",
        target: { selector: '[id$="-example-rich-note-ref-2"]' },
      },
      {
        action: "click",
        target: { selector: '[id$="-example-rich-note-ref-2"]' },
      },
      { expect: "focused", target: { selector: '[id$="-example-rich-note"]' } },
      {
        action: "focus",
        target: { selector: 'a[href$="-example-rich-note-ref-2"]' },
      },
      {
        action: "click",
        target: { selector: 'a[href$="-example-rich-note-ref-2"]' },
      },
      {
        expect: "focused",
        target: { selector: '[id$="-example-rich-note-ref-2"]' },
      },
      {
        checkpoint: {
          id: "second-reference-focus",
          label: "Second citation receives focus",
        },
      },
    ],
  }],
);
