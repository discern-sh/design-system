import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./pull-quote.meta.ts";
import { PullQuote } from "./pull-quote.tsx";

export default function PullQuoteExamples() {
  return (
    <PullQuote
      quote={
        <p>
          A good reading experience lets the ideas lead and the interface
          recede.
        </p>
      }
      attribution="Example contributor"
      citation="Collected essays"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: PullQuoteExamples }],
);
