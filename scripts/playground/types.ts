/**
 * Contracts shared by the CLI playground's journeys, hub, and entrypoint.
 *
 * @module
 */

import type {
  SpinnerScheduler,
  TerminalIO,
} from "../../src/cli/interactive/mod.ts";
import type { PlaygroundNavigator } from "./navigation.ts";

/** Hub and list sections in recommended review order. */
export const journeySections = [
  "Interactive APIs",
  "Static catalogue",
  "Stress & lifecycle",
] as const;

/** Presentation section grouping journeys in the hub and list output. */
export type JourneySection = (typeof journeySections)[number];

/** Injectable effects shared by every playground journey. */
export interface PlaygroundRuntime {
  /** Terminal every journey interactions and prints through. */
  readonly io: TerminalIO;
  /** Screen-managed, position-remembering maintainer navigation. */
  readonly navigator: PlaygroundNavigator;
  /** Write one line of playground narration to the terminal. */
  readonly print: (text: string) => void;
  /** Await a journey pause; deterministic tests inject an instant resolver. */
  readonly delay: (milliseconds: number) => Promise<void>;
  /** Optional deterministic spinner scheduler for tests. */
  readonly spinnerScheduler?: SpinnerScheduler;
  /**
   * Build a terminal whose capability detection uses the given environment
   * facts while input and output stay on the real handles.
   */
  readonly degradedIo: (
    environment: Readonly<Record<string, string | undefined>>,
  ) => TerminalIO;
}

/** One named, directly addressable manual-review journey. */
export interface PlaygroundJourney {
  /** Stable selector usable as `deno task playground:cli <id>`. */
  readonly id: string;
  readonly title: string;
  readonly section: JourneySection;
  readonly description: string;
  readonly run: (runtime: PlaygroundRuntime) => Promise<void>;
}
