import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./marketing-intro.meta.ts";
import { MarketingIntro } from "./marketing-intro.tsx";

function EditorialIntroState() {
  return (
    <MarketingIntro
      eyebrow="A new chapter"
      title="Give the central idea enough room to lead."
      description={
        <p>
          The editorial scale creates a deliberate change of pace without
          changing the default heading system for application pages.
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
        padding: "clamp(2rem, 7vw, 5rem)",
        background: "var(--discern-color-inverse-surface)",
      }}
    >
      <MarketingIntro
        eyebrow="A contrasting chapter"
        title="Keep the hierarchy readable when the surface turns dark."
        description={
          <p>
            The contrast treatment stays light-on-dark in both site themes.
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
