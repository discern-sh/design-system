import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { FoldBackdrop } from "../../artwork/fold-backdrop/fold-backdrop.tsx";
import { Button } from "../../core/button/button.tsx";
import meta, { componentExampleVocabulary } from "./closing-statement.meta.ts";
import { ClosingStatement } from "./closing-statement.tsx";

function ContrastClosingState() {
  return (
    <ClosingStatement
      eyebrow="One next step"
      title="Write the question before you book the room."
      description={
        <p>
          Draft the invitation with a clear question, the relevant reading, and
          a place for people to contribute before the session.
        </p>
      }
      actions={
        <>
          <Button href="#begin">Prepare the invitation</Button>
          <Button href="#details" variant="secondary">
            Read the checklist
          </Button>
        </>
      }
      reassurance={<p>Keep the preparation notes with the decision record.</p>}
      backdrop={<FoldBackdrop />}
    />
  );
}

function QuietClosingState() {
  return (
    <ClosingStatement
      eyebrow="Continue"
      title="Share the next step with everyone involved."
      description={
        <p>Record the action, its owner, and a date to review what happened.</p>
      }
      actions={<Button href="#next">Review the decision record</Button>}
      surface="surface"
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "contrast", Example: ContrastClosingState },
    { id: "quiet", Example: QuietClosingState },
  ],
);

export default function ClosingStatementExamples() {
  return (
    <div className="discern-example-stack">
      <ContrastClosingState />
      <QuietClosingState />
    </div>
  );
}
