import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./faq-block.meta.ts";
import { FaqBlock } from "./faq-block.tsx";

export default function FaqBlockExamples() {
  return (
    <FaqBlock
      eyebrow="Questions, answered"
      title="The details readers need before they continue."
      description={
        <p>
          Use plain answers to remove uncertainty without interrupting the main
          story.
        </p>
      }
      aside={
        <Button href="#contact" variant="secondary" size="sm">
          Ask another question
        </Button>
      }
      openFirst
      items={[
        {
          question: "What belongs in this section?",
          answer: (
            <p>
              Include questions that remove a concrete uncertainty from the
              surrounding story.
            </p>
          ),
        },
        {
          question: "How long should an answer be?",
          answer: (
            <p>
              Use the shortest explanation that answers the question without
              creating another one.
            </p>
          ),
        },
        {
          question: "When should an answer stay closed?",
          answer: (
            <p>
              Keep supporting details collapsed until a reader chooses to
              inspect them.
            </p>
          ),
        },
        {
          question: "What should the final answer include?",
          answer: (
            <p>
              State the useful conclusion directly, then add only the context
              needed to act on it.
            </p>
          ),
        },
      ]}
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: FaqBlockExamples }],
);
