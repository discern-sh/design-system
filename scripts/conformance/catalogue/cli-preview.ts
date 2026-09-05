import type { Page } from "playwright-core";
import { catalogueComponentPath } from "../../../catalogue/routes.ts";
import { withViewport } from "../../viewport.ts";
import { CATALOGUE_NARROW_VIEWPORT, loadCataloguePage } from "./support.ts";
import { verifyInlineOverflowCueEdges } from "./overflow-cue.ts";

/** The shared CLI host keeps its scroll affordance inside narrow detail pages. */
export async function verifyCliPreview(
  page: Page,
  origin: string,
): Promise<void> {
  await withViewport(page, CATALOGUE_NARROW_VIEWPORT, async () => {
    const commandUrl = new URL(catalogueComponentPath("command"), origin);
    commandUrl.searchParams.set("surface", "cli");
    commandUrl.searchParams.set("example", "overflow");
    await loadCataloguePage(page, commandUrl.href);
    await verifyInlineOverflowCueEdges(
      page.locator(".discern-catalogue-cli-preview").first(),
      "CLI Component preview",
    );
  });
}
