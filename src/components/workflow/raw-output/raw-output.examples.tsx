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
const rawOutput = {
  selector: "[data-example-raw-output]",
} as const;
const content = {
  selector: "[data-example-raw-output] .discern-raw-output__content",
} as const;

export const conformance = [{
  name: "native disclosure toggles its content and open state",
  steps: [
    { expect: "hidden", target: content },
    { action: "click", target: disclosure },
    {
      expect: "attribute",
      target: rawOutput,
      attribute: "open",
      value: "",
    },
    { expect: "visible", target: content },
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
