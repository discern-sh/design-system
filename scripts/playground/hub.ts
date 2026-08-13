/**
 * The interactive hub and the guided tour. The hub is itself a package
 * Select — deliberately, so the menu component stays under review — and is
 * never the only route in: every journey remains directly addressable by
 * its stable ID from the command line.
 *
 * @module
 */

import {
  PromptCancelled,
  type PromptChoiceEntry,
  promptConfirm,
  promptSelect,
} from "../../src/cli/interactive/mod.ts";
import { renderTerminalFacts } from "./banner.ts";
import { journeyById, playgroundJourneys, runJourney } from "./journeys.ts";
import {
  journeySections,
  type PlaygroundJourney,
  type PlaygroundRuntime,
} from "./types.ts";

type HubTarget = string | "tour" | "quit";

/** Grouped hub menu: the tour, every journey by section, then quit. */
export function hubChoices(): readonly PromptChoiceEntry<HubTarget>[] {
  const entries: PromptChoiceEntry<HubTarget>[] = [
    {
      id: "tour",
      label: "Guided tour (every journey in order)",
      value: "tour",
    },
  ];
  for (const section of journeySections) {
    entries.push({
      kind: "group-heading",
      id: `section-${section.toLocaleLowerCase().replaceAll(/[^a-z]+/gu, "-")}`,
      label: section,
    });
    for (const journey of playgroundJourneys) {
      if (journey.section !== section) continue;
      entries.push({
        id: `journey-${journey.id}`,
        label: `${journey.title} (${journey.id})`,
        value: journey.id,
      });
    }
  }
  entries.push({ id: "quit", label: "Quit the playground", value: "quit" });
  return entries;
}

/** Visit every journey in inventory order, confirming after cancellations. */
export async function runTour(runtime: PlaygroundRuntime): Promise<void> {
  const { print } = runtime;
  print(
    `Guided tour: ${playgroundJourneys.length} journeys in recommended order.`,
  );
  print(
    "Ctrl+C inside a journey skips it; you will be asked whether to continue.",
  );
  for (const [index, journey] of playgroundJourneys.entries()) {
    print("");
    print(`Tour stop ${index + 1} of ${playgroundJourneys.length}`);
    const outcome = await runJourney(journey, runtime);
    if (outcome === "cancelled" && index + 1 < playgroundJourneys.length) {
      const proceed = await promptConfirm({
        label: "Continue the tour",
        initialValue: true,
      }, { io: runtime.io });
      if (proceed !== true) {
        print("Tour ended early.");
        return;
      }
    }
  }
  print("Tour complete: every journey visited.");
}

async function runTourFromHub(runtime: PlaygroundRuntime): Promise<void> {
  try {
    await runTour(runtime);
  } catch (error) {
    if (!(error instanceof PromptCancelled)) throw error;
    runtime.print("Tour cancelled — back to the hub.");
  }
}

/** Loop the hub menu until the maintainer quits or cancels. */
export async function runHub(runtime: PlaygroundRuntime): Promise<void> {
  const { io, print } = runtime;
  print("discern CLI playground");
  print(renderTerminalFacts(io));
  print(
    "Every journey is also directly addressable: deno task playground:cli <journey-id>",
  );
  while (true) {
    let target: HubTarget | undefined;
    try {
      target = await promptSelect({
        label: "Playground hub",
        hint:
          "Ctrl+C quits. If this menu itself misbehaves, use direct journey IDs.",
        choices: hubChoices(),
        visibleCount: 12,
      }, { io });
    } catch (error) {
      if (!(error instanceof PromptCancelled)) throw error;
      print("Playground closed.");
      return;
    }
    if (target === "quit" || target === undefined) {
      print("Playground closed.");
      return;
    }
    if (target === "tour") {
      await runTourFromHub(runtime);
      continue;
    }
    const journey: PlaygroundJourney | undefined = journeyById(target);
    if (journey === undefined) {
      print(`Unknown journey ${JSON.stringify(target)}.`);
      continue;
    }
    await runJourney(journey, runtime);
  }
}
