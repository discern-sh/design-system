import type { CatalogueExampleState } from "../../../../catalogue/conformance.ts";
import { FoldGround } from "../../artwork/fold-ground/fold-ground.tsx";
import { Button } from "../../core/button/button.tsx";
import { ClosingStatement } from "./closing-statement.tsx";

function ContrastClosingState() {
  return (
    <ClosingStatement
      eyebrow="One next step"
      title="End with a decision, not another explanation."
      description={
        <p>
          The complete story has already done its work. The closing chapter
          makes the next action clear and leaves the supporting detail behind.
        </p>
      }
      actions={
        <>
          <Button href="#begin">Begin here</Button>
          <Button href="#details" variant="secondary">
            Read the details
          </Button>
        </>
      }
      reassurance={
        <p>No account or specialist knowledge is needed to begin.</p>
      }
      ground={<FoldGround />}
    />
  );
}

function QuietClosingState() {
  return (
    <ClosingStatement
      eyebrow="Continue"
      title="Keep the final invitation simple."
      description={<p>A quiet surface can close a quieter page.</p>}
      actions={<Button href="#next">Take the next step</Button>}
      surface="surface"
    />
  );
}

export const catalogueStates = [
  {
    name: "contrast",
    label: "Contrast close",
    Example: ContrastClosingState,
  },
  {
    name: "quiet",
    label: "Quiet close",
    Example: QuietClosingState,
  },
] satisfies readonly CatalogueExampleState[];

export default function ClosingStatementExamples() {
  return (
    <div className="discern-example-stack">
      <ContrastClosingState />
      <QuietClosingState />
    </div>
  );
}
