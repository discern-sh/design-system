import { Paragraph } from "../paragraph/paragraph.tsx";
import { Blockquote } from "./blockquote.tsx";

export default function BlockquoteExamples() {
  return (
    <Blockquote>
      <Paragraph>
        A neutral quotation can carry ordinary prose and <em>inline meaning</em>
        {" "}
        without inventing an attribution.
      </Paragraph>
      <Blockquote>
        <Paragraph>
          Nested quoted material remains a semantic block of its own.
        </Paragraph>
      </Blockquote>
    </Blockquote>
  );
}
