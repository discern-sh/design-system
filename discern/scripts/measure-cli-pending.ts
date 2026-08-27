import type { CliComponentRegistryEntry } from "../../src/cli/contracts.ts";
import { cliComponentRegistry } from "../../src/generated/cli-registry.ts";
import { componentRegistry } from "../../src/generated/component-registry.ts";

const cliRegistry = cliComponentRegistry as Readonly<
  Record<string, CliComponentRegistryEntry | undefined>
>;
const componentSlugs = new Set(componentRegistry.map(({ meta }) => meta.slug));
let pending = 0;

for (const slug of componentSlugs) {
  const entry = cliRegistry[slug];
  if (
    entry === undefined ||
    (entry.stance === "exempt" && entry.reason.trim() === "")
  ) {
    pending += 1;
  }
}
for (const slug of Object.keys(cliRegistry)) {
  if (!componentSlugs.has(slug)) pending += 1;
}

// Codegen rejects an absent or inconsistent stance before this generated
// projection is measured. The metric remains a React-free, trunk-held second
// line of defence because a feature branch cannot delete the Standard.
console.log(`DISCERN_METRIC cli_pending ${pending}`);
