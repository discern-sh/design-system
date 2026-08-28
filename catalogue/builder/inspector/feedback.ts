/** Distinct feedback lifecycles, even while legacy chrome renders them alike. */
export type BuilderFeedback =
  | {
    readonly kind: "announcement";
    readonly tone: "status" | "error";
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
    readonly kind: "persistence";
    readonly state: "saving" | "saved" | "unavailable";
    readonly message: string;
  };

/** Current feedback channels. One event cannot overwrite another lifecycle. */
export interface BuilderFeedbackModel {
  readonly announcement:
    | Extract<BuilderFeedback, { kind: "announcement" }>
    | null;
  readonly validation: Extract<BuilderFeedback, { kind: "validation" }> | null;
  readonly storageFailure:
    | Extract<BuilderFeedback, { kind: "storage-failure" }>
    | null;
  readonly persistence: Extract<BuilderFeedback, { kind: "persistence" }>;
}

/** Initial honest persistence posture before the first autosave result. */
export function initialBuilderFeedback(): BuilderFeedbackModel {
  return {
    announcement: null,
    validation: null,
    storageFailure: null,
    persistence: {
      kind: "persistence",
      state: "saving",
      message: "Saving composition.",
    },
  };
}

/** Legacy status projection in durable-before-transient reading order. */
export function visibleBuilderFeedback(
  model: BuilderFeedbackModel,
): readonly BuilderFeedback[] {
  return [
    ...(model.storageFailure === null ? [] : [model.storageFailure]),
    ...(model.validation === null ? [] : [model.validation]),
    ...(model.announcement === null ? [] : [model.announcement]),
  ];
}
