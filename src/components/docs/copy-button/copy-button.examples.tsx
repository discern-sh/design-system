import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { getGlyph } from "../../../glyphs/mod.ts";
import { CopyButton } from "./copy-button.tsx";
import meta, { componentExampleVocabulary } from "./copy-button.meta.ts";

function CopyActionExample() {
  return (
    <CopyButton
      value="lorem ipsum dolor sit amet"
      icon={getGlyph("copy").unicode}
      copiedIcon={getGlyph("status-complete").unicode}
      failedIcon={getGlyph("status-error").unicode}
    />
  );
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
        target: { selector: ".discern-copy-button" },
      },
      {
        checkpoint: {
          id: "copy-button-pressed",
          label: "Pointer held",
        },
      },
      {
        action: "pointer-up",
        target: { selector: ".discern-copy-button" },
      },
    ],
  }] as const,
);

export default CopyActionExample;
