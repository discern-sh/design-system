import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { DestructiveActionNotice } from "./destructive-action-notice.tsx";
import meta, {
  componentExampleVocabulary,
} from "./destructive-action-notice.meta.ts";

function ApprovalWarningState() {
  return (
    <DestructiveActionNotice
      label="Owner approval required"
      scope="The temporary directory selected for cleanup."
      impact="Its contents will no longer be available from that path."
      authority="Only the directory owner may approve removal."
      recovery="Move the directory to recoverable storage first when its contents have not been independently verified."
    />
  );
}

function ImmediateDangerState() {
  return (
    <DestructiveActionNotice
      tone="danger"
      label="Active data will be replaced"
      scope="The current destination directory and every file below it."
      impact="Newer destination changes will be overwritten immediately."
      recovery="Stop now and create a dated copy of the destination before replacing it."
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "default", Example: ApprovalWarningState },
    { id: "danger", Example: ImmediateDangerState },
  ],
);

export default function DestructiveActionNoticeExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <ApprovalWarningState />
      <ImmediateDangerState />
    </div>
  );
}
