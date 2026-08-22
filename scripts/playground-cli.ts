/**
 * Interactive CLI playground: one real-terminal command from which
 * maintainers inspect every registered CLI Component and exercise every
 * high-level interactive API. A development and review instrument for this
 * repository — not a published command or consumer API.
 *
 * @module
 */

import {
  assertInteractiveTerminal,
  DenoTerminalIO,
  InteractionCancelled,
  NonInteractiveTerminalError,
  type TerminalIO,
} from "../src/cli/interactive/mod.ts";
import { runHub, runTour } from "./playground/hub.ts";
import { createPlaygroundNavigator } from "./playground/navigation.ts";
import {
  journeyById,
  playgroundJourneys,
  runJourney,
} from "./playground/journeys.ts";
import { journeySections, type PlaygroundRuntime } from "./playground/types.ts";

/** One resolved playground invocation. */
export type PlaygroundSelection =
  | { readonly kind: "hub" }
  | { readonly kind: "list" }
  | { readonly kind: "tour" }
  | { readonly kind: "journey"; readonly id: string };

/** Command syntax for the playground entrypoint. */
export function playgroundUsage(): string {
  return `Usage: deno task playground:cli [--list | tour | <journey-id>]

  (no argument)   open the interactive hub (requires a real terminal)
  --list          print every journey ID and description; works without a TTY
  tour            run every journey in recommended order
  <journey-id>    run one journey directly, bypassing the hub menu`;
}

/** Journey inventory as stable, scriptable list output. */
export function renderJourneyList(): string {
  const lines: string[] = [playgroundUsage(), ""];
  const width = Math.max(
    4,
    ...playgroundJourneys.map((journey) => journey.id.length),
  );
  lines.push("Modes:");
  lines.push(`  ${"tour".padEnd(width)}  Guided tour visiting every journey.`);
  for (const section of journeySections) {
    lines.push("");
    lines.push(`${section}:`);
    for (const journey of playgroundJourneys) {
      if (journey.section !== section) continue;
      lines.push(`  ${journey.id.padEnd(width)}  ${journey.description}`);
    }
  }
  return lines.join("\n");
}

/** Resolve command-line arguments to one playground selection. */
export function resolvePlaygroundSelection(
  args: readonly string[],
): PlaygroundSelection {
  if (args.length > 1) {
    throw new TypeError(
      `The playground accepts one selector; received ${args.length}.\n${playgroundUsage()}`,
    );
  }
  const argument = args[0];
  if (argument === undefined || argument === "") return { kind: "hub" };
  if (argument === "--list" || argument === "list") return { kind: "list" };
  if (argument === "--help" || argument === "help") return { kind: "list" };
  if (argument === "tour") return { kind: "tour" };
  if (journeyById(argument) !== undefined) {
    return { kind: "journey", id: argument };
  }
  throw new TypeError(
    `Unknown playground selector ${
      JSON.stringify(argument)
    }.\n\n${renderJourneyList()}`,
  );
}

/** Build the default runtime around one terminal, with test overrides. */
export function createPlaygroundRuntime(
  io: TerminalIO,
  overrides: Partial<Omit<PlaygroundRuntime, "io">> = {},
): PlaygroundRuntime {
  return {
    io,
    navigator: overrides.navigator ?? createPlaygroundNavigator(io),
    print: overrides.print ?? ((text) => io.write(`${text}\n`)),
    delay: overrides.delay ??
      ((milliseconds) =>
        new Promise((resolve) => setTimeout(resolve, milliseconds))),
    ...(overrides.spinnerScheduler === undefined
      ? {}
      : { spinnerScheduler: overrides.spinnerScheduler }),
    degradedIo: overrides.degradedIo ??
      ((environment) => new DenoTerminalIO({ environment })),
  };
}

/**
 * Execute one resolved selection. Interactive selections refuse a non-TTY
 * terminal through the package's own guard before any terminal mutation.
 */
export async function runPlayground(
  selection: PlaygroundSelection,
  runtime: PlaygroundRuntime,
): Promise<void> {
  if (selection.kind === "list") {
    runtime.print(renderJourneyList());
    return;
  }
  assertInteractiveTerminal(runtime.io);
  if (selection.kind === "hub") {
    await runHub(runtime);
    return;
  }
  if (selection.kind === "tour") {
    await runTour(runtime);
    return;
  }
  const journey = journeyById(selection.id);
  if (journey === undefined) {
    throw new TypeError(
      `Unknown playground journey ${JSON.stringify(selection.id)}.`,
    );
  }
  await runJourney(journey, runtime);
}

async function writeLine(
  stream: { write(chunk: Uint8Array): Promise<number> },
  text: string,
): Promise<void> {
  await stream.write(new TextEncoder().encode(`${text}\n`));
}

if (import.meta.main) {
  let selection: PlaygroundSelection;
  try {
    selection = resolvePlaygroundSelection(Deno.args);
  } catch (error) {
    await writeLine(
      Deno.stderr,
      error instanceof Error ? error.message : String(error),
    );
    Deno.exit(1);
  }
  if (selection.kind === "list") {
    await writeLine(Deno.stdout, renderJourneyList());
    Deno.exit(0);
  }
  const runtime = createPlaygroundRuntime(new DenoTerminalIO());
  try {
    await runPlayground(selection, runtime);
  } catch (error) {
    if (error instanceof NonInteractiveTerminalError) {
      await writeLine(
        Deno.stderr,
        `The interactive playground needs a real terminal: ${error.message}\n` +
          "Use `deno task playground:cli --list` to inspect journeys without one.",
      );
      Deno.exit(1);
    }
    if (error instanceof InteractionCancelled) {
      await writeLine(Deno.stdout, "Playground closed.");
      Deno.exit(0);
    }
    throw error;
  }
}
