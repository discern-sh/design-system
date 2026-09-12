import { Progress, type ProgressReport } from "./progress.ts";

/** Read Deno's top-level TAP results; nested test steps never inflate test counts. */
export class TapProgress {
  #completed = 0;
  #passed = 0;
  #failed = 0;
  #skipped = 0;
  #file: string | undefined;
  #failure: string | undefined;
  #total: number | null = null;
  #partial = false;
  constructor(readonly progress: Progress) {}

  line(line: string): void {
    if (line.startsWith("# ") && !line.startsWith("# Subtest:")) {
      this.#file = line.slice(2);
      this.report({ active: [this.#file] });
    }
    if (line.startsWith("# Subtest: ")) {
      this.report({ active: [line.slice(11)] });
    }
    const result = /^(not ok|ok) \d+ - (.*)$/.exec(line);
    if (result) {
      this.flushFailure();
      this.#completed++;
      const label = result[2]!;
      if (/ # SKIP(?:\s|$)/.test(label)) this.#skipped++;
      else if (result[1] === "not ok") {
        this.#failed++;
        this.#failure = label;
      } else this.#passed++;
      this.report();
    }
    if (this.#failure && line.startsWith("  {")) {
      try {
        const detail = JSON.parse(line.trim());
        if (detail && typeof detail.message === "string") {
          this.report({
            failure: {
              name: this.#failure,
              message: detail.message,
              ...(typeof detail.at?.file === "string"
                ? { file: detail.at.file }
                : this.#file
                ? { file: this.#file }
                : {}),
              ...(Number.isSafeInteger(detail.at?.line) && detail.at.line >= 0
                ? { line: detail.at.line }
                : {}),
              reproduce: this.progress.reproduce,
            },
          });
        }
      } catch (error) {
        if (!(error instanceof SyntaxError)) throw error;
      }
      this.#failure = undefined;
    }
    const plan = /^1\.\.(\d+)(?:\s|$)/.exec(line);
    if (plan) {
      this.flushFailure();
      this.#total = Number(plan[1]);
      this.report();
    }
  }

  flushFailure(): void {
    if (this.#failure) {
      this.report({
        failure: {
          name: this.#failure,
          message: "Test failed; see the TAP transcript.",
          reproduce: this.progress.reproduce,
        },
      });
      this.#failure = undefined;
    }
  }

  partial(): void {
    this.#partial = true;
  }

  report(extra: ProgressReport = {}): void {
    this.progress.report({
      units: { kind: "tests", completed: this.#completed, total: this.#total },
      results: {
        passed: this.#passed,
        failed: this.#failed,
        skipped: this.#skipped,
      },
      active: [],
      ...(this.#partial ? { partial: true } : {}),
      ...extra,
    });
  }

  finish(): void {
    this.flushFailure();
    if (this.#total !== this.#completed) this.partial();
    this.report();
  }
}

/** Forward the runner's complete TAP output and preserve its exit status. */
export async function runUnitTests(
  args: readonly string[] = Deno.args,
): Promise<number> {
  const quote = (value: string) => "'" + value.replaceAll("'", "'\"'\"'") + "'";
  const reproduce = ["deno task test:unit", ...args.map(quote)].join(" ");
  const progress = new Progress("tests", reproduce);
  const tap = new TapProgress(progress);
  progress.active("Discovering unit tests");
  const child = new Deno.Command(Deno.execPath(), {
    args: [
      "test",
      "--config",
      "deno.json",
      "--allow-read",
      "--allow-write",
      "--allow-env",
      "--allow-run",
      "--allow-sys",
      ...args,
      "--reporter=tap",
      "tests",
    ],
    stdout: "piped",
    stderr: "inherit",
  }).spawn();
  let exited = false;
  const completion = child.status.then((status) => {
    exited = true;
    return status;
  });
  const signals = ["SIGINT", "SIGTERM"] as const;
  const stop = (signal: "SIGINT" | "SIGTERM") => {
    try {
      if (!exited) child.kill(signal);
    } catch (error) {
      if (!(error instanceof Deno.errors.NotFound)) throw error;
    }
  };
  const forwards = signals.map((signal) => {
    const forward = () => stop(signal);
    Deno.addSignalListener(signal, forward);
    return forward;
  });
  let pending = "";
  let dropping = false;
  try {
    const decoder = new TextDecoder();
    for await (const chunk of child.stdout) {
      let offset = 0;
      while (offset < chunk.length) {
        offset += await Deno.stdout.write(chunk.subarray(offset));
      }
      pending += decoder.decode(chunk, { stream: true });
      const lines = pending.split("\n");
      pending = lines.pop()!;
      for (const line of lines) {
        if (dropping || line.length > 65536) tap.partial();
        else tap.line(line.replace(/\r$/, ""));
        dropping = false;
      }
      if (pending.length > 65536) {
        pending = "";
        dropping = true;
        tap.partial();
      }
    }
    pending += decoder.decode();
    if (pending && !dropping) tap.line(pending);
    const status = await completion;
    tap.finish();
    if (!status.success) {
      tap.report({
        failure: {
          name: "Unit test command",
          message:
            `Deno exited with status ${status.code}; see the TAP transcript and stderr.`,
          reproduce: progress.reproduce,
        },
      });
    }
    return status.code;
  } finally {
    signals.forEach((signal, index) =>
      Deno.removeSignalListener(signal, forwards[index]!)
    );
    stop("SIGTERM");
    await completion;
  }
}

if (import.meta.main) Deno.exit(await runUnitTests());
