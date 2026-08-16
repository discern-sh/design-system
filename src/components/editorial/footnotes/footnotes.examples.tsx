import { Blockquote } from "../blockquote/blockquote.tsx";
import { CodeBlock } from "../code-block/code-block.tsx";
import { List } from "../list/list.tsx";
import { Paragraph } from "../paragraph/paragraph.tsx";
import { Footnotes } from "./footnotes.tsx";

export default function FootnotesExamples() {
  return (
    <>
      <Paragraph>
        The same note can be cited{" "}
        <sup id="example-note-1-ref-1">
          <a href="#example-note-1">[1]</a>
        </sup>{" "}
        from more than one place{" "}
        <sup id="example-note-1-ref-2">
          <a href="#example-note-1">[1]</a>
        </sup>.
      </Paragraph>
      <Footnotes
        items={[
          {
            id: "example-note-1",
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
              { href: "#example-note-1-ref-1", label: "1" },
              { href: "#example-note-1-ref-2", label: "2" },
            ],
          },
          {
            id: "example-note-2",
            content: (
              <Paragraph>A second definition remains distinct.</Paragraph>
            ),
          },
        ]}
      />
    </>
  );
}
