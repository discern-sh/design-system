import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./code-block.meta.ts";
import { CodeBlock } from "./code-block.tsx";

const example = `// Sum every value, or report an empty collection.
function total(values: readonly number[]): string {
  if (values.length === 0) return "no values";
  return \`total: \${values.reduce((sum, value) => sum + value, 0)}\`;
}

console.log(total([2, 3, 5]));`;

const configuration = `# A small configuration, read without a parser.
[listing]
  title = "Reading time"
  languages = ["typescript", "toml"]
  measure = 68
  wrap = false`;

function TypeScriptSourceExample() {
  return <CodeBlock code={example} wrap language="ts" info="module" />;
}

function ConfigurationDialectExample() {
  return <CodeBlock code={configuration} language="toml" />;
}

function PreservedLongLineExample() {
  return (
    <CodeBlock
      code="one uninterrupted source line remains available without truncation even when its natural measure exceeds the surrounding reading column"
      language="text"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: TypeScriptSourceExample },
    { id: "configuration", Example: ConfigurationDialectExample },
    { id: "preserved-width", Example: PreservedLongLineExample },
  ],
);

export default function CodeBlockExamples() {
  return (
    <div className="discern-example-stack">
      <TypeScriptSourceExample />
      <ConfigurationDialectExample />
      <PreservedLongLineExample />
    </div>
  );
}
