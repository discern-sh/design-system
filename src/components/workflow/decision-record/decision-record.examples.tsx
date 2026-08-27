import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { DecisionRecord } from "./decision-record.tsx";
import meta, { componentExampleVocabulary } from "./decision-record.meta.ts";

function AcceptedDecisionState() {
  return (
    <DecisionRecord
      identifier="ADR 0012"
      title="Generated references have one authored source"
      status="accepted"
      date="2026-04-14"
      dateLabel="14 April 2026"
      context={<p>Several generated references repeat the same facts.</p>}
      decision={<p>The source schema is their single authored source.</p>}
      consequences={
        <p>Contributors regenerate references after schema edits.</p>
      }
    />
  );
}

function SupersededDecisionState() {
  return (
    <DecisionRecord
      identifier="ADR 0007"
      title="Routes are registered by hand"
      status="superseded"
      date="2025-09-03"
      dateLabel="3 September 2025"
      context={<p>The initial service used a short handwritten route index.</p>}
      decision={<p>Each route was added to that index manually.</p>}
      consequences={
        <p>Schema-driven routing replaces the handwritten index.</p>
      }
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: AcceptedDecisionState },
    { id: "superseded", Example: SupersededDecisionState },
  ],
);

export default function DecisionRecordExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <AcceptedDecisionState />
      <SupersededDecisionState />
    </div>
  );
}
