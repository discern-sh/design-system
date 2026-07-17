import { useState } from "react";
import { ExampleIcon } from "../../../fixtures/example-icon.tsx";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Toast } from "./toast.tsx";

export const conformance = [{
  name: "the labelled dismiss action removes its notification",
  steps: [
    {
      action: "click",
      target: { role: "button", name: "Dismiss notification" },
    },
    {
      expect: "hidden",
      target: { selector: ".discern-toast--success" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function ToastExamples() {
  const [showSuccess, setShowSuccess] = useState(true);
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <Toast>Lorem ipsum dolor sit amet.</Toast>
      {showSuccess
        ? (
          <Toast
            tone="success"
            icon={<ExampleIcon name="check" />}
            onDismiss={() => setShowSuccess(false)}
          >
            Consectetur adipiscing elit.
          </Toast>
        )
        : null}
      <Toast tone="danger">Integer posuere erat a ante.</Toast>
    </div>
  );
}
