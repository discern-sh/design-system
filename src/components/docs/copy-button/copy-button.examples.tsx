import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { CopyButton } from "./copy-button.tsx";
import meta, { componentExampleVocabulary } from "./copy-button.meta.ts";

function CopyActionExample() {
  return <CopyButton value="lorem ipsum dolor sit amet" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: CopyActionExample }],
);

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "press-copy",
    label: "Pointer contact",
    example: "default",
    category: "interaction",
    sequence: [
      {
        action: "pointer-down",
        target: { role: "button", name: "Copy" },
      },
      {
        checkpoint: {
          id: "copy-button-pressed",
          label: "Pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { role: "button", name: "Copy" },
      },
    ],
  }] as const,
);

export default CopyActionExample;
