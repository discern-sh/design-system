import { RetryNotice } from "./retry-notice.tsx";

export default function RetryNoticeExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <RetryNotice
        safeToRetry
        reason="The check reads the current state and does not modify its inputs."
      />
      <RetryNotice
        safeToRetry={false}
        reason="The first run may already have moved the source. Inspect both locations before choosing a recovery path."
      />
    </div>
  );
}
