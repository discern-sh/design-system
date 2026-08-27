import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./code-block.meta.ts";
import { CodeBlock } from "./code-block.tsx";

const example = `function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

console.log(total([2, 3, 5]));`;

function TypeScriptSourceExample() {
  return <CodeBlock code={example} language="ts" info="module" />;
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
    { id: "preserved-width", Example: PreservedLongLineExample },
  ],
);

export default function CodeBlockExamples() {
  return (
    <div className="discern-example-stack">
      <TypeScriptSourceExample />
      <PreservedLongLineExample />
    </div>
  );
}
