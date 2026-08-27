import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Blockquote } from "../blockquote/blockquote.tsx";
import { CodeBlock } from "../code-block/code-block.tsx";
import { List } from "../list/list.tsx";
import { Paragraph } from "../paragraph/paragraph.tsx";
import meta, { componentExampleVocabulary } from "./footnotes.meta.ts";
import { Footnotes } from "./footnotes.tsx";

function SourceNotesExample() {
  return (
    <>
      <Paragraph>
        A claim can point to a source{" "}
        <sup id="example-source-note-ref">
          <a href="#example-source-note">[1]</a>
        </sup>.
      </Paragraph>
      <Footnotes
        items={[{
          id: "example-source-note",
          content: (
            <Paragraph>
              The source remains a distinct, addressable definition.
            </Paragraph>
          ),
          backReferences: [{ href: "#example-source-note-ref" }],
        }]}
      />
    </>
  );
}

function RichMultiBlockNotesExample() {
  return (
    <>
      <Paragraph>
        The same note can be cited{" "}
        <sup id="example-rich-note-ref-1">
          <a href="#example-rich-note">[1]</a>
        </sup>{" "}
        from more than one place{" "}
        <sup id="example-rich-note-ref-2">
          <a href="#example-rich-note">[1]</a>
        </sup>.
      </Paragraph>
      <Footnotes
        items={[{
          id: "example-rich-note",
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
            { href: "#example-rich-note-ref-1", label: "1" },
            { href: "#example-rich-note-ref-2", label: "2" },
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
    { id: "default", Example: SourceNotesExample },
    { id: "rich-multi-block", Example: RichMultiBlockNotesExample },
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
