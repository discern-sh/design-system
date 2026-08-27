import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import meta, { componentExampleVocabulary } from "./badge.meta.ts";
import { Badge } from "./badge.tsx";

function AccentExample() {
  return <Badge dot>Active</Badge>;
}

function NeutralExample() {
  return <Badge tone="neutral" dot>Queued</Badge>;
}

function SuccessExample() {
  return <Badge tone="success" dot>Passed</Badge>;
}

function WarningExample() {
  return <Badge tone="warning" dot>Review</Badge>;
}

function DangerExample() {
  return <Badge tone="danger" dot>Failed</Badge>;
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: AccentExample },
    { id: "neutral", Example: NeutralExample },
    { id: "success", Example: SuccessExample },
    { id: "warning", Example: WarningExample },
    { id: "danger", Example: DangerExample },
  ],
);

export default function BadgeExamples() {
  return (
    <div className="discern-example-row">
      <AccentExample />
      <NeutralExample />
      <SuccessExample />
      <WarningExample />
      <DangerExample />
    </div>
  );
}
