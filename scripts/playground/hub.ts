/**
 * The interactive hub and the guided tour. The hub is itself a package
 * Select — deliberately, so the menu component stays under review — and is
 * never the only route in: every journey remains directly addressable by
 * its stable ID from the command line.
 *
 * @module
 */

import {
  InteractionCancelled,
  type InteractionEntry,
  requestConfirmation,
} from "../../src/cli/interactive/mod.ts";
import { renderTerminalFacts } from "./banner.ts";
import { journeyById, playgroundJourneys, runJourney } from "./journeys.ts";
import {
  type JourneySection,
  journeySections,
  type PlaygroundJourney,
  type PlaygroundRuntime,
} from "./types.ts";

type HubTarget = JourneySection | "search" | "tour" | "quit";
type SectionTarget = string | "back";
type JourneyReviewAction = "repeat" | "next" | "back" | "quit";

function journeysInSection(
  section: JourneySection,
): readonly PlaygroundJourney[] {
  return playgroundJourneys.filter((journey) => journey.section === section);
}

/** Compact hub: review sections first, then global search and tour modes. */
export function hubChoices(): readonly InteractionEntry<HubTarget>[] {
  return [
    ...journeySections.map((section) => ({
      id: `section-${section.toLocaleLowerCase().replaceAll(/[^a-z]+/gu, "-")}`,
      label: `${section} (${journeysInSection(section).length})`,
      value: section as HubTarget,
    })),
    {
      id: "search",
      label: "Search every journey",
      value: "search" as const,
    },
    {
      id: "tour",
      label: `Guided tour (${playgroundJourneys.length} journeys)`,
      value: "tour" as const,
    },
    { id: "quit", label: "Quit the playground", value: "quit" as const },
  ];
}

/** Named journey choices within one review section. */
export function sectionChoices(
  section: JourneySection,
): readonly InteractionEntry<SectionTarget>[] {
  return [
    ...journeysInSection(section).map((journey) => ({
      id: `journey-${journey.id}`,
      label: `${journey.title} (${journey.id})`,
      value: journey.id as SectionTarget,
    })),
    { id: "back", label: "Back to review sections", value: "back" },
  ];
}

function searchChoices(): readonly InteractionEntry<string>[] {
  return playgroundJourneys.map((journey) => ({
    id: `journey-${journey.id}`,
    label: journey.title,
    description: `${journey.section} · ${journey.id}`,
    value: journey.id,
  }));
}

function nextJourney(
  journey: PlaygroundJourney,
): PlaygroundJourney | undefined {
  const section = journeysInSection(journey.section);
  const index = section.findIndex(({ id }) => id === journey.id);
  return index < 0 ? undefined : section[index + 1];
}

async function reviewJourney(
  initial: PlaygroundJourney,
  runtime: PlaygroundRuntime,
): Promise<"back" | "quit"> {
  let journey = initial;
  while (true) {
    await runJourney(journey, runtime);
    const following = nextJourney(journey);
    const choices: InteractionEntry<JourneyReviewAction>[] = [
      { id: "repeat", label: "Repeat this journey", value: "repeat" },
      ...(following === undefined ? [] : [{
        id: "next",
        label: `Next in ${journey.section} (${following.title})`,
        value: "next" as const,
      }]),
      { id: "back", label: "Back to journeys", value: "back" },
      { id: "quit", label: "Quit the playground", value: "quit" },
    ];
    let action: JourneyReviewAction | undefined;
    try {
      action = await runtime.navigator.chooseInline(
        `journey-review-${journey.id}`,
        {
          label: `Review ${journey.title}`,
          hint: "The completed result remains above until you continue.",
          choices,
          initialId: "back",
        },
      );
    } catch (error) {
      if (!(error instanceof InteractionCancelled)) throw error;
      return "back";
    }
    if (action === "repeat") continue;
    if (action === "next" && following !== undefined) {
      journey = following;
      continue;
    }
    return action === "quit" ? "quit" : "back";
  }
}

async function chooseJourneyInSection(
  section: JourneySection,
  runtime: PlaygroundRuntime,
): Promise<PlaygroundJourney | undefined> {
  const target = await runtime.navigator.choose(`section-${section}`, {
    label: section,
    hint: "Enter opens; Esc returns to the hub.",
    choices: sectionChoices(section),
    visibleCount: 14,
  });
  return target === undefined || target === "back"
    ? undefined
    : journeyById(target);
}

async function searchForJourney(
  runtime: PlaygroundRuntime,
): Promise<PlaygroundJourney | undefined> {
  const first = playgroundJourneys[0];
  const target = await runtime.navigator.search("journey-search", {
    label: "Search playground journeys",
    placeholder: "Type a title, section, or journey ID",
    hint: "Type to filter; Enter opens; Esc returns to the hub.",
    choices: searchChoices(),
    visibleCount: 14,
    ...(first === undefined ? {} : { initialId: `journey-${first.id}` }),
  });
  return target === undefined ? undefined : journeyById(target);
}

async function reviewSection(
  section: JourneySection,
  runtime: PlaygroundRuntime,
): Promise<"back" | "quit"> {
  while (true) {
    let journey: PlaygroundJourney | undefined;
    try {
      journey = await chooseJourneyInSection(section, runtime);
    } catch (error) {
      if (!(error instanceof InteractionCancelled)) throw error;
      return "back";
    }
    if (journey === undefined) return "back";
    if (await reviewJourney(journey, runtime) === "quit") return "quit";
  }
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
      const proceed = await requestConfirmation({
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
    if (!(error instanceof InteractionCancelled)) throw error;
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
      target = await runtime.navigator.choose("hub", {
        label: "Playground hub",
        hint: "Choose a section, search all journeys, or start the tour.",
        choices: hubChoices(),
        visibleCount: 8,
      });
    } catch (error) {
      if (!(error instanceof InteractionCancelled)) throw error;
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
    if (target !== "search") {
      if (await reviewSection(target, runtime) === "quit") {
        print("Playground closed.");
        return;
      }
      continue;
    }
    let journey: PlaygroundJourney | undefined;
    try {
      journey = await searchForJourney(runtime);
    } catch (error) {
      if (!(error instanceof InteractionCancelled)) throw error;
      continue;
    }
    if (journey === undefined) continue;
    if (await reviewJourney(journey, runtime) === "quit") {
      print("Playground closed.");
      return;
    }
  }
}
