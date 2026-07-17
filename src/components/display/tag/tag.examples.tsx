import { useState } from "react";
import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Tag } from "./tag.tsx";

export const conformance = [{
  name: "the labelled remove action removes its tag",
  steps: [
    { action: "click", target: { role: "button", name: "Remove ipsum" } },
    {
      expect: "hidden",
      target: {
        selector: '.discern-tag:has([aria-label="Remove ipsum"])',
      },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function TagExamples() {
  const [showRemovable, setShowRemovable] = useState(true);
  return (
    <div className="discern-example-row">
      <Tag>Lorem</Tag>
      {showRemovable
        ? (
          <Tag
            onRemove={() => setShowRemovable(false)}
            removeLabel="Remove ipsum"
          >
            Ipsum
          </Tag>
        )
        : null}
      <Tag>Dolor sit amet</Tag>
    </div>
  );
}
