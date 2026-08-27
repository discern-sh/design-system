import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./pull-quote.meta.ts";
import { PullQuote } from "./pull-quote.tsx";

export default function PullQuoteExamples() {
  return (
    <PullQuote
      quote={
        <p>
          The useful system is the one that makes its reasoning easy to inspect.
        </p>
      }
      attribution="Example contributor"
      citation="Field notes, issue 08"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: PullQuoteExamples }],
);
