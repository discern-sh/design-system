/** A live application on a held-open fake terminal and a manual clock, for runtime tests. */
import {
  runTerminalApplication,
  type TerminalApplicationCommand,
  type TerminalApplicationContext,
  type TerminalApplicationObservation,
  type TerminalApplicationOptions,
  type TerminalApplicationRuntime,
  type TerminalApplicationState,
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
  readonly finish: () => Promise<TerminalApplicationState>;
}

/** Options for {@linkcode applicationSession}. */
export interface ApplicationSessionOptions extends FakeTerminalIOOptions {
  readonly runtime?: Partial<TerminalApplicationRuntime>;
  /** Commands for actions other than the session's own `quit`. */
  readonly onAction?: (action: string) => TerminalApplicationCommand | void;
  readonly clock?: ManualTerminalClock;
  /** Further callbacks and bindings, merged over the session's own. */
  readonly options?: Partial<TerminalApplicationOptions<string>>;
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
    ...options.options,
    keymap: [{ key: "q", action: "quit" }, ...(options.options?.keymap ?? [])],
    start: (context) => {
      live = context;
      return options.options?.start?.(context);
    },
    onAction: (action, context, source) =>
      action === "quit"
        ? { kind: "exit" }
        : options.options?.onAction?.(action, context, source) ??
          options.onAction?.(action),
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
      const state = await running;
      io.close();
      return state;
    },
  };
}
