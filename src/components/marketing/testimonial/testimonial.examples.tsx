import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./testimonial.meta.ts";
import { Testimonial } from "./testimonial.tsx";

export default function TestimonialExamples() {
  return (
    <Testimonial
      eyebrow="Example perspective"
      quote="The shared evidence made the final review easier to follow."
      author="Project reviewer"
      authorRole="Engineering lead"
      avatar="PR"
      metric="One"
      metricLabel="clear recommendation"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: TestimonialExamples }],
);
