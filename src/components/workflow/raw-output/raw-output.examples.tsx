import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { RawOutput } from "./raw-output.tsx";

const collapsedOutput = "error: expected a string\nat src/example.ts:18:7";
const completeResponse = `{
  "ok": false,
  "reason": "invalid input"
}`;

const disclosure = {
  selector: "[data-example-raw-output] .discern-raw-output__summary",
} as const;
const collapsedState = {
  selector: "[data-example-raw-output] .discern-raw-output__state--collapsed",
} as const;
const expandedState = {
  selector: "[data-example-raw-output] .discern-raw-output__state--expanded",
} as const;

export const conformance = [{
  name: "native disclosure labels its collapsed and expanded states",
  steps: [
    { expect: "visible", target: collapsedState },
    { expect: "hidden", target: expandedState },
    { action: "click", target: disclosure },
    { expect: "hidden", target: collapsedState },
    { expect: "visible", target: expandedState },
  ],
}] satisfies readonly ConformanceScenario[];

export default function RawOutputExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <RawOutput data-example-raw-output>
        {collapsedOutput}
      </RawOutput>
      <RawOutput label="Complete response" open>
        {completeResponse}
      </RawOutput>
    </div>
  );
}
