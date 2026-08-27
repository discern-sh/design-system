import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./related-content.meta.ts";
import { RelatedContent } from "./related-content.tsx";

export default function RelatedContentExamples() {
  return (
    <RelatedContent
      eyebrow="Continue reading"
      title="The next useful question."
      items={[
        {
          eyebrow: "Essay",
          title: "Designing for legibility",
          description: (
            <p>
              How structure turns complexity into something a reader can
              challenge.
            </p>
          ),
          href: "#legibility",
          meta: "9 min",
        },
        {
          eyebrow: "Guide",
          title: "Choosing a reading measure",
          description: (
            <p>How line length and spacing support sustained reading.</p>
          ),
          href: "#reading-measure",
          meta: "14 min",
        },
        {
          eyebrow: "Field note",
          title: "Editing a complex introduction",
          description: (
            <p>
              A practical account of simplifying the opening without losing
              context.
            </p>
          ),
          href: "#introduction",
          meta: "6 min",
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: RelatedContentExamples }],
);
