import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./key-points.meta.ts";
import { KeyPoints } from "./key-points.tsx";

export default function KeyPointsExamples() {
  return (
    <KeyPoints
      eyebrow="Key points"
      title="Three ideas to remember."
      items={[
        {
          title: "Lead with the main idea",
          description: <p>State it before adding supporting detail.</p>,
        },
        {
          title: "Add useful context",
          description: <p>Explain what a reader needs to understand it.</p>,
        },
        {
          title: "End with direction",
          description: <p>Make the next step easy to find.</p>,
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
