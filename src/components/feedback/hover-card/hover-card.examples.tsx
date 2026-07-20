import type { ConformanceScenario } from "../../../../styleguide/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { HoverCard } from "./hover-card.tsx";

export const conformance = [{
  name: "keyboard focus keeps rich hover-card content reachable",
  steps: [
    { action: "focus", target: { role: "button", name: "Inspect record" } },
    {
      expect: "visible",
      target: { role: "group", name: "Record details" },
    },
    { action: "press", key: "Tab" },
    { expect: "focused", target: { role: "link", name: "Open record" } },
    {
      expect: "visible",
      target: { role: "group", name: "Record details" },
    },
    { action: "press", key: "Tab" },
    {
      expect: "hidden",
      target: { role: "group", name: "Record details" },
    },
  ],
}] satisfies readonly ConformanceScenario[];

export default function HoverCardExamples() {
  return (
    <div className="discern-example-row">
      <HoverCard
        layout="block"
        label="Record details"
        align="start"
        width="lg"
        trigger={<Button variant="secondary">Inspect record</Button>}
      >
        <div>
          <h3>Review note</h3>
          <p>
            A rich surface can hold structured copy, links, lists, or actions.
          </p>
          <a href="#open-record">Open record</a>
        </div>
      </HoverCard>
      <HoverCard
        label="Short annotation"
        placement="bottom"
        align="start"
        width="sm"
        trigger={
          <button className="discern-dotted-underline" type="button">
            Annotated text
          </button>
        }
      >
        <span>Inline cards keep phrasing content valid inside prose.</span>
      </HoverCard>
    </div>
  );
}
