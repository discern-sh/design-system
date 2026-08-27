import { defineCatalogueExamples } from "../../../../catalogue/conformance.ts";
import { RetryNotice } from "./retry-notice.tsx";
import meta, { componentExampleVocabulary } from "./retry-notice.meta.ts";

function SafeRetryState() {
  return (
    <RetryNotice
      safeToRetry
      label="Read-only check"
      reason="The check reads the current state and does not modify its inputs."
    />
  );
}

function UnsafeRetryState() {
  return (
    <RetryNotice
      safeToRetry={false}
      label="Inspect state before continuing"
      reason="The first run may already have moved the source. Inspect both locations before choosing a recovery path."
    />
  );
}

export const catalogueExamples = defineCatalogueExamples(
  meta,
  componentExampleVocabulary,
  [
    { id: "safe", Example: SafeRetryState },
    { id: "unsafe", Example: UnsafeRetryState },
  ],
);

export default function RetryNoticeExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <SafeRetryState />
      <UnsafeRetryState />
    </div>
  );
}
