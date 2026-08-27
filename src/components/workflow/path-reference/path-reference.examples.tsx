import type { ConformanceScenario } from "../../../../catalogue/conformance.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { PathReference } from "./path-reference.tsx";
import meta, { componentExampleVocabulary } from "./path-reference.meta.ts";

export const conformance = [{
  name: "a long path preserves both visible ends inside a narrow viewport",
  viewport: { width: 390, height: 844 },
  steps: [{
    expect: "within-viewport",
    target: { selector: "[data-example-long-path]" },
  }, {
    expect: "visible",
    target: {
      selector: "[data-example-long-path] .discern-path-reference__prefix",
    },
  }, {
    expect: "visible",
    target: {
      selector: "[data-example-long-path] .discern-path-reference__suffix",
    },
  }],
}] satisfies readonly ConformanceScenario[];

function InlinePathState() {
  return (
    <p style={{ margin: 0 }}>
      Open <PathReference path="/path/to/project/deno.json" />{" "}
      before running the task.
    </p>
  );
}

function OverflowPathState() {
  return (
    <div style={{ maxWidth: "22rem" }}>
      <PathReference
        path="/path/to/a/deliberately/long/project/src/components/example/component.tsx"
        copyable
        data-example-long-path
      />
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: InlinePathState },
    { id: "long-path", Example: OverflowPathState },
  ],
);

export default function PathReferenceExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <InlinePathState />
      <OverflowPathState />
    </div>
  );
}
