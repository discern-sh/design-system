import { DestructiveActionNotice } from "./destructive-action-notice.tsx";

export default function DestructiveActionNoticeExamples() {
  return (
    <div className="discern-example-stack discern-example-stack--start">
      <DestructiveActionNotice
        label="Warning: owner approval required"
        scope="The temporary directory selected for cleanup."
        impact="Its contents will no longer be available from that path."
        authority="Only the directory owner may approve removal."
        recovery="Move the directory to recoverable storage first when its contents have not been independently verified."
      />
      <DestructiveActionNotice
        tone="danger"
        label="Danger: active data will be replaced"
        scope="The current destination directory and every file below it."
        impact="Newer destination changes will be overwritten immediately."
        recovery="Stop now and create a dated copy of the destination before replacing it."
      />
    </div>
  );
}
