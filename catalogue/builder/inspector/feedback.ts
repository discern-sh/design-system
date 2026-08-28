/** Distinct feedback lifecycles. Field validation stays with its field. */
export type BuilderFeedback =
  | {
    readonly kind: "live";
    readonly tone: "status" | "error";
    readonly message: string;
    readonly serial: number;
  }
  | {
    readonly kind: "toast";
    readonly tone: "success" | "danger";
    readonly message: string;
    readonly serial: number;
  }
  | {
    readonly kind: "validation";
    readonly field: string;
    readonly tone: "status" | "error";
    readonly message: string;
  }
  | {
    readonly kind: "storage-failure";
    readonly message: string;
  }
  | {
    readonly kind: "recovery";
    readonly message: string;
  }
  | {
    readonly kind: "persistence";
    readonly state: "saving" | "saved" | "unavailable";
    readonly message: string;
  };

/** Current feedback channels. One event cannot overwrite another lifecycle. */
export interface BuilderFeedbackModel {
  readonly live: Extract<BuilderFeedback, { kind: "live" }> | null;
  readonly toast: Extract<BuilderFeedback, { kind: "toast" }> | null;
  readonly storageFailure:
    | Extract<BuilderFeedback, { kind: "storage-failure" }>
    | null;
  readonly recovery: Extract<BuilderFeedback, { kind: "recovery" }> | null;
  readonly persistence: Extract<BuilderFeedback, { kind: "persistence" }>;
}

/** Initial honest persistence posture before the first autosave result. */
export function initialBuilderFeedback(): BuilderFeedbackModel {
  return {
    live: null,
    toast: null,
    storageFailure: null,
    recovery: null,
    persistence: {
      kind: "persistence",
      state: "saving",
      message: "Saving locally…",
    },
  };
}

function isFieldOwnedError(message: string): boolean {
  return /^document(?:\.|\[)/.test(message) ||
    /^The selected value for document(?:\.|\[)/.test(message);
}

function isLiveOnly(message: string): boolean {
  return /^(?:Selected |Choose a component|Loading |Importing |Confirm whether)/
    .test(
      message,
    );
}

/** Whether one compatibility announcement also deserves transient chrome. */
export function shouldToastBuilderAnnouncement(
  message: string,
  tone: "status" | "error",
): boolean {
  return !(tone === "error" && isFieldOwnedError(message)) &&
    !isLiveOnly(message);
}

/**
 * Project the legacy string callback into lifecycles without retaining a
 * second copy of field-owned validation. This is the single compatibility
 * seam for tree/workspace announcements.
 */
export function announcementFeedback(
  model: BuilderFeedbackModel,
  message: string,
  tone: "status" | "error",
  serial: number,
): BuilderFeedbackModel {
  if (tone === "error" && isFieldOwnedError(message)) return model;
  const live: Extract<BuilderFeedback, { kind: "live" }> = {
    kind: "live",
    tone,
    message,
    serial,
  };
  return {
    ...model,
    live,
    toast: shouldToastBuilderAnnouncement(message, tone)
      ? {
        kind: "toast",
        tone: tone === "error" ? "danger" : "success",
        message,
        serial,
      }
      : isLiveOnly(message)
      ? model.toast
      : null,
  };
}

/** Durable and transient visual feedback in reading order. */
export function visibleBuilderFeedback(
  model: BuilderFeedbackModel,
): readonly BuilderFeedback[] {
  return [
    ...(model.recovery === null ? [] : [model.recovery]),
    ...(model.storageFailure === null ? [] : [model.storageFailure]),
    ...(model.toast === null ? [] : [model.toast]),
  ];
}
