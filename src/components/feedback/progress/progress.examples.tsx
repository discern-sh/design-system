import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import meta, { componentExampleVocabulary } from "./progress.meta.ts";
import { Progress } from "./progress.tsx";
function Started() {
  return (
    <Progress
      label="Process files"
      value={0}
      max={8}
      context="Files completed"
    />
  );
}
function Intermediate() {
  return (
    <Progress
      label="Process files"
      value={3}
      max={8}
      context="Files completed"
    />
  );
}
function Complete() {
  return (
    <Progress
      label="Process files"
      value={8}
      max={8}
      context="All files processed"
    />
  );
}
function Waiting() {
  return <Progress label="Process files" context="Waiting for the file list" />;
}
export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: Started },
    { id: "intermediate", Example: Intermediate },
    { id: "complete", Example: Complete },
    { id: "waiting", Example: Waiting },
  ],
);
export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [
    {
      id: "waiting-motion",
      label: "Waiting at production speed",
      example: "waiting",
      category: "motion",
      sequence: [{
        checkpoint: { id: "waiting-moving", label: "Unknown completion" },
      }],
    },
    {
      id: "waiting-reduced",
      label: "Waiting with reduced motion",
      example: "waiting",
      category: "motion",
      requirements: { reducedMotion: true },
      sequence: [{
        checkpoint: { id: "waiting-still", label: "Waiting remains explicit" },
      }],
    },
    {
      id: "narrow",
      label: "Progress in a narrow allocation",
      example: "intermediate",
      category: "responsive",
      requirements: { inlineSize: 260 },
      sequence: [{
        checkpoint: {
          id: "narrow-reading",
          label: "Value and context retained",
        },
      }],
    },
  ],
);
export default Intermediate;
