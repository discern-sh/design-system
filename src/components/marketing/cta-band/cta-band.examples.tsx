import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./cta-band.meta.ts";
import { CtaBand } from "./cta-band.tsx";

export default function CtaBandExamples() {
  return (
    <CtaBand
      eyebrow="Continue"
      title="Make the next step clear."
      description={
        <p>
          Pair one direct invitation with a quieter alternative and a short
          reassurance.
        </p>
      }
      actions={
        <>
          <Button href="#primary" size="lg">Primary action</Button>
          <Button href="#secondary" size="lg" variant="secondary">
            Secondary action
          </Button>
        </>
      }
      note="Add a short reassurance when it helps the decision."
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: CtaBandExamples }],
);
