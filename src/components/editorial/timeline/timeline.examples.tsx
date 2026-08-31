import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./timeline.meta.ts";
import { Timeline } from "./timeline.tsx";

export default function TimelineExamples() {
  return (
    <Timeline
      eyebrow="Publication history"
      title="A feature from draft to print."
      items={[
        {
          date: "Week 01",
          title: "Draft",
          description: <p>The initial outline is complete.</p>,
          status: "complete",
        },
        {
          date: "Week 03",
          title: "Edit",
          description: <p>Supporting details are under review.</p>,
          status: "current",
        },
        {
          date: "Week 06",
          title: "Publish",
          description: <p>Final copy is scheduled.</p>,
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{
    id: "default",
    Example: TimelineExamples,
    capture: {
      selectors: [".discern-timeline"],
      // Transformed markers remain inside the Timeline allocation.
      paintBleed: 0,
    },
  }],
);
