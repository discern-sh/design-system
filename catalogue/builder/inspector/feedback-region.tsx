import type { GuardedBuilderStorage } from "../persistence.ts";
import { Toast } from "../../../src/components/feedback/toast/toast.tsx";
import { visibleBuilderFeedback } from "./feedback.ts";
import { downloadBuilderSource } from "./files.ts";
import type { BuilderFeedbackController } from "./use-feedback.ts";

/** Feedback surfaces with distinct visual and temporal roles. */
export function BuilderFeedbackRegion(
  { feedback, storage: _storage, recoverySource, onRetry }: Readonly<{
    feedback: BuilderFeedbackController;
    storage: GuardedBuilderStorage;
    recoverySource: string | null;
    onRetry: () => void;
  }>,
) {
  const visible = visibleBuilderFeedback(feedback.model);
  const toast = visible.find((item) => item.kind === "toast");
  const storageFailure = visible.find((item) =>
    item.kind === "storage-failure"
  );
  const recovery = visible.find((item) => item.kind === "recovery");
  return (
    <section
      className="discern-builder-status"
      aria-label="Builder status"
    >
      {feedback.model.live === null ? null : (
        <p
          className="discern-visually-hidden"
          key={`live:${feedback.model.live.serial}`}
          role={feedback.model.live.tone === "error" ? "alert" : "status"}
          aria-live={feedback.model.live.tone === "error"
            ? "assertive"
            : "polite"}
          aria-atomic="true"
        >
          {feedback.model.live.message}
        </p>
      )}
      <p
        className="discern-builder-persistence"
        role="status"
        aria-live="polite"
        aria-atomic="true"
        data-discern-builder-persistence-state={feedback.model.persistence
          .state}
      >
        {feedback.model.persistence.state === "saving"
          ? "Saving…"
          : feedback.model.persistence.state === "saved"
          ? "Saved locally"
          : "Storage unavailable"}
      </p>
      {storageFailure === undefined
        ? null
        : (
          <div className="discern-builder-storage-alert" role="alert">
            <strong>Local saving is unavailable.</strong>
            <p>{storageFailure.message} You can keep editing in this tab.</p>
            <div className="discern-builder-toolbar__group">
              <button type="button" onClick={onRetry}>
                Retry browser storage
              </button>
              <a href="#discern-builder-export">Download builder JSON</a>
            </div>
          </div>
        )}
      {recovery === undefined
        ? null
        : (
          <div className="discern-builder-storage-alert" role="alert">
            <strong>Composition recovery is available.</strong>
            <p>{recovery.message}</p>
          </div>
        )}
      {recoverySource === null
        ? null
        : (
          <details className="discern-builder-recovery">
            <summary>Rejected composition recovery source</summary>
            <textarea
              readOnly
              rows={4}
              value={recoverySource}
              aria-label="Rejected composition recovery source"
            />
            <button
              type="button"
              onClick={() => {
                try {
                  downloadBuilderSource(
                    recoverySource,
                    "composition-recovery.json",
                  );
                  feedback.announce(
                    "Downloaded composition-recovery.json.",
                  );
                } catch {
                  feedback.announce(
                    "composition-recovery.json could not be downloaded.",
                    "error",
                  );
                }
              }}
            >
              Download recovery source
            </button>
          </details>
        )}
      {toast === undefined ? null : (
        <div
          className="discern-builder-toast-region"
          onMouseEnter={feedback.pauseToast}
          onMouseLeave={feedback.resumeToast}
          onFocusCapture={feedback.pauseToast}
          onBlurCapture={feedback.resumeToast}
        >
          <Toast
            key={toast.serial}
            tone={toast.tone}
            role="none"
            onDismiss={feedback.dismissToast}
          >
            {toast.message}
          </Toast>
        </div>
      )}
    </section>
  );
}
