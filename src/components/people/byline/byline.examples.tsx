import { defineComponentReviewPostures } from "../../../../catalogue/review-postures.ts";
import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { Mention } from "../mention/mention.tsx";
import meta, { componentExampleVocabulary } from "./byline.meta.ts";
import { Byline } from "./byline.tsx";

function ArticleBylineExample() {
  return (
    <Byline
      lede="By"
      authors={
        <>
          <Mention
            name="Alexandrine Featherstonehaugh-Cholmondeley"
            href="#ada"
          />
          <span>and</span>
          <Mention name="June Park" href="#june" />
        </>
      }
    >
      <time dateTime="2026-08-11">11 August 2026</time>
      <span>8 min read</span>
    </Byline>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: ArticleBylineExample }],
);

export default function BylineExamples() {
  return <ArticleBylineExample />;
}

export const reviewPostures = defineComponentReviewPostures(
  meta,
  componentExampleVocabulary,
  [{
    id: "narrow-content",
    label: "Full content at narrow local width",
    example: "default",
    category: "responsive",
    requirements: { inlineSize: 240 },
    sequence: [{
      checkpoint: {
        id: "byline-narrow-content",
        label: "Names, current state, and actions remain visible",
      },
    }],
  }],
);
