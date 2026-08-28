import type { GuardedBuilderStorage } from "../persistence.ts";
import { visibleBuilderFeedback } from "./feedback.ts";
import { downloadBuilderSource } from "./files.ts";
import type { BuilderFeedbackController } from "./use-feedback.ts";

/** Current status UI over feedback channels with deliberately distinct state. */
export function BuilderFeedbackRegion(
  { feedback, storage, recoverySource, onRetry }: Readonly<{
    feedback: BuilderFeedbackController;
    storage: GuardedBuilderStorage;
    recoverySource: string | null;
    onRetry: () => void;
  }>,
) {
  const visible = visibleBuilderFeedback(feedback.model);
  return (
    <section
      className={`discern-builder-status${
        visible.length === 0 && recoverySource === null && !storage.blocked
          ? " discern-builder-status--empty"
          : ""
      }`}
      aria-label="Builder status"
    >
      {visible.map((item) => {
        if (item.kind === "announcement") {
          return (
            <p
              key={`announcement:${item.serial}`}
              role={item.tone === "error" ? "alert" : "status"}
              aria-live={item.tone === "error" ? "assertive" : "polite"}
              aria-atomic="true"
            >
              {item.message}
            </p>
          );
        }
        const tone = item.kind === "validation" ? item.tone : "error";
        return (
          <p
            key={item.kind}
            role={tone === "error" ? "alert" : "status"}
            aria-live={tone === "error" ? "assertive" : "polite"}
            aria-atomic="true"
          >
            {item.message}
          </p>
        );
      })}
      {storage.blocked
        ? <button type="button" onClick={onRetry}>Retry browser storage</button>
        : null}
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
                  feedback.announce("Downloaded the recovery source.");
                } catch {
                  feedback.announce(
                    "The recovery source could not be downloaded.",
                    "error",
                  );
                }
              }}
            >
              Download recovery source
            </button>
          </details>
        )}
    </section>
  );
}
