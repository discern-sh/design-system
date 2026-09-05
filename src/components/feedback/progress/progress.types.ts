/** Inputs shared by browser and terminal task progress. */
export interface ProgressValue {
  /** Completed work; missing or non-finite means indeterminate. */
  readonly value?: number;
  /** Positive finite total, defaulting to 100 for invalid or absent input. */
  readonly max?: number;
}

/** Normalized task state shared by both presentation surfaces. */
export interface ResolvedProgress {
  readonly value: number | undefined;
  readonly max: number;
  readonly fraction: number | undefined;
  readonly reading: string;
}

/** Clamp finite completed work and preserve unknown work as waiting. */
export function resolveProgress(
  { value, max = 100 }: ProgressValue,
): ResolvedProgress {
  const total = Number.isFinite(max) && max > 0 ? max : 100;
  const completed = value !== undefined && Number.isFinite(value)
    ? Math.min(total, Math.max(0, value))
    : undefined;
  return {
    value: completed,
    max: total,
    fraction: completed === undefined ? undefined : completed / total,
    reading: completed === undefined
      ? "Waiting"
      : `${completed} / ${total}${completed === total ? " · Complete" : ""}`,
  };
}
