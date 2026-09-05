import type { Page } from "playwright-core";
import {
  verifyComponentDiscoveryJourneys,
  verifyComponentDiscoveryMetadata,
} from "./component-discovery.ts";
import {
  verifyComponentDetailJourneys,
  verifyComponentDetailMetadata,
  verifyStateFragmentRestoration,
} from "./component-detail.ts";

/** Compose the two Components route owners without mixing their assertions. */
export async function verifyComponentsCatalogue(
  page: Page,
  origin: string,
  expectedComponents: readonly string[],
  failures: string[],
): Promise<{ readonly roles: number; readonly scans: number }> {
  for (
    const [label, run] of [
      ["Component discovery", verifyComponentDiscoveryJourneys],
      ["Component detail", verifyComponentDetailJourneys],
      ["State fragment restoration", verifyStateFragmentRestoration],
    ] as const
  ) {
    try {
      await run(page, origin, expectedComponents);
    } catch (error) {
      failures.push(
        `${label}: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }
  const discovery = await verifyComponentDiscoveryMetadata(page, origin);
  const detail = await verifyComponentDetailMetadata(
    page,
    origin,
    expectedComponents,
  );
  return {
    roles: discovery.roles + detail.roles,
    scans: discovery.scans + detail.scans,
  };
}
