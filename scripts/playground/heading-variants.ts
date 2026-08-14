/** Settled public heading treatments for focused terminal review. */

import {
  renderTriangleSectionRule,
  type TriangleSectionRuleTreatment,
} from "../../src/cli/mod.ts";
import type { PlaygroundRuntime } from "./types.ts";

const variants: readonly {
  readonly treatment: TriangleSectionRuleTreatment;
  readonly label: string;
}[] = [
  { treatment: "embedded", label: "Strong embedded title — default" },
  { treatment: "underline", label: "Heading with strong underline" },
  { treatment: "sandwich", label: "Quiet sandwich" },
];

/** Print the three public section-boundary treatments at a reviewable width. */
export function runHeadingVariantsJourney(
  runtime: PlaygroundRuntime,
): Promise<void> {
  const capabilities = runtime.io.capabilities();
  const width = Math.min(capabilities.columns, 80);
  for (const { treatment, label } of variants) {
    runtime.print(`[${treatment}] ${label}`);
    runtime.print(renderTriangleSectionRule(
      "Deploying workspace changes",
      { width, treatment },
      { ...capabilities, columns: width },
    ));
  }
  return Promise.resolve();
}
