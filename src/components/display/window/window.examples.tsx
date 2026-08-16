import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { fixtureCopy } from "../../../fixtures/content.ts";
import { Badge } from "../badge/badge.tsx";
import { Kicker } from "../kicker/kicker.tsx";
import { Window } from "./window.tsx";

function StandardWindowState() {
  return (
    <Window title="lorem — ipsum">
      <div className="discern-example-window-body">
        <Kicker>Example content</Kicker>
        <h4>{fixtureCopy.heading}</h4>
        <p>{fixtureCopy.paragraph}</p>
      </div>
    </Window>
  );
}

function ShowcaseWindowState() {
  return (
    <Window
      title="project · booking-platform"
      actions={<Badge tone="success" dot>ready</Badge>}
      variant="showcase"
    >
      <div className="discern-example-window-body">
        <Kicker>Product evidence</Kicker>
        <h4>A wider frame for the consequential view.</h4>
        <p>
          The body remains consumer-owned while the durable campaign chrome,
          depth, and status position travel with the component.
        </p>
      </div>
    </Window>
  );
}

export const catalogueStates = [
  { name: "standard", label: "Standard", Example: StandardWindowState },
  { name: "showcase", label: "Showcase", Example: ShowcaseWindowState },
] satisfies readonly CatalogueExampleState[];

export default function WindowExamples() {
  return (
    <div className="discern-example-stack">
      <StandardWindowState />
      <ShowcaseWindowState />
    </div>
  );
}
