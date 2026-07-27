import { DecisionRecord } from "./decision-record.tsx";

export default function DecisionRecordExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <DecisionRecord
        identifier="ADR 0012"
        title="Generated files have one authored source"
        status="accepted"
        date="2026-04-14"
        dateLabel="14 April 2026"
        context={
          <p>
            Multiple generated outputs repeated the same component facts and
            could drift when edited independently.
          </p>
        }
        decision={
          <p>
            Component metadata is the authored source; registries and adapters
            are regenerated from it.
          </p>
        }
        consequences={
          <p>
            Contributors edit one place and commit regenerated outputs. Manual
            edits to generated files are overwritten.
          </p>
        }
      />
      <DecisionRecord
        identifier="ADR 0007"
        title="Catalogue entries are registered by hand"
        status="superseded"
        date="2025-09-03"
        dateLabel="3 September 2025"
        context={<p>The first catalogue used a short handwritten index.</p>}
        decision={<p>Each component was added to that index manually.</p>}
        consequences={
          <p>
            The metadata-driven registry replaced this decision once the
            component set grew.
          </p>
        }
      />
    </div>
  );
}
