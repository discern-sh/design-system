import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./timeline.meta.ts";
import { Timeline } from "./timeline.tsx";

export default function TimelineExamples() {
  return (
    <Timeline
      eyebrow="A short history"
      title="The argument, one decision at a time."
      items={[
        {
          date: "Week 01",
          title: "Observe",
          description: <p>The recurring friction is named.</p>,
          status: "complete",
        },
        {
          date: "Week 03",
          title: "Constrain",
          description: <p>A shared boundary becomes executable.</p>,
          status: "current",
        },
        {
          date: "Week 06",
          title: "Review",
          description: <p>The team compares evidence, not recollections.</p>,
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: TimelineExamples }],
);
