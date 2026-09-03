/** Browser-observed contract between one theme root, control, and persistence. */
export interface ThemeConsumerState {
  readonly mode: string | null;
  readonly selected: string | null;
  readonly controlPresent: boolean;
  readonly storageKey: string | null;
  readonly stored: string | null;
  readonly storageParameter: string | null;
}

/** Detect mismatches for both bare theme storage and parameterised records. */
export function themeConsumerStateFailures(
  state: ThemeConsumerState,
): readonly string[] {
  const failures: string[] = [];
  if (state.selected !== state.mode) {
    failures.push(
      `selected theme ${state.selected ?? "none"} disagrees with root ${
        state.mode ?? "none"
      }`,
    );
  }
  if (!state.controlPresent) failures.push("declared theme control is missing");
  if (state.storageKey !== null) {
    const storedMode = state.storageParameter === null || state.stored === null
      ? state.stored
      : new URLSearchParams(state.stored).get(state.storageParameter);
    const expected = state.storageParameter === null && state.mode === "system"
      ? null
      : state.mode;
    if (storedMode !== expected) {
      failures.push(
        `stored theme ${storedMode ?? "none"} disagrees with root ${
          state.mode ?? "none"
        }`,
      );
    }
  }
  return failures;
}
