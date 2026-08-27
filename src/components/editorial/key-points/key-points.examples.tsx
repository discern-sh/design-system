import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./key-points.meta.ts";
import { KeyPoints } from "./key-points.tsx";

export default function KeyPointsExamples() {
  return (
    <KeyPoints
      eyebrow="The brief"
      title="Three ideas to carry into the work."
      items={[
        {
          title: "Begin with evidence",
          description: <p>Observe the real state before proposing a change.</p>,
        },
        {
          title: "Name the constraint",
          description: <p>Make the hard edge visible enough to review.</p>,
        },
        {
          title: "Leave a trace",
          description: <p>Preserve what the next reader will need.</p>,
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: KeyPointsExamples }],
);
