import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Badge } from "../badge/badge.tsx";
import { Kicker } from "../kicker/kicker.tsx";
import meta, { componentExampleVocabulary } from "./window.meta.ts";
import { Window } from "./window.tsx";

function StandardWindowState() {
  return (
    <Window title="lorem — ipsum">
      <div className="discern-example-window-body">
        <Kicker>Example content</Kicker>
        <h4>A clear frame</h4>
        <p>Supporting content remains owned by the consumer.</p>
      </div>
    </Window>
  );
}

function ShowcaseWindowState() {
  return (
    <Window
      title="workspace · example"
      actions={<Badge tone="success" dot>ready</Badge>}
      variant="showcase"
    >
      <div className="discern-example-window-body">
        <Kicker>Featured evidence</Kicker>
        <h4>A wider frame for the consequential view.</h4>
        <p>
          The body remains consumer-owned while the durable campaign chrome,
          depth, and status position travel with the component.
        </p>
      </div>
    </Window>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "standard", Example: StandardWindowState },
    { id: "showcase", Example: ShowcaseWindowState },
  ],
);

export default function WindowExamples() {
  return (
    <div className="discern-example-stack">
      <StandardWindowState />
      <ShowcaseWindowState />
    </div>
  );
}
