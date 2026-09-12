/** Facts understood by discern's language-neutral producer progress protocol. */
export interface ProgressReport {
  units?: { kind: string; completed: number; total: number | null };
  results?: { passed?: number; failed?: number; skipped?: number };
  active?: readonly string[];
  elapsed_ms?: number;
  partial?: boolean;
  failure?: {
    name: string;
    message: string;
    file?: string;
    line?: number;
    reproduce?: string;
  };
}

/** Emit bounded advisory facts; full diagnostics remain in ordinary command output. */
export function progressLine(report: ProgressReport): string {
  const text = (value: string, limit: number) =>
    value.slice(0, limit) || "(unnamed)";
  const bounded: ProgressReport = {
    ...report,
    ...(report.units
      ? { units: { ...report.units, kind: text(report.units.kind, 64) } }
      : {}),
    ...(report.active
      ? { active: report.active.slice(0, 8).map((value) => text(value, 160)) }
      : {}),
    ...(report.failure
      ? {
        failure: {
          ...report.failure,
          name: text(report.failure.name, 256),
          message: text(report.failure.message, 1024),
          ...(report.failure.file
            ? { file: text(report.failure.file, 512) }
            : {}),
          ...(report.failure.reproduce
            ? { reproduce: report.failure.reproduce }
            : {}),
        },
      }
      : {}),
  };
  // A truncated command would reproduce a different run. Omit oversized
  // commands; the full invocation remains in the command transcript.
  if (
    bounded.failure?.reproduce &&
    new TextEncoder().encode(JSON.stringify(bounded.failure.reproduce)).length >
      2048
  ) {
    delete bounded.failure.reproduce;
  }
  // JSON escapes can expand a character to six bytes. Shrink text until even
  // control-heavy diagnostics fit the protocol's byte limit.
  let line = `DISCERN_PROGRESS ${JSON.stringify(bounded)}`;
  while (new TextEncoder().encode(line).length >= 16 * 1024) {
    if (bounded.failure) {
      bounded.failure.message = bounded.failure.message.slice(
        0,
        Math.max(1, bounded.failure.message.length >> 1),
      );
    }
    bounded.active =
      bounded.active?.slice(0, Math.floor(bounded.active.length / 2)) ?? [];
    line = `DISCERN_PROGRESS ${JSON.stringify(bounded)}`;
  }
  return line;
}

/** One command owns one reporter; imported build helpers are silent by default. */
export class Progress {
  #started = performance.now();
  #completed = 0;
  #active: string[] = [];
  constructor(
    readonly kind: string,
    readonly reproduce: string,
    readonly total: number | null = null,
    readonly write: (line: string) => void = console.error,
  ) {}

  report(facts: ProgressReport = {}): void {
    this.write(progressLine({
      units: { kind: this.kind, completed: this.#completed, total: this.total },
      active: this.#active,
      elapsed_ms: Math.max(0, Math.round(performance.now() - this.#started)),
      ...facts,
    }));
  }

  active(label: string): void {
    this.#active = [label];
    this.report();
  }

  advance(): void {
    this.#completed++;
    this.#active = [];
    this.report();
  }

  finish(): void {
    this.#active = [];
    this.report({
      units: {
        kind: this.kind,
        completed: this.#completed,
        total: this.total ?? this.#completed,
      },
    });
  }

  failure(name: string, error: unknown): void {
    this.report({
      failure: {
        name,
        message: error instanceof Error ? error.message : String(error),
        reproduce: this.reproduce,
      },
    });
  }

  async run<T>(label: string, work: () => Promise<T>): Promise<T> {
    this.active(label);
    try {
      const result = await work();
      this.advance();
      return result;
    } catch (error) {
      this.failure(label, error);
      throw error;
    }
  }
}

/** Keep the browser checks' shared failure array while reporting each appended failure. */
export function reportingFailures(progress?: Progress): string[] {
  const failures: string[] = [];
  if (progress) {
    Object.defineProperty(failures, "push", {
      value: (...items: string[]) => {
        for (const item of items) progress.failure("Browser conformance", item);
        return Array.prototype.push.apply(failures, items);
      },
    });
  }
  return failures;
}

/** Preserve the same execution path when an imported helper has no reporter. */
export function progressStep<T>(
  progress: Progress | undefined,
  label: string,
  work: () => Promise<T>,
): Promise<T> {
  return progress ? progress.run(label, work) : work();
}
