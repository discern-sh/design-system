import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { CopyButton } from "./copy-button.tsx";
import meta, { componentExampleVocabulary } from "./copy-button.meta.ts";

function CopyActionExample() {
  return <CopyButton value="lorem ipsum dolor sit amet" />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [{ id: "default", Example: CopyActionExample }],
);

export default CopyActionExample;
