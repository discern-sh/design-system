import { Paragraph } from "./paragraph.tsx";

export default function ParagraphExamples() {
  return (
    <Paragraph>
      A useful paragraph can combine <strong>clear emphasis</strong>,{" "}
      <em>supporting nuance</em>,{" "}
      <s>superseded wording</s>, inline detail such as{" "}
      <code>measure: 68</code>, and{" "}
      <a href="#paragraph-reference">a stable reference</a>.
      <sup id="paragraph-reference">1</sup>
    </Paragraph>
  );
}
