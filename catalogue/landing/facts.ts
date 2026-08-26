/**
 * Build-time facts for the design system landing page.
 *
 * The package manifest owns the browser inventory and the generated CLI
 * registry owns terminal stance. Keeping the join here gives the landing page
 * one derived source for both its headline counts and coverage visualisation.
 *
 * @module
 */
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { packageManifest } from "../../src/manifest.ts";
import type { ComponentGroup } from "../../src/types/component-meta.ts";

/** Browser and terminal Component counts for one canonical group. */
export interface LandingGroupCoverage {
  readonly group: ComponentGroup;
  readonly browserComponents: number;
  readonly terminalComponents: number;
}

/** Complete-system facts presented by the landing page. */
export interface LandingSystemFacts {
  readonly components: number;
  readonly groups: number;
  readonly tokens: number;
  readonly coverage: readonly LandingGroupCoverage[];
}

interface CliStanceFact {
  readonly stance: "rendered" | "exempt";
}

const cliStances: Readonly<Record<string, CliStanceFact>> =
  cliComponentRegistry;

function terminalComponentCount(componentIds: readonly string[]): number {
  return componentIds.filter((id) => {
    const component = cliStances[id];
    if (component === undefined) {
      throw new TypeError(`Landing coverage has no CLI stance for ${id}`);
    }
    return component.stance === "rendered";
  }).length;
}

/** Registry-derived system inventory used by every landing-page build. */
export const landingSystemFacts: LandingSystemFacts = Object.freeze({
  components: packageManifest.components.length,
  groups: packageManifest.groups.length,
  tokens: packageManifest.publicTokenNames.length,
  coverage: Object.freeze(packageManifest.groups.map((group) =>
    Object.freeze({
      group: group.name,
      browserComponents: group.components.length,
      terminalComponents: terminalComponentCount(group.components),
    })
  )),
});
