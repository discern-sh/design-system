import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./sparkline.meta.ts";
import { Sparkline } from "./sparkline.tsx";

function MovementExample() {
  return <Sparkline values={[3.2, 4.1, 3.8, 5.5, 7.4, 9.1]} />;
}

function WithGapsExample() {
  return <Sparkline values={[12, null, 14, 19, null, 23]} />;
}

function FlatExample() {
  return <Sparkline values={[5, 5, 5, 5, 5]} />;
}

function DeclineExample() {
  return <Sparkline values={[41, 38, 36, 39, 31, 28]} />;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: MovementExample },
    { id: "with-gaps", Example: WithGapsExample },
    { id: "flat", Example: FlatExample },
    { id: "decline", Example: DeclineExample },
  ],
);

export default function SparklineExamples() {
  return (
    <div className="discern-example-row">
      <MovementExample />
      <WithGapsExample />
      <FlatExample />
      <DeclineExample />
    </div>
  );
}
