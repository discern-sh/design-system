import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { PathReference } from "./path-reference.tsx";

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

export default function PathReferenceExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <p style={{ margin: 0 }}>
        Open <PathReference path="/path/to/project/deno.json" />{" "}
        before running the task.
      </p>
      <div style={{ maxWidth: "22rem" }}>
        <PathReference
          path="/path/to/a/deliberately/long/project/src/components/example/component.tsx"
          copyable
          data-example-long-path
        />
      </div>
    </div>
  );
}
