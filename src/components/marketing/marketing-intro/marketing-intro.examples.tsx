import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./marketing-intro.meta.ts";
import { MarketingIntro } from "./marketing-intro.tsx";

function EditorialIntroState() {
  return (
    <MarketingIntro
      eyebrow="Before the workshop"
      title="A shared question makes preparation easier."
      description={
        <p>
          Send the question with the reading material. Explain what the group
          needs to decide and which parts are still open.
        </p>
      }
      scale="editorial"
    />
  );
}

function ContrastIntroState() {
  return (
    <div
      style={{
        padding: "var(--discern-space-6)",
        background: "var(--discern-color-inverse-surface)",
      }}
    >
      <MarketingIntro
        eyebrow="After the discussion"
        title="Keep the decision and its reasoning together."
        description={
          <p>
            Record the options considered, the chosen next step, and the person
            responsible for following up.
          </p>
        }
        align="center"
        scale="editorial"
        tone="contrast"
      />
    </div>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "editorial", Example: EditorialIntroState },
    { id: "contrast", Example: ContrastIntroState },
  ],
);

export default function MarketingIntroExamples() {
  return (
    <div className="discern-example-stack">
      <EditorialIntroState />
      <ContrastIntroState />
    </div>
  );
}
