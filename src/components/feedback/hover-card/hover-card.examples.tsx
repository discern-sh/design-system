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
}, {
  name: "top-layer card remains visible outside an overflow region",
  steps: [
    { action: "focus", target: { role: "button", name: "Clipped parent" } },
    {
      expect: "visible",
      target: { role: "group", name: "Clipping proof" },
    },
    {
      expect: "within-viewport",
      target: { role: "group", name: "Clipping proof" },
    },
    { action: "press", key: "Escape" },
    {
      expect: "hidden",
      target: { role: "group", name: "Clipping proof" },
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
      <div
        style={{
          inlineSize: "9rem",
          overflow: "hidden",
          padding: "var(--discern-space-3)",
          border: "1px solid var(--discern-color-border)",
        }}
      >
        <HoverCard
          layout="block"
          label="Clipping proof"
          placement="bottom"
          align="start"
          width="md"
          trigger={<Button variant="secondary">Clipped parent</Button>}
        >
          <div>
            <h3>Shared floating surface</h3>
            <p>This card remains visible beyond its overflow ancestor.</p>
          </div>
        </HoverCard>
      </div>
    </div>
  );
}
