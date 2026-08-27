import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./narrative-chapter.meta.ts";
import { NarrativeChapter } from "./narrative-chapter.tsx";

function ExtendedNarrativeState() {
  return (
    <NarrativeChapter
      eyebrow="Explain"
      title="Give a difficult idea a comfortable reading shape."
      lead={
        <p>
          A substantial explanation can still feel calm when its hierarchy and
          measure make the route through it obvious.
        </p>
      }
      aside={
        <>
          <span>Reading principle</span>
          <p>
            Keep the explanation in one flow. Add another visual only when it
            removes more effort than it introduces.
          </p>
        </>
      }
    >
      <p>
        Start with the unfamiliar audience. Name the central idea in ordinary
        language, then introduce the distinctions that matter to the decision
        they are trying to make.
      </p>
      <h3>Let each paragraph perform one job</h3>
      <p>
        A paragraph can orient, explain, qualify, or reassure. When it attempts
        all four at once, the reader has to reconstruct the hierarchy for
        themselves.
      </p>
      <p>
        The chapter keeps that work in a stable reading column while the title
        remains visible as context, not as another competing artifact.
      </p>
    </NarrativeChapter>
  );
}

function ConciseNarrativeState() {
  return (
    <NarrativeChapter
      eyebrow="Orient"
      title="Sometimes two paragraphs are enough."
      lead={
        <p>The same structure works without manufacturing extra content.</p>
      }
      surface="surface"
    >
      <p>
        Use the chapter for the explanation the reader genuinely needs, not to
        fill a prescribed area of the page.
      </p>
      <p>
        When the next idea is distinct, give it a new section and a fresh
        cognitive starting point.
      </p>
    </NarrativeChapter>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "extended", Example: ExtendedNarrativeState },
    { id: "concise", Example: ConciseNarrativeState },
  ],
);

export default function NarrativeChapterExamples() {
  return (
    <div className="discern-example-stack">
      <ExtendedNarrativeState />
      <ConciseNarrativeState />
    </div>
  );
}
