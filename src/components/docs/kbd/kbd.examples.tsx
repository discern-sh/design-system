import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./kbd.meta.ts";
import { Kbd } from "./kbd.tsx";

function SingleKeyExample() {
  return <Kbd>Enter</Kbd>;
}

function KeyChordExample() {
  return (
    <span>
      <Kbd>Ctrl</Kbd> <Kbd>Shift</Kbd> <Kbd>P</Kbd>
    </span>
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: SingleKeyExample },
    { id: "key-chord", Example: KeyChordExample },
  ],
);

export default function KbdExamples() {
  return (
    <div className="discern-example-row">
      <SingleKeyExample />
      <KeyChordExample />
    </div>
  );
}
