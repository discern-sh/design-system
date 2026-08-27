import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import { Terminal } from "../../display/terminal/terminal.tsx";
import meta, { componentExampleVocabulary } from "./split-feature.meta.ts";
import { SplitFeature } from "./split-feature.tsx";

export default function SplitFeatureExamples() {
  return (
    <SplitFeature
      eyebrow="From promise to proof"
      title="Put the evidence beside the claim."
      description={
        <p>
          A split composition lets explanation and supporting evidence reinforce
          one another.
        </p>
      }
      points={[
        {
          title: "Specific",
          description: "Each point says what changed for the reader.",
        },
        {
          title: "Scannable",
          description: "The hierarchy survives a quick first pass.",
        },
        {
          title: "Composable",
          description: "Swap in any media without changing the narrative.",
        },
      ]}
      actions={<Button href="#learn">Learn how it works</Button>}
      media={
        <Terminal title="Example output">
          {"Inputs checked\nResult recorded\n\nReady for review"}
        </Terminal>
      }
      surface="sunken"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: SplitFeatureExamples }],
);
