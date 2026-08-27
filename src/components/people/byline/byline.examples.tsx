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
          <Mention name="Ada Osei" href="#ada" />
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
