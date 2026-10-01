/** A live application on a held-open fake terminal and a manual clock, for runtime tests. */
import {
  runTerminalApplication,
  type TerminalApplicationContext,
  type TerminalApplicationObservation,
  type TerminalApplicationRuntime,
  type TerminalApplicationView,
} from "../../src/cli/interactive/mod.ts";
import {
  FakeTerminalIO,
  type FakeTerminalIOOptions,
  ManualTerminalClock,
  settledTerminalFrame,
} from "../../src/cli/interactive/testing.ts";

/** Let the runtime's input and update loop catch up with queued events. */
export async function settle(): Promise<void> {
  for (let turn = 0; turn < 5; turn += 1) {
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
}

/** A running session and the instruments around it. */
export interface ApplicationSession {
  readonly io: FakeTerminalIO;
  readonly clock: ManualTerminalClock;
  readonly observations: TerminalApplicationObservation[];
  readonly context: () => TerminalApplicationContext<string>;
  /** The settled frame replayed from everything written so far. */
  readonly frame: () => string;
  /** Exit with `q` and wait for restoration. */
  readonly finish: () => Promise<void>;
}

/** Options for {@linkcode applicationSession}. */
export interface ApplicationSessionOptions extends FakeTerminalIOOptions {
  readonly runtime?: Partial<TerminalApplicationRuntime>;
  readonly onAction?: () => { kind: "foreground"; run: () => void };
  readonly clock?: ManualTerminalClock;
}

/** Start a session whose `q` key exits, and wait for its first paint. */
export async function applicationSession(
  view: TerminalApplicationView<string>,
  options: ApplicationSessionOptions = {},
): Promise<ApplicationSession> {
  const io = new FakeTerminalIO([], { holdOpen: true, ...options });
  const clock = options.clock ?? new ManualTerminalClock();
  const observations: TerminalApplicationObservation[] = [];
  let live: TerminalApplicationContext<string> | undefined;
  const running = runTerminalApplication({
    view,
    start: (context) => {
      live = context;
    },
    onKey: (key) =>
      key.kind === "text" && key.text === "q" ? { kind: "exit" } : undefined,
    ...(options.onAction === undefined ? {} : { onAction: options.onAction }),
  }, {
    io,
    clock,
    observe: (observation) => observations.push(observation),
    ...options.runtime,
  });
  await settle();
  return {
    io,
    clock,
    observations,
    context: () => {
      if (live === undefined) throw new Error("application did not start");
      return live;
    },
    frame: () => settledTerminalFrame(io.output(), io.size()),
    finish: async () => {
      io.enqueue("q");
      await running;
      io.close();
    },
  };
}
