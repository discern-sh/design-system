import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { ExpectedResult } from "./expected-result.tsx";
import meta, { componentExampleVocabulary } from "./expected-result.meta.ts";

function OutputState() {
  return (
    <ExpectedResult>
      On branch main{"\n"}nothing to commit, working tree clean
    </ExpectedResult>
  );
}

function EndState() {
  return (
    <ExpectedResult variant="state">
      The test process exits successfully and returns control to the shell.
    </ExpectedResult>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "output", Example: OutputState },
    { id: "state", Example: EndState },
  ],
);

export default function ExpectedResultExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <OutputState />
      <EndState />
    </div>
  );
}
