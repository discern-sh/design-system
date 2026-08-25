import { Markdown } from "./markdown.tsx";
import {
  markdownChartExampleMarkdown,
  markdownChartExampleResource,
} from "../../../chart/markdown.example.ts";
import {
  markdownDiagramExampleMarkdown,
  markdownDiagramExampleResource,
} from "../../../diagram/markdown.example.ts";

const compact = `# A compact document

Meaning stays **clear**, links keep [their targets](https://example.test), and lists retain hierarchy.

- First observation
- Second observation`;

const dialect = `# Full dialect

Setext heading
--------------

Use *emphasis*, **strong text**, ~~strikethrough~~, \`inline code\`, reference [links][reference], and images:

![A calm geometric study](https://example.test/study.png)

> [!NOTE]
> Alerts can contain more than one block.
>
> - [x] Reviewed
> - [ ] Pending

3. Ordered from three
4. Another item

| Surface | Output |
| :------ | -----: |
| Browser | Semantic |
| Terminal | Deterministic |

\`\`\`ts module
const complete = true;
\`\`\`

A claim carries a note[^evidence].

[^evidence]: Definitions retain **rich content** and return navigation.

[reference]: https://example.test/reference "Reference source"`;

const nested = `> Outer quotation
>
> 1. Ordered item
>    - Nested item
>      > Inner quotation
>      >
>      > \`\`\`text
>      > literal *source*
>      > \`\`\``;

const hostile = `<script>alert("inert")</script>

[Unsafe destination](javascript:alert(1)) remains visible but cannot execute.

<!-- This comment is omitted. -->

Raw controls are visible: [31mred[0m‮.`;

export default function MarkdownExamples() {
  return (
    <>
      <Markdown source={compact} measure="narrow" />
      <Markdown source={dialect} measure="wide" />
      <Markdown source={nested} />
      <Markdown source={hostile} measure="narrow" />
      <section>
        <h3>Ordinary generated image</h3>
        <Markdown source={markdownDiagramExampleMarkdown} measure="wide" />
      </section>
      <section>
        <h3>Resource-upgraded live Diagram</h3>
        <Markdown
          source={markdownDiagramExampleMarkdown}
          diagrams={[markdownDiagramExampleResource]}
          measure="wide"
        />
      </section>
      <section>
        <h3>Ordinary generated chart image</h3>
        <Markdown source={markdownChartExampleMarkdown} measure="wide" />
      </section>
      <section>
        <h3>Resource-upgraded live Chart</h3>
        <Markdown
          source={markdownChartExampleMarkdown}
          charts={[markdownChartExampleResource]}
          measure="wide"
        />
      </section>
    </>
  );
}
