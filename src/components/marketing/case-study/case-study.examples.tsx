import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./case-study.meta.ts";
import { CaseStudy } from "./case-study.tsx";

export default function CaseStudyExamples() {
  return (
    <CaseStudy
      eyebrow="Example case study"
      title="From scattered notes to a repeatable review habit."
      summary={
        <p>
          A small team gave every review the same clear starting point.
        </p>
      }
      body={
        <p>
          Shared evidence replaced private checklists and made decisions easier
          to revisit.
        </p>
      }
      stats={[
        { value: "42%", label: "less review rework" },
        { value: "11", label: "teams enrolled" },
        { value: "2 wk", label: "to broad adoption" },
      ]}
      media={
        <div
          style={{
            display: "grid",
            minHeight: "21rem",
            placeItems: "center",
            padding: "2rem",
            background:
              "radial-gradient(circle, var(--discern-color-accent-200), transparent 60%)",
          }}
        >
          <strong>Example evidence or photography</strong>
        </div>
      }
      action={
        <Button href="#story" variant="secondary">Read the full story</Button>
      }
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: CaseStudyExamples }],
);
