import { CodeBlock } from "./code-block.tsx";

const example = `function total(values: readonly number[]): number {
  return values.reduce((sum, value) => sum + value, 0);
}

console.log(total([2, 3, 5]));`;

export default function CodeBlockExamples() {
  return (
    <CodeBlock
      code={example}
      language="ts"
      info="module"
    />
  );
}
